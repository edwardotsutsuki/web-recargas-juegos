import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

const defaultUrl = 'http://localhost:54321';
const defaultAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

export function resolveSupabaseUrl(): string {
  // CRÍTICO: En app nativa Capacitor (Android/iOS), conectar siempre al dominio público oficial por túnel Cloudflare
  // (En Android WebView el hostname es 'localhost', por lo que esta comprobación debe ir PRIMERO)
  if (Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios') {
    return 'https://supabase.recargasjuegospro.cloud';
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Dominio oficial de producción vía túnel Cloudflare
    if (hostname.includes('recargasjuegospro.cloud')) {
      return 'https://supabase.recargasjuegospro.cloud';
    }
    // Navegador en localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:54321';
    }
    // Red local directa por IP (ej: 192.168.x.x)
    if (/^(192\.168\.|10\.|172\.)/.test(hostname)) {
      return `http://${hostname}:54321`;
    }
  }

  return import.meta.env.VITE_SUPABASE_URL || defaultUrl;
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

