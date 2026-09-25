import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Home,
  Gamepad2,
  ShoppingBag,
  CreditCard,
  BookOpen,
  Trophy,
  Users,
  Download,
  Headphones,
  User,
  LogOut,
  X,
  Settings,
  Tag,
  Lock,
} from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { useCashierStore } from '../../../store/useCashierStore';

interface PartnerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PartnerSidebar: React.FC<PartnerSidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { isCashierMode, openPinModal } = useCashierStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleProtectedNav = (e: React.MouseEvent, path: string) => {
    if (isCashierMode) {
      e.preventDefault();
      openPinModal('access_restricted', path);
    } else {
      onClose();
    }
  };

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Error cerrando sesión de revendedor:', err);
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
      isActive
        ? 'bg-indigo-600 text-white shadow-glow-primary'
        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
    }`;

  const displayName = user?.email ? user.email.split('@')[0] : 'Edward Malta';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container (Visible únicamente en escritorio) */}
      <aside
        className="hidden lg:flex fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#080d18] border-r border-slate-800/80 flex-col justify-between"
      >
        {/* Top Header / Logo */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <Link to="/dashboard" onClick={onClose} className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-glow-primary group-hover:scale-105 transition-transform">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-black tracking-wider text-white font-['Rajdhani'] uppercase leading-tight block">
                  Recargas <span className="text-cyan-400">Juegos</span> Online
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-[9px] font-black text-emerald-300">
                    REVENDEDOR
                  </span>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">
                    Panel
                  </span>
                </div>
              </div>
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Nav Sections */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6 scrollbar-none">
          {/* Main Dashboard */}
          <div className="space-y-1">
            <NavLink to="/dashboard" end className={navItemClass} onClick={onClose}>
              <Home className="w-4 h-4 text-cyan-400" />
              <span>Inicio / Resumen</span>
            </NavLink>
          </div>

          {/* Sección Tienda */}
          <div className="space-y-1.5">
            <span className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Tienda & Precios
            </span>
            <NavLink to="/catalog" className={navItemClass} onClick={onClose}>
              <Gamepad2 className="w-4 h-4 text-indigo-400" />
              <span>Pedir Juegos / Pines</span>
            </NavLink>
            <NavLink
              to="/reseller/pvp"
              className={navItemClass}
              onClick={(e) => handleProtectedNav(e, '/reseller/pvp')}
            >
              <Tag className="w-4 h-4 text-cyan-400" />
              <span className="flex-1">Configurar PVP (Venta)</span>
              {isCashierMode && <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
            </NavLink>
            <NavLink
              to="/staff"
              className={navItemClass}
              onClick={(e) => handleProtectedNav(e, '/staff')}
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="flex-1">Personal / Cajeros</span>
              {isCashierMode && <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
            </NavLink>
            <NavLink to="/orders" className={navItemClass} onClick={onClose}>
              <ShoppingBag className="w-4 h-4 text-purple-400" />
              <span>Mis Recargas / Órdenes</span>
            </NavLink>
          </div>

          {/* Sección Mi Billetera & Contabilidad */}
          <div className="space-y-1.5">
            <span className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Billetera & Ganancias
            </span>
            <NavLink
              to="/wallet/deposit"
              className={navItemClass}
              onClick={(e) => handleProtectedNav(e, '/wallet/deposit')}
            >
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span className="flex-1">Reportar Pago (Recarga)</span>
              {isCashierMode && <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
            </NavLink>
            <NavLink
              to="/accounting"
              className={navItemClass}
              onClick={(e) => handleProtectedNav(e, '/accounting')}
            >
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span className="flex-1">Mi Libro Contable</span>
              {isCashierMode && <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
            </NavLink>
            <NavLink to="/rewards" className={navItemClass} onClick={onClose}>
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Recompensas</span>
            </NavLink>
            <NavLink to="/referrals" className={navItemClass} onClick={onClose}>
              <Users className="w-4 h-4 text-blue-400" />
              <span>Mis Referidos</span>
            </NavLink>
          </div>

          {/* Sección Ayuda y Extras */}
          <div className="space-y-1.5">
            <span className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Ayuda y Extras
            </span>
            <NavLink to="/downloads" className={navItemClass} onClick={onClose}>
              <Download className="w-4 h-4 text-slate-400" />
              <span>Material y Descargas</span>
            </NavLink>
            <NavLink to="/support" className={navItemClass} onClick={onClose}>
              <Headphones className="w-4 h-4 text-slate-400" />
              <span>Soporte / Tickets</span>
            </NavLink>
            <NavLink to="/profile" className={navItemClass} onClick={onClose}>
              <User className="w-4 h-4 text-slate-400" />
              <span>Mi Perfil</span>
            </NavLink>
          </div>
        </div>

        {/* User Card & Logout Footer */}
        <div className="p-3.5 border-t border-slate-800/80 bg-[#060a12] space-y-2">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white text-xs font-black shrink-0">
                {initial}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">
                  {displayName}
                </span>
                <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider block">
                  CANAL DE VENTAS
                </span>
              </div>
            </div>

            <NavLink
              to="/profile"
              title="Ajustes de cuenta"
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4" />
            </NavLink>
          </div>

          <button
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className="w-full py-2 px-3 rounded-xl bg-slate-900/40 hover:bg-red-950/40 border border-slate-800/80 hover:border-red-500/30 text-slate-400 hover:text-red-300 text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <LogOut className={`w-3.5 h-3.5 ${isLoggingOut ? 'animate-spin' : ''}`} />
            <span>{isLoggingOut ? 'Cerrando sesión...' : 'Salir del Panel'}</span>
          </button>
        </div>
      </aside>
    </>
  );
};
