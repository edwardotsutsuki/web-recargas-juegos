import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Eye, EyeOff, Plus, QrCode, ArrowUpRight, Copy, Check } from 'lucide-react';
import { useWalletStore } from '../../../store/useWalletStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { PriceDisplay } from '../../../components/molecules/PriceDisplay';

export const MobileWalletCard: React.FC = () => {
  const navigate = useNavigate();
  const { wallet } = useWalletStore();
  const { user } = useAuthStore();
  const [showBalance, setShowBalance] = useState(true);
  const [copied, setCopied] = useState(false);

  const referralCode = `RJO-${(user?.id || '3A2125').slice(0, 6).toUpperCase()}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative overflow-hidden rounded-[32px] p-6 shadow-2xl bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 text-white border border-white/15">
      {/* Decorative ambient background glows */}
      <div className="absolute -top-12 -right-12 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-purple-900/40 rounded-full blur-2xl pointer-events-none" />

      {/* Top row: Brand / Wallet icon & + Recargar button */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-inner">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm tracking-wide text-white font-['Rajdhani'] uppercase">
              Recargas Juegos Pro
            </h3>
            <span className="text-[11px] text-purple-200">Saldo Virtual Inmediato</span>
          </div>
        </div>

        <button
          onClick={() => navigate('/deposit')}
          className="flex items-center gap-1.5 bg-white text-purple-900 hover:bg-purple-50 px-4 py-2 rounded-full font-bold text-xs shadow-lg shadow-black/20 active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3px]" />
          <span>Recargar</span>
        </button>
      </div>

      {/* Middle row: Balance with privacy eye toggle */}
      <div className="relative z-10 my-5">
        <div className="flex items-center gap-2 text-purple-200 text-xs font-semibold">
          <span>Tu saldo disponible</span>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="p-1 rounded-full hover:bg-white/10 text-purple-200 hover:text-white transition-colors"
            aria-label="Alternar visibilidad del saldo"
          >
            {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>

        <div className="mt-1">
          {showBalance ? (
            <PriceDisplay
              cents={wallet.available_balance_cents}
              currency={wallet.currency}
              size="xl"
              className="text-white font-black text-3xl sm:text-4xl tracking-tight drop-shadow-md"
            />
          ) : (
            <span className="text-3xl font-black tracking-widest text-purple-200">
              ••••••••
            </span>
          )}
        </div>
      </div>

      {/* Bottom row: Quick action buttons */}
      <div className="relative z-10 grid grid-cols-3 gap-2 pt-3 border-t border-white/15">
        <button
          onClick={() => navigate('/deposit')}
          className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 transition-all text-center"
        >
          <ArrowUpRight className="w-4 h-4 text-emerald-300 mb-1" />
          <span className="text-[11px] font-bold text-white leading-tight">Depositar</span>
        </button>

        <button
          onClick={() => navigate('/accounting')}
          className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 transition-all text-center"
        >
          <QrCode className="w-4 h-4 text-purple-200 mb-1" />
          <span className="text-[11px] font-bold text-white leading-tight">Movimientos</span>
        </button>

        <button
          onClick={handleCopy}
          className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 transition-all text-center"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-300 mb-1" />
          ) : (
            <Copy className="w-4 h-4 text-purple-200 mb-1" />
          )}
          <span className="text-[11px] font-bold text-white leading-tight">
            {copied ? '¡Copiado!' : 'Mi Código'}
          </span>
        </button>
      </div>
    </div>
  );
};
