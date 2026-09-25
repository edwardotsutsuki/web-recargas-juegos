-- ============================================================
-- FIX: Panel Admin - Error "column email does not exist"
-- ============================================================
-- PROBLEMA: La tabla public.profiles NO contiene columna "email".
-- El email vive en auth.users. Algunos servicios del backend
-- intentaban leer profiles.email directamente → ERROR 42703.
--
-- SOLUCIÓN: Agregar columna email a profiles y mantenerla
-- sincronizada con auth.users via trigger.
--
-- EJECUTAR EN: Supabase SQL Editor (una sola vez)
-- ============================================================

BEGIN;

-- 1. Agregar columna email a profiles (si no existe)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

-- 2. Rellenar el email actual para todos los perfiles existentes
UPDATE public.profiles p
SET    email = u.email
FROM   auth.users u
WHERE  p.id = u.id
  AND  p.email IS NULL;

-- 3. Trigger: mantener profiles.email sincronizado cuando
--    se actualiza auth.users (ej: cambio de email)
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET    email = NEW.email
  WHERE  id = NEW.id;
  RETURN NEW;
END;
$$;

-- Eliminar trigger previo si existe
DROP TRIGGER IF EXISTS on_auth_user_email_change ON auth.users;

-- Crear trigger que sincroniza el email al actualizar auth.users
CREATE TRIGGER on_auth_user_email_change
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.sync_profile_email();

-- 4. También sincronizar en INSERT (cuando se crea un nuevo usuario)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, email)
  VALUES (NEW.id, 'client', NEW.email)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

-- Reemplazar trigger de creación de usuario (si existe uno previo)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Asegurar grants correctos en profiles para service_role
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT ON public.profiles TO authenticated;

COMMIT;

-- Verificar resultado:
SELECT id, email, role FROM public.profiles LIMIT 10;
