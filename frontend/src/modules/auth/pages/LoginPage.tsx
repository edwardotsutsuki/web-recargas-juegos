import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../../services/supabase/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { Button } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import { Gamepad2, Mail, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useUIStore } from '../../../store/useUIStore';
import { apiClient } from '../../../services/api/client';
import { Capacitor } from '@capacitor/core';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { user, isAuthenticated, setUser } = useAuthStore();
  const { showToast } = useUIStore();

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'admin') {
        navigate('/sys-admin-auth', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (isSupabaseConfigured) {
      try {
        // Limpieza preventiva de sesión local para evitar inicios de sesión montados
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {}

        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (authError) throw authError;

        if (data.user) {
          // Read profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          // Check 2FA requirement
          if (profile?.two_factor_enabled && !totpCode) {
            setRequires2FA(true);
            setIsLoading(false);
            return;
          }

          if (profile?.two_factor_enabled && totpCode) {
            const verifyRes = await apiClient<{ success: boolean; message?: string }>('/auth/2fa/verify', {
              method: 'POST',
              body: JSON.stringify({ token: totpCode, userId: data.user.id }),
            });

            if (!verifyRes.success) {
              throw new Error('Código de autenticación 2FA incorrecto o expirado.');
            }
          }

          const role = profile?.role || 'client';
          setUser({
            id: data.user.id,
            email: data.user.email || '',
            role,
            fullName: profile?.full_name || '',
          });
          showToast('¡Sesión iniciada con éxito!', 'success');
          navigate(role === 'admin' ? '/sys-admin-auth' : '/dashboard');
        }
      } catch (err: any) {
        setTotpCode('');
        setError(err.message || 'Error al iniciar sesión con Supabase.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Local development fallback
      setTimeout(() => {
        setUser({
          id: '00000000-0000-0000-0000-000000000002',
          email: email || 'edward.otsutsuki@gmail.com',
          role: 'client',
          fullName: 'Edward Otsutsuki',
        });
        showToast('Iniciado como cliente revendedor', 'info');
        navigate('/dashboard');
        setIsLoading(false);
      }, 500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080c14] p-4 text-slate-100 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 mx-auto flex items-center justify-center shadow-glow-primary">
            <Gamepad2 className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white font-['Rajdhani'] uppercase tracking-wider">
            Portal de Revendedores
          </h2>
          <p className="text-xs text-slate-400">
            Ingresa a tu cuenta para recargar saldo, comprar pines y gestionar tus ganancias en <span className="text-cyan-400 font-bold">Recargas Juegos Online</span>.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Correo Electrónico"
            type="email"
            placeholder="tu_email@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
            disabled={requires2FA}
            required
          />

          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
            disabled={requires2FA}
            required
          />

          {requires2FA && (
            <div className="p-4 bg-cyan-950/40 border border-cyan-500/40 rounded-2xl space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>Verificación en Dos Pasos (2FA)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Tu cuenta está protegida. Ingresa el código de 6 dígitos de tu app autenticadora:
              </p>
              <input
                type="text"
                required
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
                className="w-full bg-slate-950 border border-cyan-500/50 rounded-xl px-4 py-2.5 text-center text-lg font-mono tracking-widest text-white focus:outline-none focus:border-cyan-400 shadow-inner"
              />
            </div>
          )}

          <div className="space-y-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full font-bold tracking-wide"
              isLoading={isLoading}
              glow
            >
              {isLoading ? 'Verificando...' : requires2FA ? 'Confirmar Código 2FA' : 'Iniciar Sesión'}
            </Button>

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

        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
          {!Capacitor.isNativePlatform() ? (
            <Link to="/" className="flex items-center gap-1 hover:text-white transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Página Principal</span>
            </Link>
          ) : (
            <span className="text-[11px] text-slate-500 font-semibold">Acceso Revendedores</span>
          )}
          <Link to="/register" className="text-cyan-400 hover:underline font-bold">
            Crear Cuenta
          </Link>
        </div>
      </div>
    </div>
  );
};

