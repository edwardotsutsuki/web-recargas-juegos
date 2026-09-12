import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Grid, ShoppingBag, User, Zap } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';

export const MobileClientBottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { items } = useCartStore();
  const totalCartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const navItems = [
    {
      label: 'Inicio',
      path: '/dashboard',
      icon: Home,
    },
    {
      label: 'Catálogo',
      path: '/catalog',
      icon: Grid,
    },
    // Center Action Button (Pill circular con degradado vibrante como en las fotos)
    {
      isCenter: true,
      label: 'Recargar',
      path: '/deposit',
      icon: Zap,
    },
    {
      label: 'Pedidos',
      path: '/orders',
      icon: ShoppingBag,
      badge: totalCartCount > 0 ? totalCartCount : undefined,
    },
    {
      label: 'Perfil',
      path: '/profile',
      icon: User,
    },
  ];

  return (
    <nav className="fixed bottom-3 inset-x-3 z-40 lg:hidden pointer-events-auto">
      <div className="glass-dock rounded-[28px] px-3 py-2 flex items-center justify-around shadow-2xl border border-slate-700/60 bg-[#0c1220]/90 backdrop-blur-xl">
        {navItems.map((item, idx) => {
          if (item.isCenter) {
            return (
              <button
                key={idx}
                onClick={() => navigate(item.path)}
                className="relative -top-5 flex flex-col items-center group focus:outline-none"
                aria-label={item.label}
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/40 flex items-center justify-center transform active:scale-95 transition-transform">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center text-white">
                    <item.icon className="w-7 h-7 text-white animate-pulse" />
                  </div>
                </div>
                <span className="text-[10px] font-bold text-indigo-300 mt-0.5 tracking-tight">
                  {item.label}
                </span>
              </button>
            );
          }

          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={idx}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all duration-200 active:scale-90 ${
                isActive
                  ? 'text-indigo-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px] scale-110' : 'stroke-[1.75px]'}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 bg-pink-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight ${isActive ? 'text-indigo-300' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
