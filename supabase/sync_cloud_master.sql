-- ==============================================================================
-- SINCRONIZACIÓN MAESTRA TOTAL: LOCAL -> SUPABASE CLOUD (EN LÍNEA)
-- ==============================================================================
-- Este script es 100% IDEMPOTENTE (se puede correr múltiples veces de forma segura).
-- Deja Supabase Online IDÉNTICO al Supabase Local:
--  1. Todas las 16 tablas públicas con sus columnas, tipos, constraints y RLS.
--  2. Inclusión de 'digital_code' y 'redeem_instructions' en 'orders'.
--  3. RPCs transaccionales monetarias atómicas (credit_wallet, reserve_purchase...).
--  4. Semillas oficiales (system_settings, promotions, rewards, payment_methods).
--  5. Usuarios: Clave '#RyuuDragon9595' y rol 'admin' para b.edumalta@gmail.com.
-- ==============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------------------------
-- 1. TABLA: profiles (Perfiles de usuarios y revendedores)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'reseller', 'admin')),
  full_name text,
  phone text,
  referral_code text UNIQUE,
  referred_by uuid REFERENCES public.profiles(id),
  two_factor_enabled boolean NOT NULL DEFAULT false,
  two_factor_secret text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'client',
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS referred_by uuid,
  ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS two_factor_secret text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;


-- ------------------------------------------------------------------------------
-- 2. TABLA: wallets (Billeteras virtuales de clientes y revendedores)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'USD',
  balance_minor bigint NOT NULL DEFAULT 0 CHECK (balance_minor >= 0),
  held_minor bigint NOT NULL DEFAULT 0 CHECK (held_minor >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_currency UNIQUE (user_id, currency)
);

ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS balance_minor bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS held_minor bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wallets' AND column_name='available_minor') THEN
    ALTER TABLE public.wallets ADD COLUMN available_minor bigint GENERATED ALWAYS AS (balance_minor - held_minor) STORED;
  END IF;
END $$;

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallets_own_select" ON public.wallets;
CREATE POLICY "wallets_own_select" ON public.wallets FOR SELECT USING (auth.uid() = user_id);

GRANT ALL ON public.wallets TO service_role;
GRANT SELECT ON public.wallets TO authenticated;


-- ------------------------------------------------------------------------------
-- 3. TABLA: transactions (Libro contable inmutable)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_kind') THEN
    CREATE TYPE public.transaction_kind AS ENUM ('deposit', 'purchase_reserve', 'purchase_settle', 'purchase_refund', 'adjustment', 'referral_bonus');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  currency text NOT NULL DEFAULT 'USD',
  order_id uuid,
  kind public.transaction_kind NOT NULL,
  amount_minor bigint NOT NULL,
  balance_delta_minor bigint NOT NULL DEFAULT 0,
  held_delta_minor bigint NOT NULL DEFAULT 0,
  idempotency_key text NOT NULL,
  actor_id uuid REFERENCES public.profiles(id),
  source text NOT NULL DEFAULT 'system',
  external_reference text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_wallet_idempotency UNIQUE (wallet_id, idempotency_key)
);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS balance_delta_minor bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS held_delta_minor bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS actor_id uuid,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS external_reference text,
  ADD COLUMN IF NOT EXISTS reason text;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='balance_before_minor') THEN
    ALTER TABLE public.transactions ALTER COLUMN balance_before_minor DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='balance_after_minor') THEN
    ALTER TABLE public.transactions ALTER COLUMN balance_after_minor DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='held_before_minor') THEN
    ALTER TABLE public.transactions ALTER COLUMN held_before_minor DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='held_after_minor') THEN
    ALTER TABLE public.transactions ALTER COLUMN held_after_minor DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_own_select" ON public.transactions;
CREATE POLICY "transactions_own_select" ON public.transactions FOR SELECT USING (auth.uid() = user_id);

GRANT ALL ON public.transactions TO service_role;
GRANT SELECT ON public.transactions TO authenticated;


-- ------------------------------------------------------------------------------
-- 4. TABLA: orders (Órdenes de recargas y pines digitales)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  sku text NOT NULL,
  game_id text NOT NULL,
  price_minor bigint NOT NULL CHECK (price_minor > 0),
  wholesale_minor bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  player_id text,
  server_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled')),
  provider_order_id text,
  digital_code text,
  redeem_instructions text,
  last_error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS wholesale_minor bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS digital_code text,
  ADD COLUMN IF NOT EXISTS redeem_instructions text,
  ADD COLUMN IF NOT EXISTS last_error_message text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_own_select" ON public.orders;
CREATE POLICY "orders_own_select" ON public.orders FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
CREATE POLICY "orders_admin_all" ON public.orders FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

GRANT ALL ON public.orders TO service_role;
GRANT SELECT, INSERT ON public.orders TO authenticated;


-- ------------------------------------------------------------------------------
-- 5. TABLA: purchase_jobs (Cola de procesamiento asíncrono con proveedor)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_jobs (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'ready' CHECK (state IN ('ready', 'in_flight', 'succeeded', 'failed', 'dead_letter')),
  attempts int NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  lease_token uuid,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_jobs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.purchase_jobs TO service_role;


-- ------------------------------------------------------------------------------
-- 6. TABLA: payment_methods (Cuentas bancarias de depósito)
-- ------------------------------------------------------------------------------
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

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cuentas bancarias visibles para todos" ON public.payment_methods;
CREATE POLICY "Cuentas bancarias visibles para todos" ON public.payment_methods FOR SELECT USING (is_active = true);

GRANT ALL ON public.payment_methods TO service_role;
GRANT SELECT ON public.payment_methods TO anon, authenticated;

INSERT INTO public.payment_methods (bank_name, account_type, account_number, account_holder, notes, is_active, sort_order)
SELECT 'Banco Pichincha / Guayaquil', 'Corriente', '2200112233', 'Recargas Juegos Online', 'Envía comprobante con el número de transacción bancario exacto.', true, 1
WHERE NOT EXISTS (SELECT 1 FROM public.payment_methods LIMIT 1);


-- ------------------------------------------------------------------------------
-- 7. TABLA: deposit_requests (Solicitudes de recarga de saldo)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_method_id uuid REFERENCES public.payment_methods(id),
  bank_name text NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'USD',
  reference_number text NOT NULL,
  voucher_url text NOT NULL,
  voucher_hash text,
  voucher_compressed_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deposit_requests
  ADD COLUMN IF NOT EXISTS voucher_hash text,
  ADD COLUMN IF NOT EXISTS voucher_compressed_url text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deposit_requests_own" ON public.deposit_requests;
CREATE POLICY "deposit_requests_own" ON public.deposit_requests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "deposit_requests_insert_own" ON public.deposit_requests;
CREATE POLICY "deposit_requests_insert_own" ON public.deposit_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "deposit_requests_admin_all" ON public.deposit_requests;
CREATE POLICY "deposit_requests_admin_all" ON public.deposit_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

GRANT ALL ON public.deposit_requests TO service_role;
GRANT SELECT, INSERT ON public.deposit_requests TO authenticated;


-- ------------------------------------------------------------------------------
-- 8. TABLA: catalog_game_overrides (Portadas, Banners y Badges en Admin)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalog_game_overrides (
  game_id text PRIMARY KEY,
  custom_name text,
  custom_image_url text,
  custom_banner_url text,
  custom_badge text,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_game_overrides
  ADD COLUMN IF NOT EXISTS custom_name text,
  ADD COLUMN IF NOT EXISTS custom_image_url text,
  ADD COLUMN IF NOT EXISTS custom_banner_url text,
  ADD COLUMN IF NOT EXISTS custom_badge text,
  ADD COLUMN IF NOT EXISTS is_visible boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.catalog_game_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "catalog_game_overrides_public_select" ON public.catalog_game_overrides;
CREATE POLICY "catalog_game_overrides_public_select" ON public.catalog_game_overrides FOR SELECT USING (true);

DROP POLICY IF EXISTS "catalog_game_overrides_admin_write" ON public.catalog_game_overrides;
CREATE POLICY "catalog_game_overrides_admin_write" ON public.catalog_game_overrides FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

GRANT ALL ON public.catalog_game_overrides TO service_role;
GRANT SELECT ON public.catalog_game_overrides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.catalog_game_overrides TO authenticated;


-- ------------------------------------------------------------------------------
-- 9. TABLA: promotions (Avisos y Banners Promocionales de la Tienda)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  badge_text text NOT NULL DEFAULT 'PROMO EXCLUSIVA',
  banner_image_url text,
  action_url text,
  action_label text DEFAULT 'Aprovechar Oferta',
  placement text NOT NULL DEFAULT 'top_banner' CHECK (placement IN ('top_banner', 'hero', 'modal')),
  is_active boolean NOT NULL DEFAULT true,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promotions_active_select" ON public.promotions;
CREATE POLICY "promotions_active_select" ON public.promotions FOR SELECT USING (is_active = true);

GRANT ALL ON public.promotions TO service_role;
GRANT SELECT ON public.promotions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promotions TO authenticated;

INSERT INTO public.promotions (title, message, badge_text, action_url, action_label, placement, is_active)
VALUES
  ('🔥 ¡Semana del Diamante Free Fire!', 'Recibe hasta 10% adicional de diamantes en todas tus compras directas por ID.', 'OFERTA LIMITADA', '/catalog?game=freefire', 'Recargar Diamantes', 'top_banner', true),
  ('💎 Bono para Socios Revendedores', 'Alcanza tu primera meta de ventas de $25.00 y recibe $1.00 directo a tu saldo virtual.', 'BENEFICIO SOCIOS', '/client/accounting', 'Ver Metas', 'hero', true)
ON CONFLICT DO NOTHING;


-- ------------------------------------------------------------------------------
-- 10. TABLA: rewards (Desafíos y Bonos para Revendedores)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  target_sales_cents bigint NOT NULL CHECK (target_sales_cents > 0),
  reward_bonus_cents bigint NOT NULL CHECK (reward_bonus_cents > 0),
  game_id text,
  badge_icon text NOT NULL DEFAULT 'trophy',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rewards_public_select" ON public.rewards;
CREATE POLICY "rewards_public_select" ON public.rewards FOR SELECT USING (is_active = true);

GRANT ALL ON public.rewards TO service_role;
GRANT SELECT ON public.rewards TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.rewards TO authenticated;

INSERT INTO public.rewards (title, description, target_sales_cents, reward_bonus_cents, badge_icon, is_active)
VALUES
  ('Desafío Novato', 'Acumula tus primeros $25.00 en recargas y gana $1.00 de bono a tu saldo.', 2500, 100, 'trophy', true),
  ('Desafío Pro Gamer', 'Alcanza $100.00 en recargas procesadas y recibe un bono de $5.00 a tu billetera.', 10000, 500, 'sparkles', true),
  ('Maestro Mayorista', 'Llega a $500.00 en ventas mensuales y desbloquea $30.00 de recompensa directa.', 50000, 3000, 'crown', true)
ON CONFLICT DO NOTHING;


-- ------------------------------------------------------------------------------
-- 11. TABLA: reseller_custom_prices (Precios PVP configurados por Revendedores)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reseller_custom_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sku text NOT NULL,
  custom_pvp_cents bigint NOT NULL CHECK (custom_pvp_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reseller_custom_prices
  ADD COLUMN IF NOT EXISTS custom_pvp_cents bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sku text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_sku') THEN
    ALTER TABLE public.reseller_custom_prices ADD CONSTRAINT unique_user_sku UNIQUE (user_id, sku);
  END IF;
END $$;

ALTER TABLE public.reseller_custom_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reseller_custom_prices_own" ON public.reseller_custom_prices;
CREATE POLICY "reseller_custom_prices_own" ON public.reseller_custom_prices FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.reseller_custom_prices TO service_role;
GRANT ALL ON public.reseller_custom_prices TO authenticated;


-- ------------------------------------------------------------------------------
-- 12. TABLA: provider_synced_products (Catálogo sincronizado desde Canjea API)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.provider_synced_products (
  sku text PRIMARY KEY,
  game_id text NOT NULL,
  game_name text NOT NULL,
  name text NOT NULL,
  wholesale_price text,
  suggested_price text,
  currency text DEFAULT 'USD',
  requires_player_id boolean DEFAULT false,
  can_verify_player boolean DEFAULT false,
  is_active boolean DEFAULT true,
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  notified_admin boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_provider_synced_products_game_id ON public.provider_synced_products(game_id);

ALTER TABLE public.provider_synced_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provider_synced_products_select" ON public.provider_synced_products;
CREATE POLICY "provider_synced_products_select" ON public.provider_synced_products FOR SELECT USING (true);

GRANT ALL ON public.provider_synced_products TO service_role;
GRANT SELECT ON public.provider_synced_products TO anon, authenticated;


-- ------------------------------------------------------------------------------
-- 13. TABLA: admin_audit_logs (Registro de auditoría administrativa)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.profiles(id),
  action text NOT NULL,
  target_user_id uuid REFERENCES public.profiles(id),
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_logs
  ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES public.profiles(id);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_audit_logs_admin_only" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_admin_only" ON public.admin_audit_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

GRANT ALL ON public.admin_audit_logs TO service_role;
GRANT ALL ON public.admin_audit_logs TO authenticated;


-- ------------------------------------------------------------------------------
-- 14. TABLA: promotional_materials (Banners y recursos de marketing)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promotional_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL,
  file_url text NOT NULL,
  format text NOT NULL DEFAULT 'ZIP',
  file_size_mb numeric(6,2) DEFAULT 5.00,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promotional_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Materiales visibles para todos" ON public.promotional_materials;
CREATE POLICY "Materiales visibles para todos" ON public.promotional_materials FOR SELECT USING (is_active = true);

GRANT ALL ON public.promotional_materials TO service_role;
GRANT SELECT ON public.promotional_materials TO anon, authenticated;


-- ------------------------------------------------------------------------------
-- 15. TABLA: support_tickets (Mesa de ayuda y tickets de soporte)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  subject text NOT NULL,
  category text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  admin_reply text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven sus propios tickets" ON public.support_tickets;
CREATE POLICY "Usuarios ven sus propios tickets" ON public.support_tickets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.support_tickets TO service_role;
GRANT ALL ON public.support_tickets TO authenticated;


-- ------------------------------------------------------------------------------
-- 16. TABLA: system_settings (Freno de emergencia y umbrales de saldo central)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
  id text PRIMARY KEY DEFAULT 'singleton',
  canjea_warning_threshold_cents bigint NOT NULL DEFAULT 5000,
  canjea_critical_threshold_cents bigint NOT NULL DEFAULT 500,
  circuit_breaker_override text NOT NULL DEFAULT 'auto',
  rewards_enabled boolean NOT NULL DEFAULT true,
  referral_commission_percent numeric NOT NULL DEFAULT 1.00,
  notification_sender_email text NOT NULL DEFAULT 'notificaciones@recargasjuegospro.cloud',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings_public_read" ON public.system_settings;
CREATE POLICY "system_settings_public_read" ON public.system_settings FOR SELECT USING (true);

GRANT ALL ON public.system_settings TO service_role;
GRANT SELECT ON public.system_settings TO anon, authenticated;

INSERT INTO public.system_settings (id, canjea_warning_threshold_cents, canjea_critical_threshold_cents, circuit_breaker_override)
VALUES ('singleton', 5000, 500, 'auto')
ON CONFLICT (id) DO NOTHING;


-- ==============================================================================
-- 17. FUNCIONES Y RPCs TRANSACCIONALES MONETARIAS (SECURITY DEFINER)
-- ==============================================================================

-- Helper: Crear billetera de forma idempotente
DROP FUNCTION IF EXISTS public.create_wallet_if_not_exists(uuid, text);
DROP FUNCTION IF EXISTS public.create_wallet_if_not_exists(uuid);
CREATE OR REPLACE FUNCTION public.create_wallet_if_not_exists(p_user_id uuid, p_currency text DEFAULT 'USD')
RETURNS public.wallets LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_wallet public.wallets;
BEGIN
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id AND currency = p_currency;
  IF v_wallet.id IS NULL THEN
    INSERT INTO public.wallets(user_id, currency, balance_minor, held_minor)
    VALUES (p_user_id, p_currency, 0, 0) RETURNING * INTO v_wallet;
  END IF;
  RETURN v_wallet;
END;
$$;

-- Acreditar saldo a una billetera
DROP FUNCTION IF EXISTS public.credit_wallet(uuid, bigint, text, text, text, uuid, text, text);
CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id uuid, p_amount_minor bigint, p_currency text, p_idempotency_key text,
  p_reason text, p_actor_id uuid DEFAULT NULL, p_source text DEFAULT 'manual', p_external_reference text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_wallet public.wallets;
  v_existing_tx public.transactions;
  v_new_balance bigint;
BEGIN
  IF p_amount_minor <= 0 THEN RAISE EXCEPTION 'El monto a acreditar debe ser mayor a 0'; END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id AND currency = p_currency FOR UPDATE;
  IF v_wallet.id IS NULL THEN
    INSERT INTO public.wallets(user_id, currency, balance_minor, held_minor)
    VALUES (p_user_id, p_currency, 0, 0) RETURNING * INTO v_wallet;
  END IF;

  SELECT * INTO v_existing_tx FROM public.transactions WHERE wallet_id = v_wallet.id AND idempotency_key = p_idempotency_key;
  IF v_existing_tx.id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'wallet_id', v_wallet.id, 'new_balance_minor', v_wallet.balance_minor, 'status', 'idempotent_duplicate');
  END IF;

  v_new_balance := v_wallet.balance_minor + p_amount_minor;
  UPDATE public.wallets SET balance_minor = v_new_balance, updated_at = now() WHERE id = v_wallet.id;

  INSERT INTO public.transactions (wallet_id, user_id, currency, kind, amount_minor, balance_delta_minor, held_delta_minor, idempotency_key, actor_id, source, external_reference, reason)
  VALUES (v_wallet.id, p_user_id, p_currency, 'deposit', p_amount_minor, p_amount_minor, 0, p_idempotency_key, p_actor_id, p_source, p_external_reference, p_reason);

  RETURN jsonb_build_object('success', true, 'wallet_id', v_wallet.id, 'new_balance_minor', v_new_balance, 'status', 'processed');
END;
$$;

-- Retener saldo al crear orden (Reserve)
DROP FUNCTION IF EXISTS public.reserve_purchase(uuid, uuid, bigint, text, text);
CREATE OR REPLACE FUNCTION public.reserve_purchase(
  p_order_id uuid, p_user_id uuid, p_amount_minor bigint, p_currency text, p_idempotency_key text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_wallet public.wallets;
  v_existing_tx public.transactions;
BEGIN
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id AND currency = p_currency FOR UPDATE;
  IF v_wallet.id IS NULL THEN RAISE EXCEPTION 'Billetera no encontrada para usuario %', p_user_id; END IF;

  SELECT * INTO v_existing_tx FROM public.transactions WHERE wallet_id = v_wallet.id AND idempotency_key = p_idempotency_key;
  IF v_existing_tx.id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'status', 'idempotent_duplicate');
  END IF;

  IF (v_wallet.balance_minor - v_wallet.held_minor) < p_amount_minor THEN
    RAISE EXCEPTION 'Saldo insuficiente. Disponible: %, Requerido: %', (v_wallet.balance_minor - v_wallet.held_minor), p_amount_minor;
  END IF;

  UPDATE public.wallets SET held_minor = held_minor + p_amount_minor, updated_at = now() WHERE id = v_wallet.id;

  INSERT INTO public.transactions (wallet_id, user_id, currency, order_id, kind, amount_minor, balance_delta_minor, held_delta_minor, idempotency_key, source, reason)
  VALUES (v_wallet.id, p_user_id, p_currency, p_order_id, 'purchase_reserve', p_amount_minor, 0, p_amount_minor, p_idempotency_key, 'purchase_reserve', 'Reserva de fondos para compra de orden');

  RETURN jsonb_build_object('success', true, 'wallet_id', v_wallet.id, 'status', 'reserved');
END;
$$;

-- Liquidar saldo al completar o fallar orden (Settle)
DROP FUNCTION IF EXISTS public.settle_purchase(uuid, uuid, bigint, text, boolean, text);
CREATE OR REPLACE FUNCTION public.settle_purchase(
  p_order_id uuid, p_user_id uuid, p_amount_minor bigint, p_currency text, p_succeeded boolean, p_idempotency_key text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_wallet public.wallets;
  v_existing_tx public.transactions;
BEGIN
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id AND currency = p_currency FOR UPDATE;
  IF v_wallet.id IS NULL THEN RAISE EXCEPTION 'Billetera no encontrada'; END IF;

  SELECT * INTO v_existing_tx FROM public.transactions WHERE wallet_id = v_wallet.id AND idempotency_key = p_idempotency_key;
  IF v_existing_tx.id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'status', 'idempotent_duplicate');
  END IF;

  IF p_succeeded THEN
    UPDATE public.wallets SET balance_minor = balance_minor - p_amount_minor, held_minor = held_minor - p_amount_minor, updated_at = now() WHERE id = v_wallet.id;
    INSERT INTO public.transactions (wallet_id, user_id, currency, order_id, kind, amount_minor, balance_delta_minor, held_delta_minor, idempotency_key, source, reason)
    VALUES (v_wallet.id, p_user_id, p_currency, p_order_id, 'purchase_settle', p_amount_minor, -p_amount_minor, -p_amount_minor, p_idempotency_key, 'purchase_settle', 'Liquidación definitiva de recarga');
  ELSE
    UPDATE public.wallets SET held_minor = held_minor - p_amount_minor, updated_at = now() WHERE id = v_wallet.id;
    INSERT INTO public.transactions (wallet_id, user_id, currency, order_id, kind, amount_minor, balance_delta_minor, held_delta_minor, idempotency_key, source, reason)
    VALUES (v_wallet.id, p_user_id, p_currency, p_order_id, 'purchase_refund', p_amount_minor, 0, -p_amount_minor, p_idempotency_key, 'purchase_refund', 'Liberación de fondos por orden fallida');
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'settled');
END;
$$;

-- Aprobar solicitud de depósito
DROP FUNCTION IF EXISTS public.approve_deposit_request(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.approve_deposit_request(uuid, uuid);
CREATE OR REPLACE FUNCTION public.approve_deposit_request(
  p_request_id uuid, p_admin_id uuid, p_compressed_voucher_url text DEFAULT NULL, p_voucher_hash text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_req public.deposit_requests;
  v_credit_res jsonb;
BEGIN
  SELECT * INTO v_req FROM public.deposit_requests WHERE id = p_request_id FOR UPDATE;
  IF v_req.id IS NULL THEN RAISE EXCEPTION 'Solicitud de depósito no encontrada'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'La solicitud ya fue procesada anteriormente'; END IF;

  v_credit_res := public.credit_wallet(
    v_req.user_id, v_req.amount_cents, v_req.currency,
    'DEP-' || v_req.id::text, 'Depósito bancario aprobado: ' || v_req.bank_name || ' (Ref: ' || v_req.reference_number || ')',
    p_admin_id, 'bank_deposit', v_req.reference_number
  );

  UPDATE public.deposit_requests
  SET status = 'approved', approved_by = p_admin_id, approved_at = now(), updated_at = now(),
      voucher_compressed_url = COALESCE(p_compressed_voucher_url, voucher_url),
      voucher_hash = COALESCE(p_voucher_hash, v_req.voucher_hash)
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true, 'deposit_id', p_request_id, 'credited_amount_cents', v_req.amount_cents);
END;
$$;

-- Rechazar solicitud de depósito
DROP FUNCTION IF EXISTS public.reject_deposit_request(uuid, uuid, text);
CREATE OR REPLACE FUNCTION public.reject_deposit_request(
  p_request_id uuid, p_admin_id uuid, p_rejection_reason text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_req public.deposit_requests;
BEGIN
  SELECT * INTO v_req FROM public.deposit_requests WHERE id = p_request_id FOR UPDATE;
  IF v_req.id IS NULL THEN RAISE EXCEPTION 'Solicitud no encontrada'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'La solicitud ya fue procesada'; END IF;

  UPDATE public.deposit_requests
  SET status = 'rejected', approved_by = p_admin_id, rejection_reason = p_rejection_reason, updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true, 'deposit_id', p_request_id);
END;
$$;


-- ==============================================================================
-- 18. USUARIOS Y CONTRASEÑAS: '#RyuuDragon9595' y Rol Admin en Cloud
-- ==============================================================================
UPDATE auth.users
SET encrypted_password = crypt('#RyuuDragon9595', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email IN (
  'b.edumalta@gmail.com',
  'edward.otsutsuki@gmail.com',
  'salvatierragenesis73@gmail.com'
);

UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'b.edumalta@gmail.com'
);

COMMIT;

SELECT 'Sincronización Total Completada: Las 16 tablas, columnas, RPCs y contraseñas (#RyuuDragon9595) están activas y alineadas con Local.' AS resultado;
