import React from 'react';
import { Gamepad2, Wallet, RefreshCw, ShoppingBag, Plus } from 'lucide-react';
import { useWalletStore } from '../../../store/useWalletStore';
import { useCartStore } from '../../../store/useCartStore';
import { PriceDisplay } from '../../../components/molecules/PriceDisplay';
import { useNavigate } from 'react-router-dom';

interface PartnerTopBarProps {
  onOpenSidebar?: () => void;
}

export const PartnerTopBar: React.FC<PartnerTopBarProps> = () => {
  const navigate = useNavigate();
  const { wallet, isLoading: isWalletLoading, fetchWallet } = useWalletStore();
  const { items, toggleCart } = useCartStore();

  const totalCartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="sticky top-0 z-30 w-full h-16 bg-[#080d18]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Brand Badge & Platform Title (Menú lateral oculto en móvil/APK al igual que en Admin) */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-glow-primary sm:hidden">
          <Gamepad2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block leading-none">
            Plataforma B2B
          </span>
          <span className="text-xs font-black text-white uppercase tracking-wide">
            Panel de Revendedor
          </span>
        </div>
      </div>

      {/* Right: Balance Widget + Quick Deposit + Cart */}
      <div className="flex items-center gap-3">
        {/* Virtual Balance Widget */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Wallet className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none">
              Saldo Disponible
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <PriceDisplay
                cents={wallet.available_balance_cents}
                currency={wallet.currency}
                size="sm"
                className="text-emerald-400 font-bold"
              />
              <button
                onClick={() => fetchWallet()}
                title="Refrescar saldo"
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isWalletLoading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Quick Deposit Button (hidden on mobile since bottom dock has big Recargar button) */}
          <button
            onClick={() => navigate('/wallet/deposit')}
            title="Reportar depósito para recargar saldo"
            className="ml-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 rounded-lg transition-colors hidden sm:flex items-center gap-1 border border-cyan-500/20"
          >
            <Plus className="w-3 h-3" />
            Recargar
          </button>
        </div>

        {/* Cart Drawer Button */}
        <button
          onClick={toggleCart}
          className="relative p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          aria-label="Ver carrito"
        >
          <ShoppingBag className="w-4 h-4" />
          {totalCartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-cyan-500 text-slate-950 text-xs font-black flex items-center justify-center shadow-glow-accent animate-pulse">
              {totalCartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

