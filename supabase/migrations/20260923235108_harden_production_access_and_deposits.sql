-- Apply only after publishing the frontend's explicit profile column selection.
-- No business rows are deleted or reset. Run in a single transaction.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Cover every overload, including legacy functions still present online.
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'credit_wallet', 'reserve_purchase', 'settle_purchase',
      'claim_purchase_job', 'create_wallet_if_not_exists',
      'approve_deposit_request', 'reject_deposit_request',
      'handle_new_user', 'generate_referral_code', 'trg_assign_referral_code'
    )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.signature);
  END LOOP;
END $$;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.generate_referral_code() SET search_path = '';
ALTER FUNCTION public.trg_assign_referral_code() SET search_path = '';

-- This read-only helper deliberately remains callable for RLS predicates.
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- Remove both table grants and any column grants before allowing safe columns.
REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
DO $$
DECLARE columns_sql text;
BEGIN
  SELECT string_agg(quote_ident(attname), ', ') INTO columns_sql
  FROM pg_attribute WHERE attrelid = 'public.profiles'::regclass
    AND attnum > 0 AND NOT attisdropped;
  EXECUTE format('REVOKE SELECT (%1$s), INSERT (%1$s), UPDATE (%1$s), REFERENCES (%1$s) ON public.profiles FROM PUBLIC, anon, authenticated', columns_sql);
END $$;
GRANT SELECT (id, role, full_name, phone, referral_code, two_factor_enabled, created_at)
  ON public.profiles TO authenticated;
GRANT UPDATE (full_name, phone) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Replace overlapping policies on private business tables with a single read
-- policy. Their writes already pass through authenticated backend endpoints.
DO $$
DECLARE p record; table_name text;
BEGIN
  FOR p IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN
      ('profiles', 'wallets', 'orders', 'transactions', 'deposit_requests', 'support_tickets', 'admin_audit_logs')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['wallets','orders','transactions','deposit_requests','support_tickets']
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', table_name);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))', table_name || '_read', table_name);
  END LOOP;
END $$;
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT public.is_admin()));
CREATE POLICY profiles_edit_own ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));
REVOKE ALL ON public.admin_audit_logs, public.purchase_jobs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_audit_logs TO authenticated;
GRANT ALL ON public.admin_audit_logs, public.purchase_jobs TO service_role;
CREATE POLICY admin_audit_logs_read ON public.admin_audit_logs FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

-- Match the four named arguments sent by the deployed backend. Keep the old
-- two-argument signature as a service-only compatibility wrapper.
CREATE OR REPLACE FUNCTION public.approve_deposit_request(
  p_request_id uuid, p_admin_id uuid,
  p_compressed_voucher_url text, p_voucher_hash text
) RETURNS TABLE(request_id uuid, user_id uuid, amount_cents bigint, new_balance_cents bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_req public.deposit_requests; v_credit jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Only an administrator can approve deposits' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_req FROM public.deposit_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deposit request not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Deposit already processed' USING ERRCODE = '22023';
  END IF;
  v_credit := public.credit_wallet(
    p_user_id => v_req.user_id, p_amount_minor => v_req.amount_cents,
    p_currency => v_req.currency, p_idempotency_key => 'deposit:' || v_req.id::text,
    p_reason => 'Depósito aprobado: ' || v_req.bank_name || ' Ref: ' || v_req.reference_number,
    p_actor_id => p_admin_id, p_source => 'deposit_voucher',
    p_external_reference => v_req.reference_number
  );
  UPDATE public.deposit_requests SET
    status = 'approved', approved_by = p_admin_id, approved_at = now(), updated_at = now(),
    voucher_compressed_url = COALESCE(p_compressed_voucher_url, voucher_compressed_url),
    voucher_hash = COALESCE(p_voucher_hash, voucher_hash)
  WHERE id = v_req.id;
  RETURN QUERY SELECT v_req.id, v_req.user_id, v_req.amount_cents,
    (v_credit->>'new_balance_minor')::bigint;
END $$;

CREATE OR REPLACE FUNCTION public.approve_deposit_request(p_request_id uuid, p_admin_id uuid)
RETURNS TABLE(request_id uuid, user_id uuid, amount_cents bigint, new_balance_cents bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT * FROM public.approve_deposit_request(p_request_id, p_admin_id, NULL::text, NULL::text);
$$;
REVOKE EXECUTE ON FUNCTION public.approve_deposit_request(uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_deposit_request(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_deposit_request(uuid, uuid, text, text),
  public.approve_deposit_request(uuid, uuid) TO service_role;

-- Realtime only publishes the two tables already subscribed to by the app.
DO $$
DECLARE table_name text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  FOREACH table_name IN ARRAY ARRAY['wallets','orders'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = table_name) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
    END IF;
  END LOOP;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;
