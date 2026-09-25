import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/useAuthStore';
import { Button } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import { Badge } from '../../../components/atoms/Badge';
import { Upload, CheckCircle2, Lock, Shield, Smartphone, KeyRound, Copy, Check, AlertTriangle, X, LogOut } from 'lucide-react';
import { useUIStore } from '../../../store/useUIStore';
import { apiClient } from '../../../services/api/client';
import { supabase, isSupabaseConfigured } from '../../../services/supabase/client';

export const PartnerProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuthStore();
  const { showToast } = useUIStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [fullName, setFullName] = useState(user?.fullName || 'Edward Malta');
  const [email] = useState(user?.email || 'b.edumalta@gmail.com');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
  const [twoFactorData, setTwoFactorData] = useState<{ secret: string; qrCodeUrl: string; otpauthUrl: string } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Error cerrando sesión en perfil:', err);
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      if (isSupabaseConfigured && user?.id) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, two_factor_enabled')
            .eq('id', user.id)
            .single();

          if (profile) {
            if (profile.full_name) setFullName(profile.full_name);
            setTwoFactorEnabled(Boolean(profile.two_factor_enabled));
          }
        } catch (err) {
          console.error('Error al cargar perfil:', err);
        }
      }
    };
    loadProfile();
  }, [user?.id]);

  const initial = (fullName || 'U').charAt(0).toUpperCase();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (isSupabaseConfigured && user?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ full_name: fullName })
          .eq('id', user.id);
        if (profileError) throw profileError;

        if (newPassword) {
          const { error: pwdErr } = await supabase.auth.updateUser({ password: newPassword });
          if (pwdErr) throw pwdErr;
        }
      } else {
        await new Promise((r) => setTimeout(r, 600));
      }

      setUser({ ...user!, fullName });
      showToast('Perfil y datos de seguridad actualizados con éxito', 'success');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      showToast(err.message || 'Error al guardar perfil', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStart2FASetup = async () => {
    try {
      setTwoFactorError(null);
      const res = await apiClient<{ secret: string; qrCodeUrl: string; otpauthUrl: string }>('/auth/2fa/setup', {
        method: 'POST',
      });
      setTwoFactorData(res);
      setIsSettingUp2FA(true);
    } catch (err: any) {
      showToast(err.message || 'Error iniciando configuración 2FA', 'error');
    }
  };

  const handleConfirm2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      setTwoFactorError('Ingresa el código de 6 dígitos de tu app autenticadora.');
      return;
    }

    setIsVerifying2FA(true);
    setTwoFactorError(null);
    try {
      const res = await apiClient<{ success: boolean; message?: string }>('/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({
          token: verificationCode,
          secret: twoFactorData?.secret,
        }),
      });

      if (res.success) {
        setTwoFactorEnabled(true);
        setIsSettingUp2FA(false);
        setTwoFactorData(null);
        setVerificationCode('');
        showToast('¡Autenticación de dos pasos (2FA) activada exitosamente!', 'success');
      } else {
        setTwoFactorError('Código inválido o expirado. Verifica la hora de tu teléfono e inténtalo de nuevo.');
      }
    } catch (err: any) {
      setTwoFactorError(err.message || 'Error validando código 2FA');
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('¿Estás seguro de desactivar la autenticación de dos pasos? Tu cuenta tendrá menor seguridad.')) return;
    try {
      await apiClient('/auth/2fa/disable', {
        method: 'POST',
      });
      setTwoFactorEnabled(false);
      showToast('Autenticación de dos pasos desactivada', 'info');
    } catch (err: any) {
      showToast(err.message || 'Error desactivando 2FA', 'error');
    }
  };

  const copySecret = () => {
    if (!twoFactorData?.secret) return;
    navigator.clipboard.writeText(twoFactorData.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12 text-slate-100">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-white font-['Rajdhani'] uppercase tracking-wide">
          Configuración de Cuenta & Seguridad
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Administra tus datos personales, contraseña y protección con autenticador de dos pasos (2FA).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: Avatar Card */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800/80 flex flex-col items-center text-center space-y-4">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white text-4xl font-black shadow-glow-primary">
            {initial}
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">{fullName}</h3>
            <div className="mt-1 flex justify-center">
              <Badge variant={user?.role === 'admin' ? 'danger' : 'primary'} size="sm">
                {user?.role === 'admin' ? 'SUPER ADMIN' : 'SOCIO REVENDEDOR'}
              </Badge>
            </div>
            <span className="text-[11px] text-slate-400 block mt-2 font-mono">
              {email}
            </span>
          </div>

          {/* 2FA Mini Status */}
          <div className="w-full pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-400" /> Seguridad 2FA:
            </span>
            {twoFactorEnabled ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Activado
              </span>
            ) : (
              <span className="text-amber-400 font-medium">Inactivo</span>
            )}
          </div>
        </div>

        {/* Right: Form Details */}
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handleSave}
            className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/80 space-y-6"
          >
            {/* Foto de Perfil o Logo */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Foto de Perfil o Logo
              </span>
              <div className="border border-dashed border-slate-700/80 hover:border-indigo-500/50 rounded-2xl p-6 text-center bg-slate-900/40 cursor-pointer transition-colors">
                <Upload className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                <span className="text-xs font-bold text-white block">
                  Seleccionar imagen
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  JPG, PNG o WEBP &bull; máximo 3 MB
                </span>
              </div>
            </div>

            {/* Nombre y Correo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nombre Completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre completo"
              />
              <Input
                label="Correo Electrónico"
                value={email}
                disabled
                helperText="El correo principal está verificado por el sistema."
              />
            </div>

            {/* Seguridad de la Cuenta */}
            <div className="pt-4 border-t border-slate-800/80 space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Cambio de Contraseña
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Contraseña Actual"
                  type="password"
                  placeholder="••••••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <Input
                  label="Nueva Contraseña"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  helperText="Deja en blanco si no deseas cambiar tu contraseña actual."
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full sm:w-auto"
                isLoading={isSaving}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Guardar Cambios en Perfil
              </Button>
            </div>
          </form>

          {/* Dedicated Two-Factor Authentication (2FA) Section */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-500/30 space-y-6 bg-slate-900/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Autenticación de Dos Pasos (2FA)
                    {twoFactorEnabled ? (
                      <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Activado
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Inactivo
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Protege tu cuenta con Google Authenticator, Microsoft Authenticator o Authy.
                  </p>
                </div>
              </div>

              {!twoFactorEnabled ? (
                !isSettingUp2FA && (
                  <button
                    onClick={handleStart2FASetup}
                    className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all shrink-0"
                  >
                    Activar Verificación 2FA
                  </button>
                )
              ) : (
                <button
                  onClick={handleDisable2FA}
                  className="py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs transition-all shrink-0"
                >
                  Desactivar 2FA
                </button>
              )}
            </div>

            {/* 2FA Setup Flow */}
            {isSettingUp2FA && twoFactorData && (
              <div className="p-6 rounded-3xl bg-slate-950 border border-indigo-500/40 space-y-6 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4" /> Paso 1: Escanea el Código QR
                  </span>
                  <button
                    onClick={() => {
                      setIsSettingUp2FA(false);
                      setTwoFactorData(null);
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  {/* QR Image */}
                  <div className="flex flex-col items-center p-4 bg-white rounded-2xl shadow-inner mx-auto w-fit">
                    <img
                      src={twoFactorData.qrCodeUrl}
                      alt="Código QR 2FA"
                      className="w-48 h-48"
                    />
                    <span className="text-[10px] text-slate-800 font-semibold mt-2">
                      Recargas Juegos Online TOTP Authenticator
                    </span>
                  </div>

                  {/* Manual Instructions */}
                  <div className="space-y-4">
                    <div className="space-y-1 text-xs text-slate-300">
                      <p className="font-semibold text-white">Instrucciones:</p>
                      <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
                        <li>Abre tu aplicación de autenticación (Google Authenticator, Authy, etc.).</li>
                        <li>Escanea el código QR de la izquierda o ingresa la clave secreta manualmente.</li>
                        <li>Introduce el código de 6 dígitos resultante en la casilla de abajo.</li>
                      </ol>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Clave secreta manual:
                      </span>
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-cyan-300">
                        <span className="flex-1 select-all">{twoFactorData.secret}</span>
                        <button
                          type="button"
                          onClick={copySecret}
                          className="p-1 text-slate-400 hover:text-white"
                          title="Copiar clave secreta"
                        >
                          {copiedSecret ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form to Confirm Code */}
                <form onSubmit={handleConfirm2FA} className="pt-4 border-t border-slate-800 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Paso 2: Confirma el Código de 6 Dígitos
                    </label>
                    <div className="max-w-xs">
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="w-full bg-slate-900 border border-indigo-500/50 rounded-xl px-4 py-3 text-center text-xl font-mono tracking-widest text-white focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>

                  {twoFactorError && (
                    <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl flex items-center gap-2 text-xs text-red-300">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{twoFactorError}</span>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingUp2FA(false);
                        setTwoFactorData(null);
                      }}
                      className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isVerifying2FA || verificationCode.length !== 6}
                      className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                    >
                      {isVerifying2FA ? 'Verificando...' : 'Confirmar y Activar 2FA'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Sección de Cerrar Sesión (Visible para escritorio y móvil/APK) */}
        <div className="glass-panel p-6 rounded-3xl border border-red-500/20 bg-red-950/10 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <LogOut className="w-4 h-4 text-red-400" />
                Cerrar Sesión de la Cuenta
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cierra tu sesión en este dispositivo de forma segura. Tu saldo y datos permanecerán protegidos.
              </p>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 hover:text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <LogOut className={`w-4 h-4 ${isLoggingOut ? 'animate-spin' : ''}`} />
              {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
