import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

export const isSupabaseConfigured =
  Boolean(process.env.SUPABASE_URL) &&
  process.env.SUPABASE_URL !== 'https://your-project.supabase.co' &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
  process.env.SUPABASE_SERVICE_ROLE_KEY !== 'replace-me-server-only';

// Cliente administrativo con service_role para ejecutar RPCs transaccionales
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

