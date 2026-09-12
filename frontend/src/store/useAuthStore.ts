import { create } from 'zustand';
import { supabase } from '../services/supabase/client';
import { UserProfile, UserRole } from '../types';

interface AuthStore {
  user: UserProfile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialize: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
  setRole: (role: UserRole) => void;
  logout: () => Promise<void>;
  toggleDevRole: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  role: 'client',
  isAuthenticated: false,
  isLoading: true,

  initialize: async () => {
    try {
      set({ isLoading: true });
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Fetch user profile from 'profiles' table to get current DB role
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        const role: UserRole = (profile?.role as UserRole) || 'client';

        set({
          user: {
            id: session.user.id,
            email: session.user.email || '',
            role,
            fullName: profile?.full_name || session.user.user_metadata?.full_name || '',
          },
          role,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({
          user: null,
          role: 'client',
          isAuthenticated: false,
          isLoading: false,
        });
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          const role: UserRole = (profile?.role as UserRole) || 'client';

          set({
            user: {
              id: session.user.id,
              email: session.user.email || '',
              role,
              fullName: profile?.full_name || session.user.user_metadata?.full_name || '',
            },
            role,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          set({
            user: null,
            role: 'client',
            isAuthenticated: false,
            isLoading: false,
          });
        }
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

  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
    }
    set({
      user: null,
      role: 'client',
      isAuthenticated: false,
      isLoading: false,
    });
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

