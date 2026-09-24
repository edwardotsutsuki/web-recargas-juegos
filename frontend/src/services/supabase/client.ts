import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

const defaultUrl = 'https://pemkocaufntsbicnzziz.supabase.co';
const defaultAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlbWtvY2F1Zm50c2JpY256eml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNzY2MzksImV4cCI6MjEwNDc1MjYzOX0.tgNwCFF7hs78zMHfN0veAU3fJnLtBWJwx1ZQjxOjr00';

export function resolveSupabaseUrl(): string {
  // Si está definido por variable de entorno, siempre tiene prioridad
  if (import.meta.env.VITE_SUPABASE_URL) {
    return import.meta.env.VITE_SUPABASE_URL;
  }

  // App nativa Capacitor o dominio web oficial
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('recargasjuegospro.cloud') || Capacitor.isNativePlatform()) {
      return 'https://pemkocaufntsbicnzziz.supabase.co';
    }
    // Entorno puramente local de desarrollo
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:54321';
    }
  }

  return defaultUrl;
}

const supabaseUrl = resolveSupabaseUrl();

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultAnonKey;

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

