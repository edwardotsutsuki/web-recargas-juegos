-- =========================================================================
-- VERIFICACIÓN Y ASEGURAMIENTO EN SUPABASE: PRECIOS PVP Y TERMINAL STAFF
-- Este script es 100% idempotente (se puede ejecutar sin riesgo varias veces)
-- =========================================================================

BEGIN;

-- 1. Tabla de Precios Personalizados (PVP del Revendedor)
CREATE TABLE IF NOT EXISTS public.reseller_custom_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    custom_pvp_cents BIGINT NOT NULL CHECK (custom_pvp_cents >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_sku UNIQUE (user_id, sku)
);

-- Índice para acelerar la consulta de precios por tienda/revendedor
CREATE INDEX IF NOT EXISTS idx_reseller_prices_user 
ON public.reseller_custom_prices(user_id);

-- Habilitar RLS en precios
ALTER TABLE public.reseller_custom_prices ENABLE ROW LEVEL SECURITY;

-- Política de RLS: el revendedor puede gestionar sus precios
DROP POLICY IF EXISTS "Revendedores gestionan sus propios precios PVP" ON public.reseller_custom_prices;
CREATE POLICY "Revendedores gestionan sus propios precios PVP"
    ON public.reseller_custom_prices
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Permisos explícitos para el API (service_role) y usuarios autenticados
GRANT ALL ON public.reseller_custom_prices TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reseller_custom_prices TO authenticated;

-- 2. Asegurar campos de Local, PIN y Staff
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store_slug TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS master_pin TEXT DEFAULT '1234';

-- Sincronizar email de auth.users a profiles si falta
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- Índice único para el identificador de tienda
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_store_slug_lower 
ON public.profiles(LOWER(store_slug)) 
WHERE store_slug IS NOT NULL;

-- 3. Asegurar campo operator_name en orders para auditoría de cajeros
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS operator_name TEXT;

-- 4. Asegurar tabla de personal / cajeros
CREATE TABLE IF NOT EXISTS public.reseller_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reseller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    operator_name TEXT NOT NULL,
    pin_code TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cashier',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_reseller_operator UNIQUE (reseller_id, operator_name)
);

ALTER TABLE public.reseller_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reseller_staff_owner_policy" ON public.reseller_staff;
CREATE POLICY "reseller_staff_owner_policy" ON public.reseller_staff
    FOR ALL
    USING (auth.uid() = reseller_id)
    WITH CHECK (auth.uid() = reseller_id);

GRANT ALL ON public.reseller_staff TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reseller_staff TO authenticated;

COMMIT;
