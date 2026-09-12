import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Gamepad2,
  Wallet,
  ShoppingBag,
  ShieldAlert,
  User,
  ExternalLink,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useCartStore } from '../../store/useCartStore';
import { PriceDisplay } from '../molecules/PriceDisplay';
import { AppDownloadModal } from '../molecules/AppDownloadModal';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const { role, toggleDevRole } = useAuthStore();
  const { wallet, isLoading: isWalletLoading, fetchWallet } = useWalletStore();
  const { items, toggleCart } = useCartStore();

  const totalCartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-glow-primary group-hover:scale-105 transition-transform">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-base font-black tracking-wider text-white font-['Rajdhani'] flex items-center gap-1 uppercase">
                Recargas <span className="text-cyan-400">Juegos</span> Online
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 block -mt-0.5">
                Distribución Oficial
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive('/')
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Tienda
            </Link>
            <Link
              to="/orders"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive('/orders')
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Mis Códigos
            </Link>

            {role === 'admin' && (
              <Link
                to="/admin"
                className={`ml-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-cyan-500 text-slate-950 shadow-glow-accent'
                    : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                Panel Admin
              </Link>
            )}
          </nav>
        </div>

        {/* Right Section: Virtual Balance + Dev Switcher + Cart */}
        <div className="flex items-center gap-3">
          {/* Virtual Balance Widget */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider leading-none">
                Saldo Virtual
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <PriceDisplay
                  cents={wallet.available_balance_cents}
                  currency={wallet.currency}
                  size="sm"
                  className="text-emerald-400"
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

            {/* Quick Top-up CTA */}
            <a
              href="https://wa.me/"
              target="_blank"
              rel="noopener noreferrer"
              title="Solicitar recarga al administrador"
              className="ml-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-1 rounded-md transition-colors flex items-center gap-0.5"
            >
              + Recargar
              <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
            </a>
          </div>

          {/* Dev Role Switcher Badge */}
          <button
            onClick={toggleDevRole}
            title="Alternar entre rol Cliente y Administrador para probar la interfaz"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-purple-950/60 border border-purple-500/40 text-purple-300 hover:bg-purple-900/60 transition-colors"
          >
            <User className="w-3.5 h-3.5" />
            <span>Rol: <strong className="uppercase text-purple-200">{role}</strong></span>
          </button>

          {/* App Android Download Trigger */}
          <button
            onClick={() => setIsAppModalOpen(true)}
            title="Descargar App Android oficial (.APK)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all shadow-sm group"
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">App</span>
            <span className="px-1 py-0.2 rounded text-[9px] font-black bg-cyan-400 text-slate-950 uppercase">APK</span>
          </button>

          {/* Cart Trigger */}
          <button
            onClick={toggleCart}
            className="relative p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
            aria-label="Ver carrito"
          >
            <ShoppingBag className="w-5 h-5" />
            {totalCartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-cyan-500 text-slate-950 text-xs font-black flex items-center justify-center shadow-glow-accent animate-pulse">
                {totalCartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Modal de descarga de la App Android */}
      <AppDownloadModal isOpen={isAppModalOpen} onClose={() => setIsAppModalOpen(false)} />
    </header>
  );
};
