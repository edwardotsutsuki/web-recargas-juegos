import { Capacitor } from '@capacitor/core';
import { supabase } from '../supabase/client';
import { useAuthStore } from '../../store/useAuthStore';

// Resolver URL del Backend de forma dinámica según el entorno (Dominio Cloudflare, Localhost o APK)
export function resolveBackendUrl(): string {
  // CRÍTICO: En app nativa Capacitor (Android/iOS), conectar siempre al backend público oficial por túnel Cloudflare
  // (En Android WebView el hostname es 'localhost', por lo que esta comprobación debe ir PRIMERO)
  if (Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios') {
    return 'https://api.recargasjuegospro.cloud';
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Dominio oficial de producción vía túnel Cloudflare
    if (hostname.includes('recargasjuegospro.cloud')) {
      return 'https://api.recargasjuegospro.cloud';
    }
    // Navegador en localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
    // Red local directa por IP (ej: 192.168.x.x)
    if (/^(192\.168\.|10\.|172\.)/.test(hostname)) {
      return `http://${hostname}:3000`;
    }
  }

  return import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
}

export const BACKEND_URL = resolveBackendUrl();

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

export class ApiError extends Error {
  code: string;
  status: number;
  requestId?: string;

  constructor(status: number, code: string, message: string, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

interface RequestOptions extends RequestInit {
  idempotencyKey?: string;
}

/**
 * Centralized fetch client that injects Supabase JWT and handles uniform errors.
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { idempotencyKey, headers = {}, ...customConfig } = options;

  // Retrieve current session token from Supabase
  let { data: sessionData } = await supabase.auth.getSession();
  let token = sessionData?.session?.access_token;

  // Auto-refresh si el token está por expirar (dentro de los próximos 60s) o ya expiró
  if (sessionData?.session?.expires_at) {
    const isExpiring = Date.now() >= sessionData.session.expires_at * 1000 - 60000;
    if (isExpiring) {
      try {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed?.session?.access_token) {
          token = refreshed.session.access_token;
        }
      } catch (err) {
        console.warn('[ApiClient] No se pudo auto-refrescar la sesión:', err);
      }
    }
  }

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  } else if (import.meta.env.DEV) {
    // En entorno de desarrollo o prueba local sin sesión persistida de Supabase:
    const currentRole = useAuthStore.getState().role;
    requestHeaders['Authorization'] = currentRole === 'admin' ? 'Bearer dev-admin-token' : 'Bearer dev-client-token';
  }

  if (idempotencyKey) {
    requestHeaders['Idempotency-Key'] = idempotencyKey;
  }

  const baseUrl = resolveBackendUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  try {
    let response = await fetch(url, {
      ...customConfig,
      headers: requestHeaders,
    });

    // Si recibimos 401 (token expirado en vuelo), intentar refrescar una vez y reintentar
    if (response.status === 401) {
      try {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed?.session?.access_token) {
          requestHeaders['Authorization'] = `Bearer ${refreshed.session.access_token}`;
          response = await fetch(url, {
            ...customConfig,
            headers: requestHeaders,
          });
        }
      } catch {
        // Falló refresco
      }
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorData = data as ApiErrorResponse | null;
      throw new ApiError(
        response.status,
        errorData?.error?.code || 'UNKNOWN_ERROR',
        errorData?.error?.message || `Error en la solicitud HTTP (${response.status})`,
        errorData?.error?.requestId
      );
    }

    return data as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network or parser error
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      err.message || 'No se pudo conectar con el servidor backend.'
    );
  }
}
