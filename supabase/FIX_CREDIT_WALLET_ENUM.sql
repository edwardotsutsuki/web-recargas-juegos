-- ============================================================
-- FIX: "invalid input value for enum public.transaction_kind: deposit"
-- ============================================================
-- EJECUTAR EN: Supabase SQL Editor (una sola vez)
-- NOTA: Ejecutar las 2 secciones POR SEPARADO si da error.
-- ============================================================

-- PASO 1: Agregar 'deposit' al enum (EJECUTAR SOLO, NO DENTRO DE TRANSACTION)
ALTER TYPE public.transaction_kind ADD VALUE IF NOT EXISTS 'deposit';


-- PASO 2: Reemplazar credit_wallet (EJECUTAR DESPUÉS DEL PASO 1)
CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id uuid,
  p_amount_minor bigint,
  p_currency text DEFAULT 'USD',
  p_idempotency_key text DEFAULT NULL,
  p_reason text DEFAULT 'Acreditación manual',
  p_actor_id uuid DEFAULT NULL,
  p_source text DEFAULT 'manual',
  p_external_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_wallet public.wallets;
  v_existing_tx public.transactions;
  v_new_balance bigint;
  v_key text;
BEGIN
  IF p_amount_minor <= 0 THEN
    RAISE EXCEPTION 'El monto a acreditar debe ser mayor a 0' USING errcode = '22003';
  END IF;

  v_key := COALESCE(p_idempotency_key, gen_random_uuid()::text);

  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE user_id = p_user_id AND currency = p_currency
  FOR UPDATE;

  IF v_wallet.id IS NULL THEN
    INSERT INTO public.wallets(user_id, currency, balance_minor, held_minor)
    VALUES (p_user_id, p_currency, 0, 0)
    RETURNING * INTO v_wallet;
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing_tx
    FROM public.transactions
    WHERE wallet_id = v_wallet.id AND idempotency_key = p_idempotency_key;

    IF v_existing_tx.id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'idempotent_replay', true,
        'transaction_id', v_existing_tx.id,
        'wallet_id', v_wallet.id,
        'new_balance_minor', v_wallet.balance_minor,
        'available_minor', v_wallet.available_minor
      );
    END IF;
  END IF;

  v_new_balance := v_wallet.balance_minor + p_amount_minor;

  INSERT INTO public.transactions(
    wallet_id, user_id, currency, kind, amount_minor,
    balance_delta_minor, held_delta_minor,
    balance_before_minor, balance_after_minor,
    held_before_minor, held_after_minor,
    idempotency_key, actor_id, source, external_reference, reason
  ) VALUES (
    v_wallet.id, p_user_id, p_currency, 'deposit', p_amount_minor,
    p_amount_minor, 0,
    v_wallet.balance_minor, v_new_balance,
    v_wallet.held_minor, v_wallet.held_minor,
    v_key, p_actor_id, p_source, p_external_reference, p_reason
  );

  UPDATE public.wallets
  SET balance_minor = v_new_balance,
      updated_at = now()
  WHERE id = v_wallet.id;

  RETURN jsonb_build_object(
    'success', true,
    'idempotent_replay', false,
    'wallet_id', v_wallet.id,
    'credited_minor', p_amount_minor,
    'new_balance_minor', v_new_balance,
    'available_minor', v_new_balance - v_wallet.held_minor
  );
END;
$$;

-- Asegurar permisos
REVOKE ALL ON FUNCTION public.credit_wallet(uuid, bigint, text, text, text, uuid, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_wallet(uuid, bigint, text, text, text, uuid, text, text) TO service_role;

-- Verificar:
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'public.transaction_kind'::regtype ORDER BY enumsortorder;
