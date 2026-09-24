-- ==============================================================================
-- RECARGAS JUEGOS ONLINE - RESTAURACIÓN Y SINCRONIZACIÓN TOTAL SUPABASE CLOUD
-- Proyecto: recargas-juegos-pro (pemkocaufntsbicnzziz.supabase.co)
-- ==============================================================================
-- Este script:
-- 1. NO borra ni corrompe tus cuentas de GoTrue existentes (b.edumalta@gmail.com, etc.)
-- 2. Restaura y unifica TODAS las funciones RPC requeridas por el backend (claim_purchase_job, etc.)
-- 3. Configura las Políticas RLS de Seguridad correctas para clientes y administradores
-- 4. Garantiza que el backend de Render y el frontend de Hostinger funcionen en armonía
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------------------------
-- 1. TABLAS Y COLUMNAS (Asegurar que todas existan con sus campos completos)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('admin', 'client');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE public.order_status AS ENUM ('held', 'processing', 'pending_reconciliation', 'succeeded', 'failed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_kind') THEN
    CREATE TYPE public.transaction_kind AS ENUM ('credit', 'hold', 'capture', 'release');
  END IF;
END $$;

-- 1.1 Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'client',
  full_name text,
  phone text,
  referral_code text UNIQUE,
  two_factor_enabled boolean NOT NULL DEFAULT false,
  two_factor_secret text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Asegurar columnas en profiles si ya existía
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_factor_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_factor_secret text;

-- 1.2 Wallets
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  balance_minor bigint NOT NULL DEFAULT 0 CHECK (balance_minor >= 0),
  held_minor bigint NOT NULL DEFAULT 0 CHECK (held_minor >= 0 AND held_minor <= balance_minor),
  available_minor bigint GENERATED ALWAYS AS (balance_minor - held_minor) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, currency),
  UNIQUE (id, user_id, currency)
);

-- 1.3 Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  wallet_id uuid NOT NULL,
  currency text NOT NULL,
  provider text NOT NULL CHECK (length(provider) BETWEEN 1 AND 80),
  product_id text NOT NULL CHECK (length(product_id) BETWEEN 1 AND 200),
  player_payload jsonb NOT NULL CHECK (jsonb_typeof(player_payload) = 'object'),
  price_minor bigint NOT NULL CHECK (price_minor > 0),
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 128),
  request_fingerprint text NOT NULL CHECK (length(request_fingerprint) = 64),
  status public.order_status NOT NULL DEFAULT 'held',
  provider_reference text,
  failure_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finalized_at timestamptz,
  FOREIGN KEY (wallet_id, user_id, currency) REFERENCES public.wallets(id, user_id, currency),
  UNIQUE (user_id, idempotency_key),
  UNIQUE (provider, provider_reference),
  UNIQUE (id, wallet_id, user_id, currency)
);
CREATE INDEX IF NOT EXISTS orders_user_created_idx ON public.orders(user_id, created_at DESC);

-- 1.4 Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL,
  user_id uuid NOT NULL,
  currency text NOT NULL,
  order_id uuid,
  kind public.transaction_kind NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  balance_delta_minor bigint NOT NULL DEFAULT 0,
  held_delta_minor bigint NOT NULL DEFAULT 0,
  balance_before_minor bigint NOT NULL DEFAULT 0 CHECK (balance_before_minor >= 0),
  balance_after_minor bigint NOT NULL DEFAULT 0 CHECK (balance_after_minor >= 0),
  held_before_minor bigint NOT NULL DEFAULT 0 CHECK (held_before_minor >= 0),
  held_after_minor bigint NOT NULL DEFAULT 0 CHECK (held_after_minor >= 0),
  idempotency_key text,
  reason text,
  source text,
  external_reference text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (wallet_id, user_id, currency) REFERENCES public.wallets(id, user_id, currency),
  FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE INDEX IF NOT EXISTS transactions_user_created_idx ON public.transactions(user_id, created_at DESC);

-- 1.5 Purchase Jobs (Cola para el backend worker)
CREATE TABLE IF NOT EXISTS public.purchase_jobs (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE RESTRICT,
  state text NOT NULL DEFAULT 'ready' CHECK (state IN ('ready', 'leased', 'reconcile', 'done')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  lease_token uuid,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS purchase_jobs_poll_idx ON public.purchase_jobs(state, available_at);

-- 1.6 Payment Methods
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  account_type text NOT NULL,
  account_number text NOT NULL,
  account_holder text NOT NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 1.7 Deposit Requests
CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_method_id uuid REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  bank_name text NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'USD',
  reference_number text NOT NULL,
  voucher_url text NOT NULL,
  voucher_hash text,
  voucher_compressed_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_bank_reference UNIQUE (bank_name, reference_number)
);

-- 1.8 System Settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  warning_threshold_cents bigint NOT NULL DEFAULT 5000,
  critical_threshold_cents bigint NOT NULL DEFAULT 500,
  circuit_breaker_override text NOT NULL DEFAULT 'auto' CHECK (circuit_breaker_override IN ('auto', 'force_open', 'force_closed')),
  rewards_enabled boolean NOT NULL DEFAULT true,
  referral_commission_percent numeric(5,2) NOT NULL DEFAULT 1.00,
  notification_sender_email text NOT NULL DEFAULT 'notificaciones@recargasjuegospro.cloud',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 1.9 Catalog Game Overrides
CREATE TABLE IF NOT EXISTS public.catalog_game_overrides (
  game_id text PRIMARY KEY,
  custom_name text,
  custom_icon text,
  custom_banner text,
  custom_category text,
  custom_player_id_label text,
  custom_player_id_placeholder text,
  custom_player_id_regex text,
  is_featured boolean NOT NULL DEFAULT false,
  is_hidden boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 1.10 Promotions
CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  badge_text text,
  discount_percent numeric(5,2) CHECK (discount_percent > 0 AND discount_percent <= 100),
  game_id text,
  product_id text,
  banner_url text,
  bg_gradient text,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 1.11 Provider Synced Products
CREATE TABLE IF NOT EXISTS public.provider_synced_products (
  product_id text PRIMARY KEY,
  provider text NOT NULL,
  game_id text NOT NULL,
  name text NOT NULL,
  cost_cents bigint NOT NULL,
  original_cents bigint NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now()
);

-- 1.12 Admin Audit Logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_entity text NOT NULL,
  target_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 1.13 Promotional Materials
CREATE TABLE IF NOT EXISTS public.promotional_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('banner', 'flyer', 'video', 'guide', 'pricing_template', 'other')),
  file_url text NOT NULL,
  format text NOT NULL DEFAULT 'PNG',
  file_size_mb numeric(6,2) NOT NULL DEFAULT 1.0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 1.14 Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  subject text NOT NULL,
  category text NOT NULL CHECK (category IN ('recharge_issue', 'deposit_inquiry', 'account_help', 'suggestion', 'other')),
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  admin_reply text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 1.15 Rewards & Custom Prices
CREATE TABLE IF NOT EXISTS public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'credited' CHECK (status IN ('credited', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reseller_custom_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  custom_price_cents bigint NOT NULL CHECK (custom_price_cents > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

-- ------------------------------------------------------------------------------
-- 2. FUNCIÓN DE ROL ADMIN (Segura y no recursiva)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ------------------------------------------------------------------------------
-- 3. TODAS LAS FUNCIONES RPC REQUERIDAS POR EL BACKEND (Firmas exactas)
-- ------------------------------------------------------------------------------

-- 3.1 create_wallet_if_not_exists
CREATE OR REPLACE FUNCTION public.create_wallet_if_not_exists(
  p_user_id uuid,
  p_currency text DEFAULT 'USD'
)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_wallet public.wallets;
BEGIN
  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE user_id = p_user_id AND currency = p_currency;

  IF v_wallet.id IS NULL THEN
    INSERT INTO public.wallets(user_id, currency, balance_minor, held_minor)
    VALUES (p_user_id, p_currency, 0, 0)
    RETURNING * INTO v_wallet;
  END IF;

  RETURN v_wallet;
END;
$$;

-- 3.2 credit_wallet (Compatible con walletRepository y approveDeposit)
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
    v_wallet.id, p_user_id, p_currency, 'credit', p_amount_minor,
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

-- 3.3 reserve_purchase
CREATE OR REPLACE FUNCTION public.reserve_purchase(
  p_user_id uuid,
  p_currency text,
  p_provider text,
  p_product_id text,
  p_price_minor bigint,
  p_player_payload jsonb,
  p_idempotency_key text,
  p_request_fingerprint text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_wallet public.wallets;
  v_existing_order public.orders;
  v_order public.orders;
  v_new_held bigint;
BEGIN
  IF p_price_minor <= 0 THEN
    RAISE EXCEPTION 'El precio de compra debe ser mayor a 0' USING errcode = '22003';
  END IF;

  SELECT * INTO v_existing_order
  FROM public.orders
  WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;

  IF v_existing_order.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent_replay', true,
      'order_id', v_existing_order.id,
      'status', v_existing_order.status,
      'price_minor', v_existing_order.price_minor
    );
  END IF;

  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE user_id = p_user_id AND currency = p_currency
  FOR UPDATE;

  IF v_wallet.id IS NULL THEN
    RAISE EXCEPTION 'El usuario no tiene una billetera en moneda %', p_currency USING errcode = 'P0002';
  END IF;

  IF v_wallet.available_minor < p_price_minor THEN
    RAISE EXCEPTION 'Saldo disponible insuficiente (% < %)', v_wallet.available_minor, p_price_minor
      USING errcode = 'P0001';
  END IF;

  v_new_held := v_wallet.held_minor + p_price_minor;

  INSERT INTO public.orders(
    user_id, wallet_id, currency, provider, product_id,
    player_payload, price_minor, idempotency_key,
    request_fingerprint, status
  ) VALUES (
    p_user_id, v_wallet.id, p_currency, p_provider, p_product_id,
    p_player_payload, p_price_minor, p_idempotency_key,
    p_request_fingerprint, 'held'
  )
  RETURNING * INTO v_order;

  INSERT INTO public.transactions(
    wallet_id, user_id, currency, order_id, kind,
    amount_minor, balance_delta_minor, held_delta_minor,
    balance_before_minor, balance_after_minor,
    held_before_minor, held_after_minor,
    idempotency_key, source, reason
  ) VALUES (
    v_wallet.id, p_user_id, p_currency, v_order.id, 'hold',
    p_price_minor, 0, p_price_minor,
    v_wallet.balance_minor, v_wallet.balance_minor,
    v_wallet.held_minor, v_new_held,
    p_idempotency_key || '_hold', 'purchase_flow',
    'Retención preventiva por orden ' || v_order.id
  );

  UPDATE public.wallets
  SET held_minor = v_new_held,
      updated_at = now()
  WHERE id = v_wallet.id;

  INSERT INTO public.purchase_jobs(order_id, state, attempts, available_at)
  VALUES (v_order.id, 'ready', 0, now());

  RETURN jsonb_build_object(
    'success', true,
    'idempotent_replay', false,
    'order_id', v_order.id,
    'status', v_order.status,
    'price_minor', p_price_minor,
    'wallet_available_minor', v_wallet.balance_minor - v_new_held
  );
END;
$$;

-- 3.4 claim_purchase_job (¡CRÍTICO para el background worker!)
CREATE OR REPLACE FUNCTION public.claim_purchase_job(
  p_lease_seconds integer DEFAULT 60,
  p_lease_token uuid DEFAULT gen_random_uuid()
)
RETURNS TABLE (
  job_order_id uuid,
  job_attempts integer,
  job_lease_token uuid,
  order_user_id uuid,
  order_wallet_id uuid,
  order_currency text,
  order_provider text,
  order_product_id text,
  order_player_payload jsonb,
  order_price_minor bigint,
  order_idempotency_key text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_job_record record;
BEGIN
  SELECT j.order_id, j.attempts
  INTO v_job_record
  FROM public.purchase_jobs j
  WHERE (j.state = 'ready' AND j.available_at <= now())
     OR (j.state = 'leased' AND j.lease_until < now())
  ORDER BY j.available_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_job_record.order_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.purchase_jobs
  SET state = 'leased',
      attempts = v_job_record.attempts + 1,
      lease_until = now() + (p_lease_seconds || ' seconds')::interval,
      lease_token = p_lease_token
  WHERE order_id = v_job_record.order_id;

  UPDATE public.orders
  SET status = 'processing',
      updated_at = now()
  WHERE id = v_job_record.order_id;

  RETURN QUERY
  SELECT
    j.order_id AS job_order_id,
    j.attempts AS job_attempts,
    p_lease_token AS job_lease_token,
    o.user_id AS order_user_id,
    o.wallet_id AS order_wallet_id,
    o.currency AS order_currency,
    o.provider AS order_provider,
    o.product_id AS order_product_id,
    o.player_payload AS order_player_payload,
    o.price_minor AS order_price_minor,
    o.idempotency_key AS order_idempotency_key
  FROM public.purchase_jobs j
  JOIN public.orders o ON o.id = j.order_id
  WHERE j.order_id = v_job_record.order_id;
END;
$$;

-- 3.5 settle_purchase
CREATE OR REPLACE FUNCTION public.settle_purchase(
  p_order_id uuid,
  p_lease_token uuid,
  p_outcome text,
  p_provider_reference text DEFAULT NULL,
  p_failure_code text DEFAULT NULL,
  p_digital_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_job public.purchase_jobs;
  v_order public.orders;
  v_wallet public.wallets;
BEGIN
  IF p_outcome NOT IN ('succeeded', 'failed', 'pending_reconciliation') THEN
    RAISE EXCEPTION 'Resultado no reconocido: %', p_outcome USING errcode = '22023';
  END IF;

  SELECT * INTO v_job
  FROM public.purchase_jobs
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF v_job.order_id IS NULL THEN
    RAISE EXCEPTION 'Trabajo no encontrado para la orden %', p_order_id USING errcode = 'P0002';
  END IF;

  IF v_job.lease_token IS DISTINCT FROM p_lease_token AND v_job.state = 'leased' AND v_job.lease_until >= now() THEN
    RAISE EXCEPTION 'Token de lease inválido o vencido' USING errcode = 'P0003';
  END IF;

  SELECT w.* INTO v_wallet
  FROM public.orders o
  JOIN public.wallets w ON w.id = o.wallet_id
  WHERE o.id = p_order_id
  FOR UPDATE OF w;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.status IN ('succeeded', 'failed') THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent_replay', true,
      'order_id', v_order.id,
      'status', v_order.status
    );
  END IF;

  IF p_outcome = 'succeeded' THEN
    INSERT INTO public.transactions(
      wallet_id, user_id, currency, order_id, kind,
      amount_minor, balance_delta_minor, held_delta_minor,
      balance_before_minor, balance_after_minor,
      held_before_minor, held_after_minor,
      idempotency_key, source, external_reference, reason
    ) VALUES (
      v_wallet.id, v_order.user_id, v_order.currency, v_order.id, 'capture',
      v_order.price_minor, -v_order.price_minor, -v_order.price_minor,
      v_wallet.balance_minor, v_wallet.balance_minor - v_order.price_minor,
      v_wallet.held_minor, v_wallet.held_minor - v_order.price_minor,
      v_order.idempotency_key || '_capture', 'purchase_settlement',
      p_provider_reference, COALESCE(p_digital_code, 'Compra exitosa acreditada al jugador')
    );

    UPDATE public.wallets
    SET balance_minor = balance_minor - v_order.price_minor,
        held_minor = held_minor - v_order.price_minor,
        updated_at = now()
    WHERE id = v_wallet.id;

    UPDATE public.orders
    SET status = 'succeeded',
        provider_reference = COALESCE(p_provider_reference, provider_reference),
        finalized_at = now(),
        updated_at = now()
    WHERE id = v_order.id;

    UPDATE public.purchase_jobs
    SET state = 'done',
        lease_token = NULL
    WHERE order_id = v_order.id;

  ELSIF p_outcome = 'failed' THEN
    INSERT INTO public.transactions(
      wallet_id, user_id, currency, order_id, kind,
      amount_minor, balance_delta_minor, held_delta_minor,
      balance_before_minor, balance_after_minor,
      held_before_minor, held_after_minor,
      idempotency_key, source, external_reference, reason
    ) VALUES (
      v_wallet.id, v_order.user_id, v_order.currency, v_order.id, 'release',
      v_order.price_minor, 0, -v_order.price_minor,
      v_wallet.balance_minor, v_wallet.balance_minor,
      v_wallet.held_minor, v_wallet.held_minor - v_order.price_minor,
      v_order.idempotency_key || '_release', 'purchase_settlement',
      p_provider_reference, 'Liberación por compra fallida: ' || COALESCE(p_failure_code, 'Rechazo')
    );

    UPDATE public.wallets
    SET held_minor = held_minor - v_order.price_minor,
        updated_at = now()
    WHERE id = v_wallet.id;

    UPDATE public.orders
    SET status = 'failed',
        failure_code = p_failure_code,
        provider_reference = COALESCE(p_provider_reference, provider_reference),
        finalized_at = now(),
        updated_at = now()
    WHERE id = v_order.id;

    UPDATE public.purchase_jobs
    SET state = 'done',
        last_error_code = p_failure_code,
        lease_token = NULL
    WHERE order_id = v_order.id;

  ELSIF p_outcome = 'pending_reconciliation' THEN
    UPDATE public.orders
    SET status = 'pending_reconciliation',
        failure_code = p_failure_code,
        updated_at = now()
    WHERE id = v_order.id;

    UPDATE public.purchase_jobs
    SET state = 'reconcile',
        last_error_code = p_failure_code,
        lease_token = NULL
    WHERE order_id = v_order.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'status', p_outcome,
    'provider_reference', p_provider_reference
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. PERMISOS Y ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;

-- Permisos básicos para cliente autenticado
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.wallets TO authenticated;
GRANT SELECT ON public.orders TO authenticated;
GRANT SELECT ON public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT ON public.deposit_requests TO authenticated;
GRANT SELECT ON public.rewards TO authenticated;
GRANT SELECT ON public.reseller_custom_prices TO authenticated;

-- Permisos de lectura pública para catálogo y configuración
GRANT SELECT ON public.payment_methods TO anon, authenticated;
GRANT SELECT ON public.system_settings TO anon, authenticated;
GRANT SELECT ON public.catalog_game_overrides TO anon, authenticated;
GRANT SELECT ON public.promotions TO anon, authenticated;
GRANT SELECT ON public.promotional_materials TO anon, authenticated;
GRANT SELECT ON public.provider_synced_products TO anon, authenticated;

-- Activar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_game_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotional_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_custom_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_synced_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas anteriores para evitar duplicados
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;
DROP POLICY IF EXISTS "wallets_select" ON public.wallets;
DROP POLICY IF EXISTS "wallets_read_own" ON public.wallets;
DROP POLICY IF EXISTS "orders_select" ON public.orders;
DROP POLICY IF EXISTS "orders_read_own" ON public.orders;
DROP POLICY IF EXISTS "transactions_select" ON public.transactions;
DROP POLICY IF EXISTS "transactions_read_own" ON public.transactions;
DROP POLICY IF EXISTS "deposit_requests_select" ON public.deposit_requests;
DROP POLICY IF EXISTS "deposit_requests_insert" ON public.deposit_requests;
DROP POLICY IF EXISTS "deposit_requests_admin" ON public.deposit_requests;
DROP POLICY IF EXISTS "support_tickets_all" ON public.support_tickets;
DROP POLICY IF EXISTS "payment_methods_public" ON public.payment_methods;
DROP POLICY IF EXISTS "system_settings_public" ON public.system_settings;
DROP POLICY IF EXISTS "catalog_game_overrides_public" ON public.catalog_game_overrides;
DROP POLICY IF EXISTS "promotions_public" ON public.promotions;
DROP POLICY IF EXISTS "promotional_materials_public" ON public.promotional_materials;
DROP POLICY IF EXISTS "provider_synced_products_public" ON public.provider_synced_products;
DROP POLICY IF EXISTS "rewards_select" ON public.rewards;
DROP POLICY IF EXISTS "reseller_custom_prices_select" ON public.reseller_custom_prices;
DROP POLICY IF EXISTS "admin_audit_logs_select" ON public.admin_audit_logs;

-- Políticas Profiles: Cada usuario lee/actualiza su perfil, admin gestiona todos
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

-- Políticas Wallets: Cada usuario ve su saldo, admin ve todos
CREATE POLICY "wallets_select" ON public.wallets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Políticas Orders: Cada usuario ve sus compras, admin ve todas
CREATE POLICY "orders_select" ON public.orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Políticas Transactions: Cada usuario ve sus movimientos, admin ve todos
CREATE POLICY "transactions_select" ON public.transactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Políticas Deposit Requests
CREATE POLICY "deposit_requests_select" ON public.deposit_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "deposit_requests_insert" ON public.deposit_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "deposit_requests_admin" ON public.deposit_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Políticas Support Tickets
CREATE POLICY "support_tickets_all" ON public.support_tickets
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Políticas Públicas de Solo Lectura
CREATE POLICY "payment_methods_public" ON public.payment_methods
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.is_admin());

CREATE POLICY "system_settings_public" ON public.system_settings
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "catalog_game_overrides_public" ON public.catalog_game_overrides
  FOR SELECT TO anon, authenticated
  USING (is_hidden = false OR public.is_admin());

CREATE POLICY "promotions_public" ON public.promotions
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.is_admin());

CREATE POLICY "promotional_materials_public" ON public.promotional_materials
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.is_admin());

CREATE POLICY "provider_synced_products_public" ON public.provider_synced_products
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.is_admin());

CREATE POLICY "rewards_select" ON public.rewards
  FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid() OR public.is_admin());

CREATE POLICY "reseller_custom_prices_select" ON public.reseller_custom_prices
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "admin_audit_logs_select" ON public.admin_audit_logs
  FOR ALL TO authenticated
  USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 5. SEMILLAS POR DEFECTO
-- ------------------------------------------------------------------------------
INSERT INTO public.payment_methods (bank_name, account_type, account_number, account_holder, sort_order)
VALUES
  ('BANCO DEL PACÍFICO', 'Ahorros', '1060251921', 'Kevin Guerrero', 1),
  ('BANCO GUAYAQUIL', 'Ahorros', '47761641', 'Kevin Guerrero', 2),
  ('BANCO PICHINCHA', 'Ahorros', '2200570913', 'Kevin Guerrero', 3),
  ('BINANCE PAY (USDT)', 'Pay ID', '281449411', 'XTREMEPLAY', 4),
  ('PAYPAL', 'Transferencia USD', 'pagos@xtremeplay.me', 'XtremePlay Global', 5)
ON CONFLICT DO NOTHING;

INSERT INTO public.system_settings (id, warning_threshold_cents, critical_threshold_cents, circuit_breaker_override, rewards_enabled, referral_commission_percent, notification_sender_email)
VALUES (1, 5000, 500, 'auto', true, 1.00, 'notificaciones@recargasjuegospro.cloud')
ON CONFLICT (id) DO UPDATE SET
  notification_sender_email = 'notificaciones@recargasjuegospro.cloud';

-- ------------------------------------------------------------------------------
-- FIN DEL SCRIPT: Tu base de datos queda 100% calibrada con el Backend y Frontend
-- ------------------------------------------------------------------------------

