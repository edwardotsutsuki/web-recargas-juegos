import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../../services/supabase/client';
import { Button } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import { Gamepad2, Mail, Lock, ArrowLeft } from 'lucide-react';
import { useUIStore } from '../../../store/useUIStore';
import { Capacitor } from '@capacitor/core';

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { showToast } = useUIStore();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (isSupabaseConfigured) {
      try {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        showToast('¡Registro completado! Por favor revisa tu correo o inicia sesión.', 'success');
        navigate('/login');
      } catch (err: any) {
        setError(err.message || 'Error al registrar la cuenta.');
      } finally {
        setIsLoading(false);
      }
    } else {
      setTimeout(() => {
        showToast('Registro simulado con éxito. Ahora inicia sesión.', 'success');
        navigate('/login');
        setIsLoading(false);
      }, 500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080c14] p-4">
      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-indigo-600 mx-auto flex items-center justify-center shadow-glow-accent">
            <Gamepad2 className="w-7 h-7 text-slate-950" />
          </div>
          <h2 className="text-2xl font-black text-white font-['Rajdhani'] uppercase tracking-wider">
            Crear Cuenta de Revendedor
          </h2>
          <p className="text-xs text-slate-400">
            Regístrate en <span className="text-cyan-400 font-bold">Recargas Juegos Online</span> para obtener tu billetera virtual y vender recargas.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <Input
            label="Correo Electrónico"
            type="email"
            placeholder="tu_email@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            required
          />

          <Input
            label="Contraseña"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />

          <Button
            type="submit"
            variant="accent"
            size="lg"
            className="w-full"
            isLoading={isLoading}
            glow
          >
            Registrarse
          </Button>
        </form>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
          {!Capacitor.isNativePlatform() ? (
            <Link to="/" className="flex items-center gap-1 hover:text-white transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Página Principal</span>
            </Link>
          ) : (
            <Link to="/login" className="flex items-center gap-1 hover:text-white transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver al Login</span>
            </Link>
          )}
          <div>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-cyan-400 hover:underline font-bold">
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

