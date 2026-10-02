import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://pemkocaufntsbicnzziz.supabase.co';
const defaultAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlbWtvY2F1Zm50c2JpY256eml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNzY2MzksImV4cCI6MjEwNDc1MjYzOX0.tgNwCFF7hs78zMHfN0veAU3fJnLtBWJwx1ZQjxOjr00';

export function resolveSupabaseUrl(): string {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  // Si la variable de entorno está definida y NO es el emulador inactivo 54321, úsala
  if (envUrl && !envUrl.includes('54321')) {
    return envUrl;
  }

  // Por defecto, tanto en desarrollo local como en producción oficial,
  // nos conectamos directamente a la nube oficial de Supabase
  return defaultUrl;
}

const supabaseUrl = resolveSupabaseUrl();

const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseAnonKey = (envAnonKey && !envAnonKey.includes('supabase-demo'))
  ? envAnonKey
  : defaultAnonKey;

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

