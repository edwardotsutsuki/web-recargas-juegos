import React, { useState } from 'react';
import { Gamepad2, Wallet, RefreshCw, ShoppingBag, Plus, LogOut, ShieldCheck, Lock } from 'lucide-react';
import { useWalletStore } from '../../../store/useWalletStore';
import { useCartStore } from '../../../store/useCartStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { useCashierStore } from '../../../store/useCashierStore';
import { PriceDisplay } from '../../../components/molecules/PriceDisplay';
import { useNavigate } from 'react-router-dom';

interface PartnerTopBarProps {
  onOpenSidebar?: () => void;
}

export const PartnerTopBar: React.FC<PartnerTopBarProps> = () => {
  const navigate = useNavigate();
  const { wallet, isLoading: isWalletLoading, fetchWallet } = useWalletStore();
  const { items, toggleCart } = useCartStore();
  const { logout, operatorName, isCashier, storeSlug } = useAuthStore();
  const { isCashierMode, openPinModal } = useCashierStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const totalCartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Error cerrando sesión en mobile top bar:', err);
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleShiftChange = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate('/terminal', { replace: true });
    } catch {
      navigate('/terminal', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  // VISTA DEDICADA PARA EL CAJERO (Sin menús, sin botón PIN engañoso, botón de Cerrar Turno prominente)
  if (isCashier) {
    return (
      <header className="sticky top-0 z-30 w-full h-16 bg-[#080d18]/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Identificador de Local y Cajero */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-glow-primary shrink-0">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white font-['Rajdhani'] uppercase tracking-wide truncate">
                {storeSlug ? `Local: ${storeSlug.toUpperCase()}` : 'Terminal POS'}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-[9px] font-black text-emerald-300">
                MOSTRADOR
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span>Cajero:</span>
              <span className="text-cyan-400 font-bold capitalize">{operatorName || 'Operador'}</span>
            </div>
          </div>
        </div>

        {/* Acciones de Cajero: Estado Operativo + Carrito + Botón Cerrar Turno */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Widget de Estado Operativo */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5">
            <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none">
                Estado Sistema
              </span>
              <span className="text-emerald-400 font-bold text-xs mt-0.5">Operativo 24/7</span>
            </div>
          </div>

          {/* Botón Carrito de Recargas */}
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

          {/* Botón Prominente: Cerrar Turno y Salir al Terminal POS */}
          <button
            type="button"
            onClick={handleShiftChange}
            disabled={isLoggingOut}
            title="Cerrar turno de cajero y regresar al Terminal POS"
            className="px-3.5 py-2 rounded-xl bg-red-950/70 hover:bg-red-900 border border-red-500/50 text-red-200 hover:text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <LogOut className={`w-3.5 h-3.5 text-red-400 ${isLoggingOut ? 'animate-spin' : ''}`} />
            <span className="font-['Rajdhani'] uppercase tracking-wider font-bold">
              {isLoggingOut ? 'Cerrando...' : 'Cerrar Turno'}
            </span>
          </button>
        </div>
      </header>
    );
  }

  // VISTA COMPLETA PARA EL DUEÑO / ADMINISTRADOR
  return (
    <header className="sticky top-0 z-30 w-full h-16 bg-[#080d18]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Brand Badge & Platform Title */}
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

      {/* Right: Cashier Switch + Balance Widget + Quick Deposit + Cart + Mobile Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Cashier Mode Button (Solo para el dueño cuando desea despachar frente a clientes) */}
        {isCashierMode ? (
          <button
            type="button"
            onClick={() => openPinModal('disable')}
            title="Modo Mostrador activo (ganancias ocultas). Haz clic para ingresar PIN de dueño y desbloquear."
            className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/30 transition-all flex items-center gap-1.5 text-xs font-black shadow-xs cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">Modo Mostrador</span>
            <span className="text-[9px] bg-amber-400 text-slate-950 font-bold px-1.5 py-0.2 rounded font-mono">
              PIN
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => openPinModal('enable')}
            title="Activar Modo Mostrador para ocultar ganancias cuando atiendas clientes presenciales"
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:border-cyan-400/50 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="hidden sm:inline">Modo Mostrador</span>
          </button>
        )}

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
              {isCashierMode ? (
                <span className="text-emerald-400 font-mono font-bold text-xs">Operativo ●●●</span>
              ) : (
                <PriceDisplay
                  cents={wallet.available_balance_cents}
                  currency={wallet.currency}
                  size="sm"
                  className="text-emerald-400 font-bold"
                />
              )}
              {!isCashierMode && (
                <button
                  onClick={() => fetchWallet()}
                  title="Refrescar saldo"
                  className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isWalletLoading ? 'animate-spin text-cyan-400' : ''}`} />
                </button>
              )}
            </div>
          </div>

          {/* Quick Deposit Button (only visible for business owner, not in cashier mode) */}
          {!isCashierMode && (
            <button
              onClick={() => navigate('/wallet/deposit')}
              title="Reportar depósito para recargar saldo"
              className="ml-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 rounded-lg transition-colors hidden sm:flex items-center gap-1 border border-cyan-500/20 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              Recargar
            </button>
          )}
        </div>

        {/* Cart Drawer Button */}
        <button
          onClick={toggleCart}
          className="relative p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
          aria-label="Ver carrito"
        >
          <ShoppingBag className="w-4 h-4" />
          {totalCartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-cyan-500 text-slate-950 text-xs font-black flex items-center justify-center shadow-glow-accent animate-pulse">
              {totalCartCount}
            </span>
          )}
        </button>

        {/* Mobile Quick Logout Button */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          title="Cerrar sesión"
          className="p-2.5 rounded-xl bg-red-950/30 border border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-900/40 transition-colors lg:hidden disabled:opacity-50 cursor-pointer"
          aria-label="Cerrar sesión"
        >
          <LogOut className={`w-4 h-4 ${isLoggingOut ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </header>
  );
};
