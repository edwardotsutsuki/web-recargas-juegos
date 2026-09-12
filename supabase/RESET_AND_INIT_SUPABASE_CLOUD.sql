-- ==============================================================================
-- RECARGAS JUEGOS ONLINE - RESET & INITIALIZE SUPABASE CLOUD
-- Proyecto: recargas-juegos-pro (pemkocaufntsbicnzziz)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------------------------
-- 1. LIMPIEZA TOTAL Y REINICIO DE AUTENTICACIÓN
-- ------------------------------------------------------------------------------
-- Limpia usuarios previos corruptos por inserción manual para restablecer el motor de autenticación
TRUNCATE auth.users CASCADE;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_referral_code ON public.profiles;
DROP TRIGGER IF EXISTS wallets_updated ON public.wallets;
DROP TRIGGER IF EXISTS orders_updated ON public.orders;
DROP TRIGGER IF EXISTS transactions_immutable ON public.transactions;

DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
DROP FUNCTION IF EXISTS public.touch_updated_at CASCADE;
DROP FUNCTION IF EXISTS public.reject_transaction_mutation CASCADE;
DROP FUNCTION IF EXISTS public.trg_assign_referral_code CASCADE;
DROP FUNCTION IF EXISTS public.generate_referral_code CASCADE;
DROP FUNCTION IF EXISTS public.reject_deposit_request CASCADE;
DROP FUNCTION IF EXISTS public.approve_deposit_request CASCADE;
DROP FUNCTION IF EXISTS public.settle_purchase CASCADE;
DROP FUNCTION IF EXISTS public.claim_purchase_job CASCADE;
DROP FUNCTION IF EXISTS public.reserve_purchase CASCADE;
DROP FUNCTION IF EXISTS public.credit_wallet CASCADE;
DROP FUNCTION IF EXISTS public.create_wallet_if_not_exists CASCADE;

-- Tablas
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.ticket_messages CASCADE;
DROP TABLE IF EXISTS public.helpdesk_tickets CASCADE;
DROP TABLE IF EXISTS public.promotional_materials CASCADE;
DROP TABLE IF EXISTS public.admin_audit_logs CASCADE;
DROP TABLE IF EXISTS public.provider_synced_products CASCADE;
DROP TABLE IF EXISTS public.promotions CASCADE;
DROP TABLE IF EXISTS public.catalog_game_overrides CASCADE;
DROP TABLE IF EXISTS public.catalog_overrides CASCADE;
DROP TABLE IF EXISTS public.rewards CASCADE;
DROP TABLE IF EXISTS public.reseller_custom_prices CASCADE;
DROP TABLE IF EXISTS public.system_settings CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.deposit_requests CASCADE;
DROP TABLE IF EXISTS public.payment_methods CASCADE;
DROP TABLE IF EXISTS public.purchase_jobs CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.wallets CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.idempotency_keys CASCADE;

-- Tipos
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.order_status CASCADE;
DROP TYPE IF EXISTS public.transaction_kind CASCADE;

-- ------------------------------------------------------------------------------
-- 2. TIPOS DE DATOS Y ENUMS
-- ------------------------------------------------------------------------------
CREATE TYPE public.user_role AS ENUM ('admin', 'client');
CREATE TYPE public.order_status AS ENUM ('held', 'processing', 'pending_reconciliation', 'succeeded', 'failed');
CREATE TYPE public.transaction_kind AS ENUM ('credit', 'hold', 'capture', 'release');

-- ------------------------------------------------------------------------------
-- 3. TABLAS PRINCIPALES DEL SISTEMA
-- ------------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'client',
  full_name text,
  phone text,
  referral_code text UNIQUE,
  two_factor_enabled boolean NOT NULL DEFAULT false,
  two_factor_secret text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.wallets (
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

CREATE TABLE public.orders (
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
  UNIQUE (id, wallet_id, user_id, currency),
  CHECK ((status IN ('succeeded', 'failed')) = (finalized_at IS NOT NULL))
);
CREATE INDEX orders_user_created_idx ON public.orders(user_id, created_at DESC);

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL,
  user_id uuid NOT NULL,
  currency text NOT NULL,
  order_id uuid,
  kind public.transaction_kind NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  balance_before_minor bigint NOT NULL CHECK (balance_before_minor >= 0),
  balance_after_minor bigint NOT NULL CHECK (balance_after_minor >= 0),
  held_before_minor bigint NOT NULL CHECK (held_before_minor >= 0),
  held_after_minor bigint NOT NULL CHECK (held_after_minor >= 0),
  reason text,
  source text,
  external_reference text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (wallet_id, user_id, currency) REFERENCES public.wallets(id, user_id, currency),
  FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CHECK (
    (kind IN ('hold', 'capture', 'release') AND order_id IS NOT NULL) OR
    (kind = 'credit' AND actor_id IS NOT NULL AND length(trim(reason)) > 0 AND reason IS NOT NULL)
  )
);
CREATE UNIQUE INDEX transactions_order_kind_idx ON public.transactions(order_id, kind) WHERE order_id IS NOT NULL;
CREATE UNIQUE INDEX transactions_order_final_idx ON public.transactions(order_id) WHERE kind IN ('capture', 'release');
CREATE UNIQUE INDEX transactions_credit_reference_idx ON public.transactions(source, external_reference) WHERE kind = 'credit' AND external_reference IS NOT NULL;
CREATE INDEX transactions_user_created_idx ON public.transactions(user_id, created_at DESC);

CREATE TABLE public.purchase_jobs (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE RESTRICT,
  state text NOT NULL DEFAULT 'ready' CHECK (state IN ('ready', 'leased', 'reconcile', 'done')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  lease_token uuid,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX purchase_jobs_poll_idx ON public.purchase_jobs(state, available_at);

CREATE TABLE public.payment_methods (
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
CREATE INDEX idx_payment_methods_active ON public.payment_methods(is_active, sort_order);

CREATE TABLE public.deposit_requests (
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
CREATE INDEX idx_deposit_requests_user ON public.deposit_requests(user_id, created_at DESC);

CREATE TABLE public.system_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  warning_threshold_cents bigint NOT NULL DEFAULT 5000,
  critical_threshold_cents bigint NOT NULL DEFAULT 500,
  circuit_breaker_override text NOT NULL DEFAULT 'auto' CHECK (circuit_breaker_override IN ('auto', 'force_open', 'force_closed')),
  rewards_enabled boolean NOT NULL DEFAULT true,
  referral_commission_percent numeric(5,2) NOT NULL DEFAULT 1.00,
  notification_sender_email text NOT NULL DEFAULT 'notificaciones@recargasjuegospro.cloud',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.reseller_custom_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  custom_price_cents bigint NOT NULL CHECK (custom_price_cents > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE TABLE public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'credited' CHECK (status IN ('credited', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rewards_referrer ON public.rewards(referrer_id, created_at DESC);

CREATE TABLE public.catalog_game_overrides (
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

CREATE TABLE public.promotions (
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

CREATE TABLE public.provider_synced_products (
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

CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_entity text NOT NULL,
  target_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_actor ON public.admin_audit_logs(actor_id, created_at DESC);

CREATE TABLE public.promotional_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('banner', 'flyer', 'video', 'guide', 'pricing_template')),
  file_url text NOT NULL,
  format text NOT NULL DEFAULT 'PNG',
  file_size_mb numeric(6,2) NOT NULL DEFAULT 1.0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.support_tickets (
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
CREATE INDEX idx_support_tickets_user ON public.support_tickets(user_id, created_at DESC);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);

-- ------------------------------------------------------------------------------
-- 4. TRIGGERS AUTOMÁTICOS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

CREATE TRIGGER wallets_updated BEFORE UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.reject_transaction_mutation() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'Las transacciones del libro contable son inmutables.';
END;
$$;

CREATE TRIGGER transactions_immutable BEFORE UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.reject_transaction_mutation();

-- Generador de códigos de referido
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text[] := '{0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F,G,H,J,K,L,M,N,P,Q,R,S,T,U,V,W,X,Y,Z}';
  result text := 'XP-';
  i int;
  candidate text;
  exists_already boolean;
BEGIN
  LOOP
    candidate := 'XP-';
    FOR i IN 1..6 LOOP
      candidate := candidate || chars[1 + floor(random() * array_length(chars, 1))::int];
    END LOOP;
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = candidate) INTO exists_already;
    IF NOT exists_already THEN
      RETURN candidate;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_assign_referral_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.referral_code IS NULL OR length(trim(NEW.referral_code)) = 0 THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_assign_referral_code();

-- Auto creación de perfil al registrarse en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    new.id,
    'client',
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wallets (user_id, currency, balance_minor)
  VALUES (new.id, 'USD', 0)
  ON CONFLICT (user_id, currency) DO NOTHING;

  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 5. FUNCIONES RPC TRANSACCIONALES
-- ------------------------------------------------------------------------------
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
  INSERT INTO public.wallets (user_id, currency, balance_minor, held_minor)
  VALUES (p_user_id, p_currency, 0, 0)
  ON CONFLICT (user_id, currency) DO UPDATE
    SET updated_at = now()
  RETURNING * INTO v_wallet;
  RETURN v_wallet;
END;
$$;

CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id uuid,
  p_currency text,
  p_amount_minor bigint,
  p_reason text,
  p_source text,
  p_external_reference text,
  p_actor_id uuid
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_wallet public.wallets;
  v_tx public.transactions;
BEGIN
  IF p_amount_minor <= 0 THEN
    RAISE EXCEPTION 'El monto a acreditar debe ser mayor a cero';
  END IF;

  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE user_id = p_user_id AND currency = p_currency
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, currency, balance_minor, held_minor)
    VALUES (p_user_id, p_currency, p_amount_minor, 0)
    RETURNING * INTO v_wallet;

    INSERT INTO public.transactions (
      wallet_id, user_id, currency, kind, amount_minor,
      balance_before_minor, balance_after_minor,
      held_before_minor, held_after_minor,
      reason, source, external_reference, actor_id
    ) VALUES (
      v_wallet.id, p_user_id, p_currency, 'credit', p_amount_minor,
      0, p_amount_minor,
      0, 0,
      p_reason, p_source, p_external_reference, p_actor_id
    ) RETURNING * INTO v_tx;
  ELSE
    UPDATE public.wallets
    SET balance_minor = balance_minor + p_amount_minor,
        updated_at = now()
    WHERE id = v_wallet.id;

    INSERT INTO public.transactions (
      wallet_id, user_id, currency, kind, amount_minor,
      balance_before_minor, balance_after_minor,
      held_before_minor, held_after_minor,
      reason, source, external_reference, actor_id
    ) VALUES (
      v_wallet.id, p_user_id, p_currency, 'credit', p_amount_minor,
      v_wallet.balance_minor, v_wallet.balance_minor + p_amount_minor,
      v_wallet.held_minor, v_wallet.held_minor,
      p_reason, p_source, p_external_reference, p_actor_id
    ) RETURNING * INTO v_tx;
  END IF;

  RETURN v_tx;
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_purchase(
  p_user_id uuid,
  p_currency text,
  p_price_minor bigint,
  p_provider text,
  p_product_id text,
  p_player_payload jsonb,
  p_idempotency_key text,
  p_request_fingerprint text
)
RETURNS TABLE (
  order_id uuid,
  status public.order_status,
  already_existed boolean,
  balance_minor bigint,
  available_minor bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_wallet public.wallets;
  v_order public.orders;
  v_job public.purchase_jobs;
BEGIN
  -- 1. Idempotencia
  SELECT * INTO v_order
  FROM public.orders
  WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_order.request_fingerprint <> p_request_fingerprint THEN
      RAISE EXCEPTION 'Conflicto de idempotencia: clave reutilizada con distintos parámetros';
    END IF;

    SELECT * INTO v_wallet FROM public.wallets WHERE id = v_order.wallet_id;
    RETURN QUERY SELECT v_order.id, v_order.status, true, v_wallet.balance_minor, v_wallet.available_minor;
    RETURN;
  END IF;

  -- 2. Bloquear y verificar saldo
  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE user_id = p_user_id AND currency = p_currency
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Billetera no encontrada para usuario % y divisa %', p_user_id, p_currency;
  END IF;

  IF v_wallet.available_minor < p_price_minor THEN
    RAISE EXCEPTION 'Saldo insuficiente para completar la compra';
  END IF;

  -- 3. Retener fondos
  UPDATE public.wallets
  SET held_minor = held_minor + p_price_minor,
      updated_at = now()
  WHERE id = v_wallet.id;

  INSERT INTO public.orders (
    user_id, wallet_id, currency, provider, product_id,
    player_payload, price_minor, idempotency_key,
    request_fingerprint, status
  ) VALUES (
    p_user_id, v_wallet.id, p_currency, p_provider, p_product_id,
    p_player_payload, p_price_minor, p_idempotency_key,
    p_request_fingerprint, 'held'
  ) RETURNING * INTO v_order;

  INSERT INTO public.transactions (
    wallet_id, user_id, currency, order_id, kind, amount_minor,
    balance_before_minor, balance_after_minor,
    held_before_minor, held_after_minor, reason
  ) VALUES (
    v_wallet.id, p_user_id, p_currency, v_order.id, 'hold', p_price_minor,
    v_wallet.balance_minor, v_wallet.balance_minor,
    v_wallet.held_minor, v_wallet.held_minor + p_price_minor,
    'Retención preventiva de fondos para recarga'
  );

  INSERT INTO public.purchase_jobs (order_id, state, available_at)
  VALUES (v_order.id, 'ready', now())
  RETURNING * INTO v_job;

  RETURN QUERY SELECT v_order.id, v_order.status, false, v_wallet.balance_minor, v_wallet.available_minor - p_price_minor;
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_purchase(
  p_order_id uuid,
  p_outcome text,
  p_provider_reference text DEFAULT NULL,
  p_failure_code text DEFAULT NULL
)
RETURNS TABLE (
  order_id uuid,
  new_status public.order_status,
  balance_minor bigint,
  available_minor bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.orders;
  v_wallet public.wallets;
  v_final_status public.order_status;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orden % no encontrada', p_order_id;
  END IF;

  IF v_order.status IN ('succeeded', 'failed') THEN
    SELECT * INTO v_wallet FROM public.wallets WHERE id = v_order.wallet_id;
    RETURN QUERY SELECT v_order.id, v_order.status, v_wallet.balance_minor, v_wallet.available_minor;
    RETURN;
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE id = v_order.wallet_id FOR UPDATE;

  IF p_outcome = 'succeeded' THEN
    v_final_status := 'succeeded';
    UPDATE public.wallets
    SET balance_minor = balance_minor - v_order.price_minor,
        held_minor = held_minor - v_order.price_minor,
        updated_at = v_now
    WHERE id = v_wallet.id;

    INSERT INTO public.transactions (
      wallet_id, user_id, currency, order_id, kind, amount_minor,
      balance_before_minor, balance_after_minor,
      held_before_minor, held_after_minor, reason
    ) VALUES (
      v_wallet.id, v_order.user_id, v_order.currency, v_order.id, 'capture', v_order.price_minor,
      v_wallet.balance_minor, v_wallet.balance_minor - v_order.price_minor,
      v_wallet.held_minor, v_wallet.held_minor - v_order.price_minor,
      'Captura definitiva de fondos por recarga completada'
    );
  ELSIF p_outcome = 'failed' THEN
    v_final_status := 'failed';
    UPDATE public.wallets
    SET held_minor = held_minor - v_order.price_minor,
        updated_at = v_now
    WHERE id = v_wallet.id;

    INSERT INTO public.transactions (
      wallet_id, user_id, currency, order_id, kind, amount_minor,
      balance_before_minor, balance_after_minor,
      held_before_minor, held_after_minor, reason
    ) VALUES (
      v_wallet.id, v_order.user_id, v_order.currency, v_order.id, 'release', v_order.price_minor,
      v_wallet.balance_minor, v_wallet.balance_minor,
      v_wallet.held_minor, v_wallet.held_minor - v_order.price_minor,
      'Liberación de saldo por fallo en proveedor'
    );
  ELSE
    RAISE EXCEPTION 'Resultado % no reconocido', p_outcome;
  END IF;

  UPDATE public.orders
  SET status = v_final_status,
      provider_reference = COALESCE(p_provider_reference, provider_reference),
      failure_code = p_failure_code,
      finalized_at = v_now,
      updated_at = v_now
  WHERE id = v_order.id;

  UPDATE public.purchase_jobs
  SET state = 'done'
  WHERE order_id = v_order.id;

  SELECT * INTO v_wallet FROM public.wallets WHERE id = v_order.wallet_id;
  RETURN QUERY SELECT v_order.id, v_final_status, v_wallet.balance_minor, v_wallet.available_minor;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_deposit_request(
  p_request_id uuid,
  p_admin_id uuid
)
RETURNS TABLE (
  request_id uuid,
  user_id uuid,
  amount_cents bigint,
  new_balance_cents bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_req public.deposit_requests;
  v_tx public.transactions;
BEGIN
  SELECT * INTO v_req
  FROM public.deposit_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud de depósito % no encontrada', p_request_id;
  END IF;

  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'La solicitud % ya fue procesada anteriormente (estado: %)', p_request_id, v_req.status;
  END IF;

  SELECT * INTO v_tx
  FROM public.credit_wallet(
    v_req.user_id,
    v_req.currency,
    v_req.amount_cents,
    'Depósito verificado y aprobado: ' || v_req.bank_name || ' Ref: ' || v_req.reference_number,
    'deposit_voucher',
    v_req.reference_number,
    p_admin_id
  );

  UPDATE public.deposit_requests
  SET status = 'approved',
      approved_by = p_admin_id,
      approved_at = now(),
      updated_at = now()
  WHERE id = p_request_id;

  RETURN QUERY SELECT v_req.id, v_req.user_id, v_req.amount_cents, v_tx.balance_after_minor;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_deposit_request(
  p_request_id uuid,
  p_admin_id uuid,
  p_reason text
)
RETURNS public.deposit_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_req public.deposit_requests;
BEGIN
  SELECT * INTO v_req
  FROM public.deposit_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud de depósito % no encontrada', p_request_id;
  END IF;

  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'La solicitud % ya fue procesada anteriormente', p_request_id;
  END IF;

  UPDATE public.deposit_requests
  SET status = 'rejected',
      approved_by = p_admin_id,
      rejection_reason = p_reason,
      approved_at = now(),
      updated_at = now()
  WHERE id = p_request_id
  RETURNING * INTO v_req;

  RETURN v_req;
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. SEMILLAS OFICIALES (Bancos y Configuración)
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
-- 7. PERMISOS Y ROLES DE ACCESO EN SUPABASE CLOUD
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.payment_methods TO anon, authenticated;
GRANT SELECT ON public.system_settings TO anon, authenticated;
GRANT SELECT ON public.catalog_game_overrides TO anon, authenticated;
GRANT SELECT ON public.promotions TO anon, authenticated;
GRANT SELECT ON public.provider_synced_products TO anon, authenticated;
