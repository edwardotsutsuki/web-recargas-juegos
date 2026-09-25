-- ==============================================================================
-- FIX RLS RECURSION & ADMIN PERMISSIONS
-- Proyecto: recargas-juegos-pro (pemkocaufntsbicnzziz.supabase.co)
-- ==============================================================================

-- 1. Eliminar políticas con recursión infinita en profiles
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_edit_own" ON public.profiles;

-- 2. Asegurar función is_admin con SECURITY DEFINER (ejecuta sin RLS interno)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- 3. Crear políticas limpias sin bucles en public.profiles
CREATE POLICY "profiles_select_clean" ON public.profiles
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "profiles_update_clean" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_admin_clean" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Actualizar políticas en tablas administrativas para usar is_admin() seguro
DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
CREATE POLICY "orders_admin_all" ON public.orders
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "deposit_requests_admin_all" ON public.deposit_requests;
CREATE POLICY "deposit_requests_admin_all" ON public.deposit_requests
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin gestiona catalog overrides" ON public.catalog_game_overrides;
DROP POLICY IF EXISTS "catalog_overrides_admin" ON public.catalog_game_overrides;
CREATE POLICY "catalog_overrides_admin" ON public.catalog_game_overrides
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_audit_logs_admin_only" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "admin_audit_logs_admin" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_admin" ON public.admin_audit_logs
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. Asegurar permisos de lectura en profiles para anon y authenticated
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
