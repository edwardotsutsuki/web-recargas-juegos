import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, RefreshCw, LogOut, Server, AlertTriangle, CheckCircle2, Smartphone } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { adminService } from '../../services/api/admin.service';

export const AdminTopBar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [providerBalance, setProviderBalance] = useState<string>('0.00');
  const [currency, setCurrency] = useState<string>('USD');
  const [circuitBreaker, setCircuitBreaker] = useState<boolean>(false);
  const [alertLevel, setAlertLevel] = useState<string>('normal');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchProviderStatus = async (forceRefresh = false) => {
    try {
      setIsRefreshing(true);
      const res = await adminService.getSystemStatus(forceRefresh);
      if (res) {
        setProviderBalance(res.canjea_balance || '0.00');
        setCurrency(res.currency || 'USD');
        setCircuitBreaker(Boolean(res.circuit_breaker_active));
        setAlertLevel(res.alert_level || 'normal');
      }
    } catch (err) {
      console.error('Error al obtener estado del proveedor Canjea:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProviderStatus(false);
    // Intervalo de chequeo cada 60 segundos
    const interval = setInterval(() => fetchProviderStatus(false), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/sys-admin-auth/login');
  };

  const getStatusBadge = () => {
    if (circuitBreaker || alertLevel === 'critical') {
      return (
        <span className="flex items-center gap-1 text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
          <AlertTriangle className="w-3 h-3" /> Canjea Crítico / Detenido
        </span>
      );
    }
    if (alertLevel === 'warning') {
      return (
        <span className="flex items-center gap-1 text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
          <AlertTriangle className="w-3 h-3" /> Saldo Bajo
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
        <CheckCircle2 className="w-3 h-3" /> Proveedor Online
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand & Badge */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link to="/sys-admin-auth" className="flex items-center gap-2 group">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white text-sm sm:text-base tracking-tight">
                  <span className="hidden sm:inline">Recargas Juegos Online</span>
                  <span className="sm:hidden">Admin Pro</span>
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase font-black px-1.5 sm:px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  SYS
                </span>
              </div>
              <span className="text-[10px] text-slate-400 hidden sm:block">Centro de Control y Monitoreo</span>
            </div>
          </Link>
        </div>

        {/* Live Canjea Provider Balance Widget */}
        <div className="flex items-center gap-2 sm:gap-6">
          {/* Mobile compact balance */}
          <div className="sm:hidden bg-slate-900/90 border border-slate-800 rounded-xl px-2 py-1 flex items-center gap-1.5 shadow-inner">
            <div className="flex flex-col">
              <span className="text-[8px] uppercase font-bold text-slate-400 leading-none">Proveedor</span>
              <span className="text-xs font-black text-emerald-400 font-mono leading-tight">
                ${Number(providerBalance).toFixed(2)}
              </span>
            </div>
            <button
              onClick={() => fetchProviderStatus(true)}
              disabled={isRefreshing}
              title="Sincronizar"
              className="p-1 text-slate-400 hover:text-cyan-400 active:scale-95"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>

          {/* Desktop full balance widget */}
          <div className="hidden sm:flex bg-slate-900/90 border border-slate-800 rounded-2xl px-3.5 py-1.5 items-center gap-3 shadow-inner">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Server className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Saldo Proveedor (Canjea)
                </span>
                {getStatusBadge()}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-white">
                  ${Number(providerBalance).toFixed(2)} <span className="text-xs font-normal text-slate-400">{currency}</span>
                </span>
                <button
                  onClick={() => fetchProviderStatus(true)}
                  disabled={isRefreshing}
                  title="Sincronizar saldo con API de Canjea"
                  className="p-1 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Admin User Info & Actions */}
          <div className="flex items-center gap-2 sm:gap-3 border-l border-slate-800 pl-2 sm:pl-6">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200">
                {user?.fullName || 'Super Admin'}
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">
                {user?.email || 'b.edumalta@gmail.com'}
              </span>
            </div>

            <a
              href="/downloads/recargas-admin.apk"
              download="RecargasAdmin-Pro.apk"
              title="Descargar APK de Administrador para tu celular Android"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/40 text-xs font-bold text-purple-300 hover:text-purple-200 transition-colors shadow-sm"
            >
              <Smartphone className="w-3.5 h-3.5 text-purple-400" />
              <span>App Admin</span>
              <span className="px-1 py-0.2 rounded text-[9px] font-black bg-purple-500/40 text-purple-200 uppercase">APK</span>
            </a>

            <button
              onClick={handleLogout}
              title="Cerrar sesión de Administrador"
              className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

