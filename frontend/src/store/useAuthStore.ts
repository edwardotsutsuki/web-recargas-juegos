import { create } from 'zustand';
import { supabase } from '../services/supabase/client';
import { UserProfile, UserRole } from '../types';
import { useWalletStore } from './useWalletStore';
import { useCartStore } from './useCartStore';
import { useCashierStore } from './useCashierStore';

interface AuthStore {
  user: UserProfile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  operatorName: string | null;
  isCashier: boolean;
  storeSlug: string | null;
  initialize: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
  setRole: (role: UserRole) => void;
  setTerminalSession: (data: {
    user: UserProfile;
    token: string;
    operatorName: string;
    isCashier: boolean;
    storeSlug: string;
  }) => void;
  clearTerminalSession: () => void;
  logout: () => Promise<void>;
  toggleDevRole: () => void;
}

let isInitialized = false;

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  role: 'client',
  isAuthenticated: false,
  isLoading: true,
  operatorName: null,
  isCashier: false,
  storeSlug: null,

  initialize: async () => {
    // Si ya inicializó el listener de Supabase, solo refrescar la sesión actual
    if (isInitialized) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          set({ user: null, role: 'client', isAuthenticated: false, isLoading: false });
        }
      } catch {
        set({ user: null, role: 'client', isAuthenticated: false, isLoading: false });
      }
      return;
    }

    isInitialized = true;

    try {
      set({ isLoading: true });
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Limpiar sesión de terminal POS si hay sesión oficial de Supabase
        localStorage.removeItem('recargas_terminal_token');
        localStorage.removeItem('recargas_terminal_session');

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role, full_name, phone, referral_code, two_factor_enabled, created_at')
          .eq('id', session.user.id)
          .single();

        const role: UserRole = (profile?.role as UserRole) || (session.user.email === 'b.edumalta@gmail.com' ? 'admin' : 'client');

        set({
          user: {
            id: session.user.id,
            email: session.user.email || '',
            role,
            fullName: profile?.full_name || session.user.user_metadata?.full_name || (session.user.email === 'b.edumalta@gmail.com' ? 'Super Admin' : ''),
          },
          role,
          isAuthenticated: true,
          operatorName: null,
          isCashier: false,
          storeSlug: null,
          isLoading: false,
        });
      } else {
        // Comprobar si hay sesión persistida de Terminal POS (Cajero o Dueño)
        const termToken = typeof localStorage !== 'undefined' ? localStorage.getItem('recargas_terminal_token') : null;
        const termSessionStr = typeof localStorage !== 'undefined' ? localStorage.getItem('recargas_terminal_session') : null;

        if (termToken && termSessionStr) {
          try {
            const term = JSON.parse(termSessionStr);
            set({
              user: term.user,
              role: term.user.role || 'client',
              isAuthenticated: true,
              operatorName: term.operatorName,
              isCashier: term.isCashier === true,
              storeSlug: term.storeSlug,
              isLoading: false,
            });
            if (term.isCashier) {
              useCashierStore.getState().setCashierMode(true);
            }
            return;
          } catch {
            localStorage.removeItem('recargas_terminal_token');
            localStorage.removeItem('recargas_terminal_session');
          }
        }

        set({
          user: null,
          role: 'client',
          isAuthenticated: false,
          operatorName: null,
          isCashier: false,
          storeSlug: null,
          isLoading: false,
        });
      }

      // Escuchar cambios de autenticación en vivo
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || !session?.user) {
          const termToken = typeof localStorage !== 'undefined' ? localStorage.getItem('recargas_terminal_token') : null;
          if (!termToken) {
            set({
              user: null,
              role: 'client',
              isAuthenticated: false,
              operatorName: null,
              isCashier: false,
              storeSlug: null,
              isLoading: false,
            });
          }
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role, full_name, phone, referral_code, two_factor_enabled, created_at')
          .eq('id', session.user.id)
          .single();

        const role: UserRole = (profile?.role as UserRole) || (session.user.email === 'b.edumalta@gmail.com' ? 'admin' : 'client');

        set({
          user: {
            id: session.user.id,
            email: session.user.email || '',
            role,
            fullName: profile?.full_name || session.user.user_metadata?.full_name || (session.user.email === 'b.edumalta@gmail.com' ? 'Super Admin' : ''),
          },
          role,
          isAuthenticated: true,
          operatorName: null,
          isCashier: false,
          storeSlug: null,
          isLoading: false,
        });
      });
    } catch {
      set({ user: null, role: 'client', isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user) =>
    set({
      user,
      role: user?.role || 'client',
      isAuthenticated: Boolean(user),
      isLoading: false,
    }),

  setRole: (role) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, role }, role });
    } else {
      set({ role });
    }
  },

  setTerminalSession: ({ user, token, operatorName, isCashier, storeSlug }) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('recargas_terminal_token', token);
      localStorage.setItem(
        'recargas_terminal_session',
        JSON.stringify({ user, operatorName, isCashier, storeSlug })
      );
    }
    set({
      user,
      role: user.role || 'client',
      isAuthenticated: true,
      operatorName,
      isCashier,
      storeSlug,
      isLoading: false,
    });
    if (isCashier) {
      useCashierStore.getState().setCashierMode(true);
    } else {
      useCashierStore.getState().setCashierMode(false);
    }
  },

  clearTerminalSession: () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('recargas_terminal_token');
      localStorage.removeItem('recargas_terminal_session');
    }
    useCashierStore.getState().setCashierMode(false);
    set({
      user: null,
      role: 'client',
      isAuthenticated: false,
      operatorName: null,
      isCashier: false,
      storeSlug: null,
    });
  },

  logout: async () => {
    try {
      // 0. Limpiar sesión de terminal POS si existiese
      get().clearTerminalSession();

      // 1. Desconectar y limpiar de raíz los stores en memoria para evitar estados montados
      try {
        useWalletStore.getState().unsubscribeRealtime();
        useWalletStore.setState({
          wallet: {
            currency: 'USD',
            total_balance_cents: 0,
            held_balance_cents: 0,
            available_balance_cents: 0,
          },
          isLoading: false,
        });
        useCartStore.getState().clearCart();
      } catch (err) {
        console.warn('Advertencia limpiando stores:', err);
      }

      // 2. Invocar signOut con un timeout de 1.5s para no congelar la UI si hay lentitud de red
      try {
        await Promise.race([
          supabase.auth.signOut(),
          new Promise((resolve) => setTimeout(resolve, 1500))
        ]);
      } catch (e) {
        console.warn('Advertencia en signOut de Supabase:', e);
      }

      // 3. Limpieza forzada de todo rastro de sesión en el almacenamiento local del navegador
      // Esto garantiza que la sesión NO quede abierta al reabrir el navegador tras cerrarla explícitamente
      if (typeof window !== 'undefined') {
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token') || key.includes('user-storage'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((k) => localStorage.removeItem(k));

          const sessionKeysToRemove: string[] = [];
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token'))) {
              sessionKeysToRemove.push(key);
            }
          }
          sessionKeysToRemove.forEach((k) => sessionStorage.removeItem(k));
        } catch (e) {
          console.error('Error purgando almacenamiento local:', e);
        }
      }

      // 4. Reset del estado del store
      set({
        user: null,
        role: 'client',
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (e) {
      console.error('Error cerrando sesión:', e);
      set({
        user: null,
        role: 'client',
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  toggleDevRole: () => {
    const currentRole = get().role;
    const newRole: UserRole = currentRole === 'admin' ? 'client' : 'admin';
    const newUser = newRole === 'admin'
      ? { id: '00000000-0000-0000-0000-000000000001', email: 'b.edumalta@gmail.com', role: 'admin' as UserRole, fullName: 'Super Admin' }
      : { id: '00000000-0000-0000-0000-000000000002', email: 'edward.otsutsuki@gmail.com', role: 'client' as UserRole, fullName: 'Edward Otsutsuki' };
    set({ user: newUser, role: newRole, isAuthenticated: true, isLoading: false });
  },
}));
