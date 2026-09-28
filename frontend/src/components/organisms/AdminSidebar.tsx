import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Server,
  ShieldCheck,
  CreditCard,
  ShieldAlert,
  Image as ImageIcon,
  Megaphone,
  Trophy,
  History,
  Download,
  Headphones,
  Landmark,
  Bell,
} from 'lucide-react';
import { adminService } from '../../services/api/admin.service';
import { soundService } from '../../utils/sound';
import { nativeNotificationService } from '../../services/nativeNotificationService';

export const AdminSidebar: React.FC = () => {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [pendingTicketsCount, setPendingTicketsCount] = useState<number>(0);
  const prevPendingCountRef = useRef<number | null>(null);
  const prevTicketsCountRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkPendingAlerts = async () => {
      try {
        const [depRes, tickRes] = await Promise.all([
          adminService.getPendingDepositsCount(),
          adminService.getPendingTicketsCount(),
        ]);

        const depCount = depRes?.pending_count ?? 0;
        const tickCount = tickRes?.pending_count ?? 0;

        if (isMounted) {
          // Si el conteo de depósitos sube, emitir alerta
          if (prevPendingCountRef.current !== null && depCount > prevPendingCountRef.current) {
            soundService.playNotificationChime();
            nativeNotificationService.sendDepositAlert({ count: depCount });
          }

          // Si el conteo de tickets de soporte sube, emitir alerta
          if (prevTicketsCountRef.current !== null && tickCount > prevTicketsCountRef.current) {
            soundService.playNotificationChime();
          }

          const totalAlerts = depCount + tickCount;
          if (totalAlerts > 0) {
            document.title = `🔔 (${totalAlerts}) Alertas Pendientes - Admin`;
          } else {
            document.title = 'Panel Admin - Recargas Juegos Online';
          }

          prevPendingCountRef.current = depCount;
          prevTicketsCountRef.current = tickCount;
          setPendingCount(depCount);
          setPendingTicketsCount(tickCount);
        }
      } catch {
        // Silencioso en caso de desconexión momentánea
      }
    };

    checkPendingAlerts();
    const interval = setInterval(checkPendingAlerts, 10000); // Polling cada 10 segundos

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { to: '/sys-admin-auth', label: 'Dashboard & Métricas', icon: LayoutDashboard, end: true },
    {
      to: '/sys-admin-auth/deposits',
      label: 'Aprobación de Vouchers',
      icon: CreditCard,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    { to: '/sys-admin-auth/bank-accounts', label: 'Cuentas Bancarias', icon: Landmark },
    { to: '/sys-admin-auth/catalog', label: 'Portadas & Catálogo', icon: ImageIcon },
    { to: '/sys-admin-auth/materials', label: 'Materiales & Descargas', icon: Download },
    {
      to: '/sys-admin-auth/support',
      label: 'Mesa de Ayuda / Tickets',
      icon: Headphones,
      badge: pendingTicketsCount > 0 ? pendingTicketsCount : null,
    },
    { to: '/sys-admin-auth/promotions', label: 'Avisos & Promociones', icon: Megaphone },
    { to: '/sys-admin-auth/rewards', label: 'Retos & Recompensas', icon: Trophy },
    { to: '/sys-admin-auth/settings', label: 'Control Saldo & Freno', icon: ShieldAlert },
    { to: '/sys-admin-auth/users', label: 'Gestión Usuarios & 2FA', icon: Users },
    { to: '/sys-admin-auth/orders', label: 'Órdenes Globales', icon: ShoppingBag },
    { to: '/sys-admin-auth/audit', label: 'Bitácora de Auditoría', icon: History },
  ];

  return (
    <aside className="hidden md:flex w-64 bg-white dark:bg-[#0a0f1c] border-r border-slate-200 dark:border-slate-800/80 flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)] transition-colors duration-200">
      <div className="p-4 space-y-6">
        {/* Admin Header */}
        <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-indigo-950/40 border border-slate-200 dark:border-indigo-500/20 rounded-xl">
          <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Panel Admin
            </h4>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Control Central & Saldo</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const hasBadge = item.badge && item.badge > 0;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>

                {hasBadge && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black animate-pulse shadow-md shadow-rose-600/50">
                    <Bell className="w-2.5 h-2.5" />
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Provider Status Indicator */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800/60">
        <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-2.5">
          <Server className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
              Proveedor Canjea
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Conexión Segura</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
