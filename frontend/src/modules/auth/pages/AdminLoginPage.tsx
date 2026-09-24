import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, KeyRound, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../../services/supabase/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { useUIStore } from '../../../store/useUIStore';
import { apiClient } from '../../../services/api/client';

export const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { setUser, setRole } = useAuthStore();
  const { showToast } = useUIStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isSupabaseConfigured) {
        // Step 1: Standard Password Sign In
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;

        if (!data.user) {
          throw new Error('No se pudo verificar la cuenta de usuario.');
        }

        // Step 2: Check role in profiles
        let { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError || !profile) {
          console.warn('Perfil no encontrado directamente por RLS, verificando metadatos...', profileError);
          if (data.user.email === 'b.edumalta@gmail.com') {
            profile = {
              id: data.user.id,
              role: 'admin',
              full_name: data.user.user_metadata?.full_name || 'Super Admin (Edward Malta)',
              two_factor_enabled: false,
              created_at: new Date().toISOString(),
            } as any;
          } else {
            await supabase.auth.signOut();
            throw new Error('Perfil de usuario no encontrado en la base de datos.');
          }
        }

        if (profile.role !== 'admin' && data.user.email !== 'b.edumalta@gmail.com') {
          await supabase.auth.signOut();
          throw new Error('Acceso denegado: Esta cuenta no posee privilegios de administrador del sistema.');
        }

        // Step 3: Check 2FA requirement
        if (profile.two_factor_enabled && !totpCode) {
          setRequires2FA(true);
          setIsLoading(false);
          return;
        }

        if (profile.two_factor_enabled && totpCode) {
          // Verify TOTP token via backend API
          const verifyRes = await apiClient<{ success: boolean; message?: string }>('/auth/2fa/verify', {
            method: 'POST',
            body: JSON.stringify({ token: totpCode, userId: data.user.id }),
          });

          if (!verifyRes.success) {
            throw new Error('Código de autenticación 2FA incorrecto o expirado.');
          }
        }

        setUser({
          id: data.user.id,
          email: data.user.email || email,
          role: 'admin',
          fullName: profile.full_name || 'Super Admin',
        });
        setRole('admin');
        showToast('¡Bienvenido al Centro de Control de Administración!', 'success');
        navigate('/sys-admin-auth');
      } else {
        // Modo local sin Supabase
        if (email !== 'b.edumalta@gmail.com') {
          throw new Error('Solo el super admin (b.edumalta@gmail.com) puede ingresar al panel de control.');
        }
        setUser({
          id: '00000000-0000-0000-0000-000000000001',
          email: 'b.edumalta@gmail.com',
          role: 'admin',
          fullName: 'Super Admin (Edward Malta)',
        });
        setRole('admin');
        showToast('Acceso administrativo concedido (Modo Local)', 'success');
        navigate('/sys-admin-auth');
      }
    } catch (err: any) {
      setTotpCode('');
      setError(err.message || 'Error durante la autenticación de administrador.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#05070c] p-4 text-slate-100 relative overflow-hidden">
      {/* Background glow & grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6 backdrop-blur-xl">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-4 ring-indigo-500/10">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white uppercase font-['Rajdhani']">
                Recargas Juegos Online
              </h1>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase">
                Admin Console
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Portal Exclusivo de Operaciones y Seguridad
            </p>
          </div>
        </div>

        {/* Security Alert / Notice */}
        <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-start gap-3">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
            <KeyRound className="w-3.5 h-3.5" />
          </div>
          <div className="text-[11px] text-slate-400 leading-relaxed">
            Área restringida. Todos los accesos, intentos y transacciones son registrados en la auditoría de seguridad del sistema.
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-red-950/40 border border-red-500/40 rounded-2xl flex items-start gap-2.5 text-xs text-red-300">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Correo Electrónico de Administrador
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                disabled={requires2FA}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="b.edumalta@gmail.com"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Contraseña de Acceso
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                disabled={requires2FA}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-60"
              />
            </div>
          </div>

          {requires2FA && (
            <div className="p-4 bg-indigo-950/30 border border-indigo-500/40 rounded-2xl space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                <span>Verificación de Dos Pasos (2FA)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Ingresa el código de 6 dígitos generado por tu aplicación autenticadora (Google Authenticator, Authy, etc.):
              </p>
              <input
                type="text"
                required
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
                className="w-full bg-slate-950 border border-indigo-500/50 rounded-xl px-4 py-2.5 text-center text-lg font-mono tracking-widest text-white focus:outline-none focus:border-indigo-400"
              />
            </div>
          )}

          <div className="space-y-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? 'Verificando credenciales...' : requires2FA ? 'Confirmar Código 2FA' : 'Acceder al Panel Admin'}
            </button>

            {requires2FA && (
              <button
                type="button"
                onClick={async () => {
                  setRequires2FA(false);
                  setTotpCode('');
                  setError(null);
                  if (isSupabaseConfigured) {
                    await supabase.auth.signOut().catch(() => {});
                  }
                }}
                className="w-full py-2 text-center text-xs text-slate-400 hover:text-white transition-colors"
              >
                Volver a ingresar correo o contraseña
              </button>
            )}
          </div>
        </form>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span className="text-[11px] text-slate-500">Portal de Acceso Restringido</span>
          <span className="font-mono text-[10px] text-slate-600">v2.1-SEC</span>
        </div>
      </div>
    </div>
  );
};
