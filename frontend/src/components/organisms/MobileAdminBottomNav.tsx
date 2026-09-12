import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, CreditCard, ShoppingBag, Users, Settings } from 'lucide-react';
import { adminService } from '../../services/api/admin.service';

export const MobileAdminBottomNav: React.FC = () => {
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    const fetchPending = async () => {
      try {
        const res = await adminService.getPendingDepositsCount();
        const count = res?.pending_count ?? 0;
        if (isMounted) {
          setPendingCount(count);
        }
      } catch {}
    };

    fetchPending();
    const interval = setInterval(fetchPending, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    {
      label: 'Dashboard',
      path: '/sys-admin-auth',
      icon: LayoutDashboard,
    },
    {
      label: 'Depósitos',
      path: '/sys-admin-auth/deposits',
      icon: CreditCard,
      badge: pendingCount > 0 ? pendingCount : undefined,
      isHighlight: pendingCount > 0,
    },
    {
      label: 'Pedidos',
      path: '/sys-admin-auth/orders',
      icon: ShoppingBag,
    },
    {
      label: 'Usuarios',
      path: '/sys-admin-auth/users',
      icon: Users,
    },
    {
      label: 'Ajustes',
      path: '/sys-admin-auth/settings',
      icon: Settings,
    },
  ];

  return (
    <nav className="fixed bottom-3 inset-x-3 z-40 md:hidden pointer-events-auto">
      <div className="glass-dock rounded-[28px] px-3 py-2 flex items-center justify-around shadow-2xl border border-indigo-900/60 bg-[#090e1a]/95 backdrop-blur-xl">
        {navItems.map((item, idx) => {
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
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px] scale-110 text-indigo-400' : 'stroke-[1.75px]'}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[10px] font-black min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-lg shadow-red-500/50 animate-bounce">
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
