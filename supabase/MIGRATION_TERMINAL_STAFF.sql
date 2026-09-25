-- =========================================================================
-- MIGRACIÓN: TERMINAL POS MULTI-OPERADOR (LOCAL, CAJEROS Y PIN)
-- =========================================================================

-- 1. Asegurar columna email en profiles si no existe y sincronizar desde auth.users
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- 2. Identificador de Local / Tienda y PIN Maestro en profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store_slug TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS master_pin TEXT DEFAULT '1234';

-- Crear índice único insensible a mayúsculas para el nombre de local
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_store_slug_lower 
ON public.profiles(LOWER(store_slug)) 
WHERE store_slug IS NOT NULL;

-- 3. Atribución de Operador / Cajero en la tabla de órdenes
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS operator_name TEXT;

-- 4. Tabla de Cajeros / Personal del Revendedor
CREATE TABLE IF NOT EXISTS public.reseller_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reseller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    operator_name TEXT NOT NULL,
    pin_code TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cashier', -- 'cashier' (cajero) | 'admin' (encargado)
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_reseller_operator UNIQUE (reseller_id, operator_name)
);

-- Habilitar RLS en reseller_staff
ALTER TABLE public.reseller_staff ENABLE ROW LEVEL SECURITY;

-- Política de RLS para que el dueño gestione su propio personal
DROP POLICY IF EXISTS "reseller_staff_owner_policy" ON public.reseller_staff;
CREATE POLICY "reseller_staff_owner_policy" ON public.reseller_staff
    FOR ALL
    USING (auth.uid() = reseller_id)
    WITH CHECK (auth.uid() = reseller_id);

-- 5. Sembrar slug por defecto 'ryuu' y pin '1234' para la cuenta principal del dueño
UPDATE public.profiles 
SET store_slug = 'ryuu', master_pin = '1234'
WHERE id IN (SELECT id FROM auth.users WHERE email = 'b.edumalta@gmail.com');
