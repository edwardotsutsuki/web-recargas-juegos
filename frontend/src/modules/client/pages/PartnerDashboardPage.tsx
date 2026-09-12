import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletStore } from '../../../store/useWalletStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { PriceDisplay } from '../../../components/molecules/PriceDisplay';
import { MobileWalletCard } from '../components/MobileWalletCard';
import { MobileQuickCategories } from '../components/MobileQuickCategories';
import {
  Wallet,
  Trophy,
  Users,
  Clock,
  Zap,
  Gamepad2,
  Headphones,
  Download,
  Copy,
  Check,
  Plus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const PartnerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { wallet } = useWalletStore();

  const [copiedCode, setCopiedCode] = useState(false);

  const displayName = user?.email ? user.email.split('@')[0] : 'Edward Malta';
  const referralCode = `RJO-${(user?.id || '3A2125').slice(0, 6).toUpperCase()}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Greeting Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white font-['Rajdhani'] uppercase tracking-wide flex items-center gap-2">
          ¡Hola, {displayName}! <span className="text-2xl animate-bounce">👋</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Bienvenido a tu panel de control de ventas y recargas.
        </p>
      </div>

      {/* Mobile-Exclusive Hero Wallet Card & Quick Shortcuts (Inspirado en Imagen 2) */}
      <div className="lg:hidden space-y-5">
        <MobileWalletCard />
        <MobileQuickCategories />
      </div>

      {/* Desktop 4 Metric Cards Grid (Preservado 100% para Web de Escritorio) */}
      <div className="hidden lg:grid lg:grid-cols-4 gap-4">
        {/* 1. Saldo Disponible */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Saldo Disponible
              </span>
              <PriceDisplay
                cents={wallet.available_balance_cents}
                currency={wallet.currency}
                size="xl"
                className="text-emerald-400 font-black mt-1"
              />
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
            <button
              onClick={() => navigate('/wallet/deposit')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition-all flex items-center gap-1 shadow-glow-accent"
            >
              <Plus className="w-3.5 h-3.5" />
              Recargar
            </button>
            <button
              onClick={() => navigate('/catalog')}
              className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-300 hover:text-white font-bold text-xs transition-all"
            >
              Pedir Recarga
            </button>
          </div>
        </div>

        {/* 2. Recompensas */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Recompensas
              </span>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-amber-300">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>NIVEL BRONCE</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <button
              onClick={() => navigate('/rewards')}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <span>Consulta tu nivel mensual y anual</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 3. Cuentas Activas / Órdenes */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Órdenes Completadas
              </span>
              <span className="text-2xl font-black text-white font-['Rajdhani'] mt-1 block">
                0
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <button
              onClick={() => navigate('/orders')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <span>Ver mis órdenes &rarr;</span>
            </button>
          </div>
        </div>

        {/* 4. Trámites Pendientes */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Trámites Pendientes
              </span>
              <span className="text-2xl font-black text-white font-['Rajdhani'] mt-1 block">
                0
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <span className="text-xs text-slate-400 block">
              Recargas esperando aprobación.
            </span>
          </div>
        </div>
      </div>

      {/* Main Row: Acciones Rápidas + Gana Saldo Extra (Oculto en móvil/APK ya que todo está en Accesos Rápidos) */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-6">
        {/* Acciones Rápidas (2 cols) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800/80 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Acciones Rápidas
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => navigate('/catalog')}
              className="p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col items-center justify-center gap-2.5 group"
            >
              <div className="p-3 rounded-xl bg-cyan-600/20 text-cyan-400 group-hover:scale-110 transition-transform">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-300 group-hover:text-white text-center">
                Pines / Juegos
              </span>
            </button>

            <button
              onClick={() => navigate('/support')}
              className="p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 transition-all flex flex-col items-center justify-center gap-2.5 group"
            >
              <div className="p-3 rounded-xl bg-purple-600/20 text-purple-400 group-hover:scale-110 transition-transform">
                <Headphones className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-300 group-hover:text-white text-center">
                Crear Ticket
              </span>
            </button>

            <button
              onClick={() => navigate('/downloads')}
              className="p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col items-center justify-center gap-2.5 group"
            >
              <div className="p-3 rounded-xl bg-emerald-600/20 text-emerald-400 group-hover:scale-110 transition-transform">
                <Download className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-300 group-hover:text-white text-center">
                Guías / Apks
              </span>
            </button>
          </div>
        </div>

        {/* Gana Saldo Extra (Referidos) (1 col) */}
        <div className="glass-panel p-6 rounded-3xl border border-indigo-500/30 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />

          <div className="space-y-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Gana Saldo Extra</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Invita a otros revendedores con tu código único y gana comisión en saldo por cada una de sus recargas.
              </p>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-800/80 relative z-10">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-xs font-mono font-black text-cyan-300 tracking-wider">
                {referralCode}
              </span>
              <button
                onClick={handleCopyCode}
                title="Copiar código de referido"
                className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1 text-[11px] font-bold"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

