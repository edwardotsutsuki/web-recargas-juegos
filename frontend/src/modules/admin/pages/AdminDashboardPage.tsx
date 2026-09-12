import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AdminMetrics } from '../../../types';
import { adminService } from '../../../services/api/admin.service';
import { useAuthStore } from '../../../store/useAuthStore';
import { useUIStore } from '../../../store/useUIStore';
import { PriceDisplay } from '../../../components/molecules/PriceDisplay';
import {
  TrendingUp,
  Users,
  ShoppingBag,
  Server,
  ArrowUpRight,
  CreditCard,
  Palette,
  Megaphone,
  Sliders,
  Gift,
  History,
  Landmark,
  Headphones,
  Download,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  UserPlus,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showToast } = useUIStore();

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [providerBalance, setProviderBalance] = useState<string>('0.00');
  const [providerCurrency, setProviderCurrency] = useState<string>('USD');
  const [circuitBreakerActive, setCircuitBreakerActive] = useState<boolean>(false);
  const [alertLevel, setAlertLevel] = useState<string>('normal');
  const [pendingDepositsCount, setPendingDepositsCount] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showBalance, setShowBalance] = useState<boolean>(true);

  const displayName = user?.fullName || (user?.email ? user.email.split('@')[0] : 'Super Admin');

  const loadData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setIsRefreshing(true);

      const [metricsData, statusData, pendingData] = await Promise.all([
        adminService.getAdminMetrics(),
        adminService.getSystemStatus(forceRefresh),
        adminService.getPendingDepositsCount(),
      ]);

      if (metricsData) setMetrics(metricsData);

      if (statusData) {
        setProviderBalance(statusData.canjea_balance || '0.00');
        setProviderCurrency(statusData.currency || 'USD');
        setCircuitBreakerActive(Boolean(statusData.circuit_breaker_active));
        setAlertLevel(statusData.alert_level || 'normal');
      } else if (metricsData) {
        setProviderBalance(((metricsData.supplier_balance_cents || 0) / 100).toFixed(2));
        setProviderCurrency(metricsData.currency || 'USD');
      }

      if (pendingData) {
        setPendingDepositsCount(pendingData.pending_count || 0);
      }

      if (forceRefresh) {
        showToast('Saldo de proveedor Canjea y métricas actualizados en vivo.', 'success');
      }
    } catch (err: any) {
      console.error('Error al cargar datos del dashboard admin:', err);
      if (forceRefresh) {
        showToast('Error al actualizar datos con el servidor.', 'error');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);
    const interval = setInterval(() => loadData(false), 30000);
    return () => clearInterval(interval);
  }, []);

  const quickModules = [
    {
      label: 'Depósitos',
      icon: CreditCard,
      color: 'from-emerald-500 to-teal-600',
      path: '/sys-admin-auth/deposits',
      badge: pendingDepositsCount > 0 ? pendingDepositsCount : null,
      highlight: pendingDepositsCount > 0,
    },
    {
      label: 'Pedidos',
      icon: ShoppingBag,
      color: 'from-cyan-500 to-blue-600',
      path: '/sys-admin-auth/orders',
      badge: metrics?.active_orders_count ? metrics.active_orders_count : null,
    },
    {
      label: 'Usuarios',
      icon: Users,
      color: 'from-purple-500 to-indigo-600',
      path: '/sys-admin-auth/users',
      badge: metrics?.total_users_count ? metrics.total_users_count : null,
    },
    {
      label: 'Catálogo',
      icon: Palette,
      color: 'from-indigo-500 to-purple-600',
      path: '/sys-admin-auth/catalog',
    },
    {
      label: 'Bancos',
      icon: Landmark,
      color: 'from-violet-500 to-purple-600',
      path: '/sys-admin-auth/bank-accounts',
    },
    {
      label: 'Avisos & Promo',
      icon: Megaphone,
      color: 'from-pink-500 to-rose-600',
      path: '/sys-admin-auth/promotions',
    },
    {
      label: 'Recompensas',
      icon: Gift,
      color: 'from-amber-500 to-yellow-600',
      path: '/sys-admin-auth/rewards',
    },
    {
      label: 'Freno Saldo',
      icon: Sliders,
      color: 'from-orange-500 to-amber-600',
      path: '/sys-admin-auth/settings',
    },
    {
      label: 'Auditoría',
      icon: History,
      color: 'from-slate-600 to-slate-800',
      path: '/sys-admin-auth/audit',
    },
    {
      label: 'Materiales',
      icon: Download,
      color: 'from-teal-500 to-cyan-600',
      path: '/sys-admin-auth/materials',
    },
    {
      label: 'Soporte',
      icon: Headphones,
      color: 'from-blue-500 to-indigo-600',
      path: '/sys-admin-auth/support',
    },
    {
      label: 'Abonar Saldo',
      icon: UserPlus,
      color: 'from-green-500 to-emerald-600',
      path: '/sys-admin-auth/users',
    },
  ];

  return (
    <div className="space-y-6 pb-6">
      {/* ============================================================ */}
      {/* VISTA MÓVIL EXCLUSIVA (md:hidden) — OPTIMIZADA AL ESTILO CLIENTE */}
      {/* ============================================================ */}
      <div className="md:hidden space-y-5">
        {/* Encabezado de Bienvenida Móvil */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white font-['Rajdhani'] uppercase tracking-wide flex items-center gap-1.5">
              ¡Hola, {displayName}! <span className="text-xl">👑</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Panel Administrador Pro · Canjea Gateway
            </p>
          </div>
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white active:scale-95 transition-all shadow-sm"
            title="Sincronizar todo"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>

        {/* HERO CARD: SALDO PROVEEDOR CANJEA EN GRANDE */}
        <div className="relative overflow-hidden rounded-[32px] p-6 shadow-2xl bg-gradient-to-br from-[#0a1526] via-[#0f2347] to-[#062e2c] text-white border border-cyan-500/25">
          {/* Luces de ambiente decorativas */}
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

          {/* Fila Superior: Identificación del Proveedor */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/15 shadow-inner text-cyan-300">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm tracking-wide text-white font-['Rajdhani'] uppercase flex items-center gap-1.5">
                  <span>{metrics?.supplier_name || 'Canjea API Gateway'}</span>
                </h3>
                <span className="text-[11px] text-cyan-200/80">Saldo Operativo en Proveedor</span>
              </div>
            </div>

            <button
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 bg-white text-slate-950 hover:bg-slate-100 px-3.5 py-1.5 rounded-full font-black text-xs shadow-lg shadow-black/20 active:scale-95 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 stroke-[2.5px] ${isRefreshing ? 'animate-spin text-cyan-600' : ''}`} />
              <span>Sync</span>
            </button>
          </div>

          {/* Fila Central: Saldo Gigante con Ojo de Privacidad */}
          <div className="relative z-10 my-5">
            <div className="flex items-center gap-2 text-cyan-200/90 text-xs font-semibold">
              <span>Saldo disponible con el proveedor</span>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="p-1 rounded-full hover:bg-white/10 text-cyan-300 hover:text-white transition-colors"
                aria-label="Alternar visibilidad del saldo"
              >
                {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            <div className="mt-1">
              {showBalance ? (
                <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono tracking-tight drop-shadow-md flex items-baseline gap-2">
                  <span>${Number(providerBalance).toFixed(2)}</span>
                  <span className="text-xs font-bold text-emerald-200/70">{providerCurrency}</span>
                </div>
              ) : (
                <span className="text-3xl font-black tracking-widest text-cyan-200 font-mono">
                  ••••••••
                </span>
              )}
            </div>

            {/* Estado de Conexión y Circuit Breaker */}
            <div className="mt-2.5 flex items-center gap-2">
              {circuitBreakerActive || alertLevel === 'critical' ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse">
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                  Freno Emergencia Activo (Pausa Preventiva)
                </span>
              ) : alertLevel === 'warning' ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  Saldo Bajo en Proveedor (&lt; $50)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Conexión Canjea Online (5000ms)
                </span>
              )}
            </div>
          </div>

          {/* Fila Inferior: Botones de Acción Directa */}
          <div className="relative z-10 grid grid-cols-3 gap-2 pt-3 border-t border-white/15">
            <button
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 transition-all text-center"
            >
              <RefreshCw className={`w-4 h-4 text-cyan-300 mb-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-[11px] font-bold text-white leading-tight">Sincronizar</span>
            </button>

            <button
              onClick={() => navigate('/sys-admin-auth/bank-accounts')}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 transition-all text-center"
            >
              <Landmark className="w-4 h-4 text-purple-300 mb-1" />
              <span className="text-[11px] font-bold text-white leading-tight">Bancos</span>
            </button>

            <button
              onClick={() => navigate('/sys-admin-auth/settings')}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 transition-all text-center"
            >
              <Sliders className="w-4 h-4 text-amber-300 mb-1" />
              <span className="text-[11px] font-bold text-white leading-tight">Freno Saldo</span>
            </button>
          </div>
        </div>

        {/* SECCIÓN: ACCESOS RÁPIDOS (Estilo Squircle Icons similar a panel clientes) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-['Rajdhani']">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Accesos Rápidos de Administración</span>
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">12 Módulos</span>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {quickModules.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => navigate(item.path)}
                  className={`relative flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-900/80 border active:scale-95 transition-all shadow-sm group ${
                    item.highlight
                      ? 'border-emerald-500/60 shadow-emerald-500/20 shadow-md'
                      : 'border-slate-800 hover:border-indigo-500/50'
                  }`}
                >
                  {item.badge !== null && item.badge !== undefined && (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shadow-lg shadow-red-500/50 animate-pulse z-20">
                      {item.badge}
                    </span>
                  )}

                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${item.color} flex items-center justify-center text-white shadow-md mb-1.5 group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-300 text-center leading-tight line-clamp-1">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECCIÓN: RESUMEN DE MÉTRICAS MÓVIL */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-['Rajdhani']">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
            <span>Métricas Operativas</span>
          </h4>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Ventas
              </span>
              <div className="text-sm font-black text-white truncate font-mono">
                ${((metrics?.total_sales_cents || 0) / 100).toFixed(0)}
              </div>
              <span className="text-[9px] text-emerald-400 block font-bold">+14.2%</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Órdenes
              </span>
              <div className="text-sm font-black text-cyan-400 truncate font-mono">
                {metrics?.active_orders_count || 0}
              </div>
              <span className="text-[9px] text-cyan-400 block font-bold">100% OK</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Clientes
              </span>
              <div className="text-sm font-black text-purple-300 truncate font-mono">
                {metrics?.total_users_count || 0}
              </div>
              <span className="text-[9px] text-purple-400 block font-bold">Activos</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* VISTA DESKTOP (hidden md:block) — PRESERVADA 100% PARA ESCRITORIO */}
      {/* ============================================================ */}
      <div className="hidden md:block space-y-8">
        {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Rajdhani'] uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-indigo-400" />
            Dashboard de Control Central
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Monitoreo en tiempo real de ventas, usuarios, billeteras y saldo con el proveedor Canjea.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/sys-admin-auth/users"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-glow-primary"
          >
            <Users className="w-4 h-4" />
            Asignar Saldo a Usuario
          </Link>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Total Sales */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Ventas Totales</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <PriceDisplay
              cents={metrics?.total_sales_cents || 0}
              currency={metrics?.currency || 'USD'}
              size="xl"
              className="text-white font-extrabold"
            />
            <span className="text-[11px] text-emerald-400 block mt-1">
              +14.2% respecto al mes anterior
            </span>
          </div>
        </div>

        {/* Metric 2: Active Orders */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Órdenes Procesadas</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {metrics?.active_orders_count || 0}
            </span>
            <span className="text-[11px] text-cyan-400 block mt-1">
              100% liquidadas con idempotencia
            </span>
          </div>
        </div>

        {/* Metric 3: Total Users */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Clientes con Billetera</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {metrics?.total_users_count || 0}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">
              Perfiles sincronizados con Auth
            </span>
          </div>
        </div>

        {/* Metric 4: Supplier Balance (Canjea) */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">
              Saldo Proveedor ({metrics?.supplier_name?.split(' ')[0] || 'Canjea'})
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div>
            <PriceDisplay
              cents={metrics?.supplier_balance_cents || 0}
              currency={metrics?.currency || 'USD'}
              size="xl"
              className="text-emerald-400 font-extrabold"
            />
            <span className="text-[11px] text-emerald-300 flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Conexión Operativa (5000ms timeout)
            </span>
          </div>
        </div>
      </div>

      {/* Quick Access Tiles */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-white font-['Rajdhani'] uppercase tracking-wider">
          Módulos de Administración Rápida
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Tile 1: Vouchers */}
          <Link
            to="/sys-admin-auth/deposits"
            className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-emerald-500/50 transition-all group flex items-start justify-between"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Validar Depósitos & Vouchers
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Audita pagos bancarios y Binance con zoom en alta resolución y acreditación atómica.
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-2" />
          </Link>

          {/* Tile 2: Catálogo y Portadas */}
          <Link
            to="/sys-admin-auth/catalog"
            className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/50 transition-all group flex items-start justify-between"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                  Personalizar Portadas & Juegos
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Cambia portadas, banners panorámicos, badges (HOT, VIP) y visibilidad de los 34 juegos.
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-2" />
          </Link>

          {/* Tile 3: Promociones */}
          <Link
            to="/sys-admin-auth/promotions"
            className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-pink-500/50 transition-all group flex items-start justify-between"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-pink-400" />
                <h3 className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors">
                  Promociones & Avisos Web
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Gestiona marquesinas y avisos flotantes en la cabecera de la tienda de recargas.
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-pink-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-2" />
          </Link>

          {/* Tile 4: Circuit Breaker & Umbrales */}
          <Link
            to="/sys-admin-auth/settings"
            className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-amber-500/50 transition-all group flex items-start justify-between"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                  Circuit Breaker & Umbrales
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Monitorea el saldo Canjea en vivo y ajusta los límites de alerta ($50) y pausa ($5).
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-2" />
          </Link>

          {/* Tile 5: Retos y Recompensas */}
          <Link
            to="/sys-admin-auth/rewards"
            className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-purple-500/50 transition-all group flex items-start justify-between"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                  Retos & Recompensas
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Crea campañas de ventas personalizadas con bonos acreditables en saldo virtual.
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-2" />
          </Link>

          {/* Tile 6: Gestión de Usuarios */}
          <Link
            to="/sys-admin-auth/users"
            className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-cyan-500/50 transition-all group flex items-start justify-between"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                  Gestión de Socios & Saldo
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Directorio de cuentas registradas, saldos disponibles y asignación manual directa.
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-2" />
          </Link>
        </div>
      </div>
    </div>
  </div>
  );
};
