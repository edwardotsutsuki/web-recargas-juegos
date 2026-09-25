-- Synthetic fixtures only. Refuse to execute outside the disposable test DB.
DO $$ BEGIN
  IF current_database() NOT LIKE 'recargas_security_test_%' THEN
    RAISE EXCEPTION 'This test must only run in an isolated local test database';
  END IF;
END $$;
BEGIN;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
INSERT INTO auth.users(id,email) VALUES
 ('11111111-1111-4111-8111-111111111111','client@example.invalid'),
 ('22222222-2222-4222-8222-222222222222','other@example.invalid'),
 ('33333333-3333-4333-8333-333333333333','admin@example.invalid');
UPDATE public.profiles SET role='admin' WHERE id='33333333-3333-4333-8333-333333333333';
UPDATE public.profiles SET two_factor_secret='TEST-ONLY';
INSERT INTO public.deposit_requests(id,user_id,bank_name,amount_cents,reference_number,voucher_url) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','TEST',1200,'test-1','https://example.invalid/voucher'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','TEST',300,'test-2','https://example.invalid/voucher');

DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid, p.oid::regprocedure::text AS name FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN
      ('credit_wallet','reserve_purchase','settle_purchase','claim_purchase_job',
       'create_wallet_if_not_exists','approve_deposit_request','reject_deposit_request')
  LOOP
    IF has_function_privilege('anon',f.oid,'EXECUTE') OR has_function_privilege('authenticated',f.oid,'EXECUTE')
      OR NOT has_function_privilege('service_role',f.oid,'EXECUTE') THEN
      RAISE EXCEPTION 'Wrong RPC permissions: %', f.name;
    END IF;
  END LOOP;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
DO $$ DECLARE n integer; BEGIN
  SELECT count(id) INTO n FROM public.profiles;
  IF n <> 1 THEN RAISE EXCEPTION 'Other profiles exposed'; END IF;
  UPDATE public.profiles SET full_name='Updated name' WHERE id=auth.uid();
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Own profile update failed'; END IF;
  UPDATE public.profiles SET full_name='Forbidden' WHERE id='22222222-2222-4222-8222-222222222222';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'Other profile update allowed'; END IF;
  BEGIN
    UPDATE public.profiles SET role='admin' WHERE id=auth.uid();
    RAISE EXCEPTION 'Role escalation allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM two_factor_secret FROM public.profiles;
    RAISE EXCEPTION '2FA secrets exposed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.deposit_requests SET status='approved' WHERE user_id=auth.uid();
    RAISE EXCEPTION 'Client can approve deposits';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.deposit_requests WHERE user_id=auth.uid();
    RAISE EXCEPTION 'Client can delete deposits';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.credit_wallet(auth.uid(),100::bigint);
    RAISE EXCEPTION 'Client can credit money';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM public.approve_deposit_request('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','33333333-3333-4333-8333-333333333333');
    RAISE EXCEPTION 'Anonymous deposit approval allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ DECLARE r record; n bigint; BEGIN
  BEGIN
    PERFORM public.approve_deposit_request('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',NULL,NULL);
    RAISE EXCEPTION 'Non-admin actor accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  SELECT * INTO r FROM public.approve_deposit_request(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','33333333-3333-4333-8333-333333333333',
    'https://example.invalid/compressed','test-hash');
  IF r.new_balance_cents <> 1200 THEN RAISE EXCEPTION 'Wrong credited balance'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.deposit_requests WHERE id=r.request_id
    AND status='approved' AND voucher_hash='test-hash'
    AND voucher_compressed_url='https://example.invalid/compressed') THEN
    RAISE EXCEPTION 'Approval metadata missing';
  END IF;
  BEGIN
    PERFORM public.approve_deposit_request('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','33333333-3333-4333-8333-333333333333',NULL,NULL);
    RAISE EXCEPTION 'Double approval allowed';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  SELECT * INTO r FROM public.approve_deposit_request('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','33333333-3333-4333-8333-333333333333');
  IF r.new_balance_cents <> 1500 THEN RAISE EXCEPTION 'Legacy approval wrapper failed'; END IF;
  SELECT count(*) INTO n FROM public.transactions WHERE user_id='11111111-1111-4111-8111-111111111111';
  IF n <> 2 THEN RAISE EXCEPTION 'Duplicate or missing transaction'; END IF;
  INSERT INTO public.admin_audit_logs(actor_id,admin_id,action,target_entity,target_id)
    VALUES('33333333-3333-4333-8333-333333333333','33333333-3333-4333-8333-333333333333','approve_deposit','deposit_requests',r.request_id::text);
END $$;
RESET ROLE;
DO $$ BEGIN
  IF (SELECT count(*) FROM pg_publication_tables WHERE pubname='supabase_realtime'
    AND schemaname='public' AND tablename IN ('wallets','orders')) <> 2 THEN
    RAISE EXCEPTION 'Realtime tables missing';
  END IF;
END $$;
ROLLBACK;
