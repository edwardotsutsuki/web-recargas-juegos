import React, { useEffect, useState } from 'react';
import { Order } from '../../../types';
import { adminService } from '../../../services/api/admin.service';
import { PriceDisplay } from '../../../components/molecules/PriceDisplay';
import { Badge } from '../../../components/atoms/Badge';
import { useUIStore } from '../../../store/useUIStore';
import { ShoppingBag, RefreshCw, ShieldCheck, Search, Filter, User, AlertCircle, Clock, Zap, MessageCircle, XCircle, AlertTriangle, X } from 'lucide-react';

export const GlobalOrdersPage: React.FC = () => {
  const { showToast } = useUIStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [providerBalance, setProviderBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [retryingOrderId, setRetryingOrderId] = useState<string | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'processing' | 'failed' | 'refunded'>('all');
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const handleOpenCancelModal = (order: Order) => {
    setCancellingOrder(order);
    setCancelReason('Cancelada por administración. Saldo reembolsado a tu billetera disponible.');
  };

  const handleConfirmCancelOrder = async () => {
    if (!cancellingOrder) return;
    try {
      setIsCancelling(true);
      const res = await adminService.cancelOrder(cancellingOrder.id, cancelReason);
      showToast(res.message || 'Orden cancelada y fondos devueltos con éxito', 'success');
      setCancellingOrder(null);
      await loadOrders(false);
    } catch (err: any) {
      showToast(err.message || 'Error al cancelar y reembolsar la orden', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const loadOrders = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const [data, statusData] = await Promise.all([
        adminService.getGlobalOrders(),
        adminService.getSystemStatus(false).catch(() => null),
      ]);
      setOrders(data);
      if (statusData?.canjea_balance) {
        setProviderBalance(statusData.canjea_balance);
      }
    } catch (err) {
      console.error('Error cargando órdenes globales:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const handleRetryOrder = async (orderId: string) => {
    try {
      setRetryingOrderId(orderId);
      const res = await adminService.retryOrder(orderId);
      showToast(res.message || 'Orden reactivada en la cola', 'success');
      await loadOrders(false);
    } catch (err: any) {
      showToast(err.message || 'Error al reintentar orden', 'error');
    } finally {
      setRetryingOrderId(null);
    }
  };

  const handleTriggerWaiting = async () => {
    try {
      setIsTriggering(true);
      const res = await adminService.triggerWaitingOrders();
      showToast(res.message, 'success');
      if (res.canjea_balance) {
        setProviderBalance(res.canjea_balance);
      }
      await loadOrders(false);
    } catch (err: any) {
      showToast(err.message || 'Error al despachar cola', 'error');
    } finally {
      setIsTriggering(false);
    }
  };

  useEffect(() => {
    loadOrders(true);
  }, []);

  // Auto-refresh cada 15 segundos si está activado
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadOrders(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const uniqueGames = Array.from(new Set(orders.map((o) => o.game).filter(Boolean)));

  const isCancellable = (order: Order) => {
    return (
      order.status !== 'completed' &&
      order.status !== 'refunded' &&
      order.failure_code !== 'CANCELLED_BY_ADMIN' &&
      order.failure_code !== 'REFUNDED_BY_PROVIDER'
    );
  };

  const filteredOrders = orders.filter((o) => {
    const isRefunded = o.status === 'refunded' || o.failure_code === 'CANCELLED_BY_ADMIN' || o.failure_code === 'REFUNDED_BY_PROVIDER';
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'completed'
        ? o.status === 'completed'
        : statusFilter === 'processing'
        ? !isRefunded && (o.status === 'processing' || o.status === 'pending' || o.status === 'orphaned' || o.failure_code === 'WAITING_PROVIDER_BALANCE')
        : statusFilter === 'refunded'
        ? isRefunded
        : !isRefunded && (o.status === 'failed' || o.status === 'cancelled');

    const matchesGame = selectedGame === 'all' || o.game === selectedGame;

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      o.id.toLowerCase().includes(q) ||
      (o.product_name && o.product_name.toLowerCase().includes(q)) ||
      (o.game && o.game.toLowerCase().includes(q)) ||
      (o.player_id && o.player_id.toLowerCase().includes(q)) ||
      (o.player_name && o.player_name.toLowerCase().includes(q)) ||
      (o.user_email && o.user_email.toLowerCase().includes(q));

    return matchesStatus && matchesGame && matchesSearch;
  });

  const countByStatus = {
    all: orders.length,
    completed: orders.filter((o) => o.status === 'completed').length,
    processing: orders.filter((o) => (o.status === 'processing' || o.status === 'pending' || o.status === 'orphaned' || o.failure_code === 'WAITING_PROVIDER_BALANCE') && o.failure_code !== 'CANCELLED_BY_ADMIN' && o.failure_code !== 'REFUNDED_BY_PROVIDER').length,
    refunded: orders.filter((o) => o.status === 'refunded' || o.failure_code === 'CANCELLED_BY_ADMIN' || o.failure_code === 'REFUNDED_BY_PROVIDER').length,
    failed: orders.filter((o) => (o.status === 'failed' || o.status === 'cancelled') && o.failure_code !== 'CANCELLED_BY_ADMIN' && o.failure_code !== 'REFUNDED_BY_PROVIDER').length,
  };

  const renderStatusBadge = (order: Order) => {
    if (order.status === 'completed') {
      return <Badge variant="success">Completado</Badge>;
    }
    if (order.status === 'refunded' || order.failure_code === 'CANCELLED_BY_ADMIN' || order.failure_code === 'REFUNDED_BY_PROVIDER') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 whitespace-nowrap">
          ↩️ Reembolsado
        </span>
      );
    }
    if (order.status === 'orphaned' || order.failure_code === 'ORPHANED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          Huérfana (En Revisión)
        </span>
      );
    }
    if (order.failure_code === 'WAITING_PROVIDER_BALANCE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          En Cola Proveedor
        </span>
      );
    }
    if (order.status === 'failed' || order.status === 'cancelled') {
      return <Badge variant="danger">Fallido</Badge>;
    }
    return <Badge variant="warning">Procesando</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-['Rajdhani'] uppercase tracking-wider flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-cyan-500 dark:text-cyan-400" />
            Monitoreo de Órdenes Globales
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Auditoría en tiempo real de compras, revendedores y despacho de recargas gamer.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              autoRefresh
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse' : 'bg-slate-400 dark:bg-slate-500'}`} />
            {autoRefresh ? 'En Vivo (15s)' : 'Pausado'}
          </button>

          <button
            onClick={() => loadOrders(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refrescar
          </button>
        </div>
      </div>

      {/* Banner de Saldo Proveedor Canjea y Encolado Inteligente */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Saldo Proveedor Canjea:
              </span>
              <span className="text-sm font-black text-cyan-400 font-mono">
                ${providerBalance || '0.00'} USD
              </span>
              {Number(providerBalance || 0) < 10 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Saldo Bajo
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Encolado Inteligente activo: Las órdenes sin saldo suficiente esperan automáticamente y se envían apenas recargues.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isTriggering}
            onClick={handleTriggerWaiting}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTriggering ? 'animate-spin' : ''}`} />
            Despachar Cola Ahora
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Buscador */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por ID, juego, jugador, revendedor..."
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-sm"
            />
          </div>

          {/* Filtro por Juego */}
          <div className="flex items-center gap-2 min-w-[200px]">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              className="w-full py-2 px-3 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 shadow-sm"
            >
              <option value="all">Todos los Juegos ({uniqueGames.length})</option>
              {uniqueGames.map((game) => (
                <option key={game} value={game}>
                  {game}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pestañas de Estado */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200 dark:border-slate-800/60">
          {(
            [
              { id: 'all', label: 'Todas', count: countByStatus.all, color: 'text-slate-700 dark:text-slate-300' },
              { id: 'completed', label: 'Completadas', count: countByStatus.completed, color: 'text-emerald-600 dark:text-emerald-400' },
              { id: 'processing', label: 'En Proceso', count: countByStatus.processing, color: 'text-amber-600 dark:text-amber-400' },
              { id: 'refunded', label: 'Reembolsadas', count: countByStatus.refunded, color: 'text-purple-600 dark:text-purple-400' },
              { id: 'failed', label: 'Fallidas', count: countByStatus.failed, color: 'text-red-600 dark:text-red-400' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/40 shadow-xs'
                  : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono ${tab.color}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Orders View */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400 glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-500 dark:text-cyan-400" />
          Cargando historial global de órdenes...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center glass-panel rounded-2xl border border-slate-200 dark:border-slate-800">
          <ShoppingBag className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No se encontraron órdenes con estos filtros.</p>
        </div>
      ) : (
        <>
          {/* Mobile Cards (md:hidden) */}
          <div className="md:hidden space-y-3">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm"
              >
                {/* Top: ID & Status */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    {order.id.slice(0, 12)}...
                  </span>
                  {renderStatusBadge(order)}
                </div>

                {/* Revendedor */}
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <User className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span className="font-mono truncate">{order.user_email || 'Revendedor'}</span>
                </div>

                {/* Product & Game */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                      {order.game}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{order.product_name}</h4>
                  </div>
                  <PriceDisplay
                    cents={order.amount_cents}
                    currency={order.currency}
                    size="md"
                    className="text-emerald-600 dark:text-emerald-400 font-black"
                  />
                </div>

                {/* Player info or Code */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-xs">
                  {order.player_id ? (
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        ID: <strong className="text-slate-900 dark:text-white">{order.player_id}</strong>
                        {order.player_server && (
                          <span className="text-slate-500 dark:text-slate-400"> ({order.player_server})</span>
                        )}
                        {order.player_name && (
                          <span className="text-slate-500 dark:text-slate-400"> - {order.player_name}</span>
                        )}
                      </span>
                    </div>
                  ) : order.digital_code ? (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">Pin:</span>
                      <code className="text-xs font-mono font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-500/30">
                        {order.digital_code}
                      </code>
                    </div>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">Recarga Directa</span>
                  )}

                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(order.created_at).toLocaleString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {(order.failure_code === 'CANCELLED_BY_ADMIN' || order.failure_code === 'REFUNDED_BY_PROVIDER') ? (
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span className="truncate">Cancelado & Reembolsado: {order.last_error_message || 'Fondos devueltos al cliente'}</span>
                  </div>
                ) : (order.status !== 'completed' && order.status !== 'refunded') && order.failure_code === 'WAITING_PROVIDER_BALANCE' ? (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                      <span>En cola: Esperando saldo de proveedor</span>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        disabled={retryingOrderId === order.id}
                        onClick={() => handleRetryOrder(order.id)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1 transition-all disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${retryingOrderId === order.id ? 'animate-spin' : ''}`} />
                        Reintentar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenCancelModal(order)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold border border-rose-500/30 flex items-center gap-1 transition-all"
                      >
                        <XCircle className="w-3 h-3 text-rose-400" />
                        Cancelar & Reembolsar
                      </button>
                    </div>
                  </div>
                ) : (order.status === 'orphaned' || order.failure_code === 'ORPHANED') ? (
                  <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      <span className="truncate">{order.last_error_message || 'Transacción ambigua en Canjea'}</span>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <a
                        href={`https://wa.me/51973581378?text=${encodeURIComponent(`Hola Soporte Canjea, solicito revisar la orden ${order.id} con estado ambiguo/huérfano.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 transition-all shrink-0"
                      >
                        <MessageCircle className="w-3 h-3" />
                        Soporte
                      </a>
                      <button
                        type="button"
                        onClick={() => handleOpenCancelModal(order)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold border border-rose-500/30 flex items-center gap-1 transition-all"
                      >
                        <XCircle className="w-3 h-3 text-rose-400" />
                        Cancelar & Reembolsar
                      </button>
                    </div>
                  </div>
                ) : (order.status !== 'completed' && order.status !== 'refunded') && order.failure_code ? (
                  <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Error: {order.last_error_message || order.failure_code}</span>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        disabled={retryingOrderId === order.id}
                        onClick={() => handleRetryOrder(order.id)}
                        className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[10px] font-bold border border-red-500/30 flex items-center gap-1 transition-all disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${retryingOrderId === order.id ? 'animate-spin' : ''}`} />
                        Reintentar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenCancelModal(order)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold border border-rose-500/30 flex items-center gap-1 transition-all"
                      >
                        <XCircle className="w-3 h-3 text-rose-400" />
                        Cancelar & Reembolsar
                      </button>
                    </div>
                  </div>
                ) : isCancellable(order) ? (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenCancelModal(order)}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 text-[10px] font-bold border border-rose-500/30 flex items-center gap-1 transition-all"
                    >
                      <XCircle className="w-3 h-3 text-rose-400" />
                      Cancelar & Reembolsar
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {/* Desktop Table (hidden md:block) */}
          <div className="hidden md:block glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-100/90 dark:bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    <th className="p-4">ID Orden</th>
                    <th className="p-4">Revendedor / Cliente</th>
                    <th className="p-4">Producto & Juego</th>
                    <th className="p-4">Datos Jugador</th>
                    <th className="p-4">Importe</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4">Entrega</th>
                    <th className="p-4">Fecha</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 text-sm">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="p-4 font-mono text-xs text-slate-500 dark:text-slate-400 font-semibold">
                        <span title={order.id}>{order.id.slice(0, 10)}...</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <User className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                          <span className="font-mono text-xs text-slate-900 dark:text-white" title={order.user_email}>
                            {order.user_email || 'Revendedor'}
                          </span>
                        </div>
                        {order.user_name && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block ml-5">
                            {order.user_name}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase block">
                          {order.game}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">{order.product_name}</span>
                      </td>
                      <td className="p-4">
                        {order.player_id ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <div>
                              <span className="font-mono font-bold text-slate-900 dark:text-white">ID: {order.player_id}</span>
                              {order.player_server && (
                                <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Zona: {order.player_server}</span>
                              )}
                              {order.player_name && (
                                <span className="text-slate-500 dark:text-slate-400 text-[11px] block">({order.player_name})</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">N/A (Pin/Código)</span>
                        )}
                      </td>
                      <td className="p-4">
                        <PriceDisplay
                          cents={order.amount_cents}
                          currency={order.currency}
                          size="sm"
                          className="text-slate-900 dark:text-white font-bold"
                        />
                      </td>
                      <td className="p-4">
                        {renderStatusBadge(order)}
                        {(order.status === 'orphaned' || order.failure_code === 'ORPHANED') && (
                          <div className="mt-1.5">
                            <a
                              href={`https://wa.me/51973581378?text=${encodeURIComponent(`Hola Soporte Canjea, solicito revisar la orden ${order.id} con estado ambiguo/huérfano.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 transition-all"
                            >
                              <MessageCircle className="w-2.5 h-2.5" />
                              Soporte Canjea
                            </a>
                          </div>
                        )}
                        {(order.status !== 'completed' && order.status !== 'refunded') && order.failure_code === 'WAITING_PROVIDER_BALANCE' && (
                          <div className="mt-1.5">
                            <button
                              type="button"
                              disabled={retryingOrderId === order.id}
                              onClick={() => handleRetryOrder(order.id)}
                              className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1 transition-all disabled:opacity-50"
                            >
                              <RefreshCw className={`w-2.5 h-2.5 ${retryingOrderId === order.id ? 'animate-spin' : ''}`} />
                              Reintentar
                            </button>
                          </div>
                        )}
                        {order.status === 'failed' && order.failure_code && order.failure_code !== 'WAITING_PROVIDER_BALANCE' && order.failure_code !== 'CANCELLED_BY_ADMIN' && order.failure_code !== 'REFUNDED_BY_PROVIDER' && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] text-red-600 dark:text-red-400 font-mono" title={order.last_error_message || order.failure_code}>
                              {order.failure_code}
                            </span>
                            <button
                              type="button"
                              disabled={retryingOrderId === order.id}
                              onClick={() => handleRetryOrder(order.id)}
                              className="px-1.5 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[9px] font-bold border border-red-500/20 flex items-center gap-0.5 transition-all disabled:opacity-50"
                              title="Reintentar despacho"
                            >
                              <RefreshCw className={`w-2 h-2 ${retryingOrderId === order.id ? 'animate-spin' : ''}`} />
                              Reenviar
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {order.digital_code ? (
                          <code className="text-xs font-mono font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-slate-950 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-500/20">
                            {order.digital_code}
                          </code>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">Directa API</span>
                        )}
                      </td>
                      <td className="p-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          <span>
                            {new Date(order.created_at).toLocaleString('es-ES', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        {isCancellable(order) ? (
                          <button
                            type="button"
                            onClick={() => handleOpenCancelModal(order)}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 hover:text-rose-400 text-xs font-bold border border-rose-500/30 inline-flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                            title="Cancelar orden y reembolsar saldo al cliente"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                            Cancelar & Reembolsar
                          </button>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal de Confirmación de Cancelación y Reembolso */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
            <button
              type="button"
              onClick={() => !isCancelling && setCancellingOrder(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white font-['Rajdhani'] uppercase tracking-wider">
                  Cancelar Orden y Reembolsar Fondos
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Acción administrativa segura e inmediata
                </p>
              </div>
            </div>

            {/* Resumen de la Orden */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">ID Orden:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{cancellingOrder.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Cliente / Revendedor:</span>
                <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[240px]">
                  {cancellingOrder.user_email || cancellingOrder.user_name || 'Revendedor'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Producto:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {cancellingOrder.game} &bull; {cancellingOrder.product_name}
                </span>
              </div>
              {cancellingOrder.player_id && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">ID Jugador:</span>
                  <span className="font-mono text-slate-900 dark:text-white">
                    {cancellingOrder.player_id} {cancellingOrder.player_name ? `(${cancellingOrder.player_name})` : ''}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-700 dark:text-slate-300">Importe a Reembolsar:</span>
                <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                  ${(cancellingOrder.amount_cents / 100).toFixed(2)} {cancellingOrder.currency || 'USD'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <p>
                Al confirmar, el dinero será restituido <strong>inmediatamente</strong> al saldo disponible de la billetera del cliente. La orden pasará a estado cancelado y se detendrá la cola en el sistema.
              </p>
            </div>

            {/* Motivo de Cancelación */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                Motivo / Notificación al Cliente:
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Escribe el motivo del reembolso que el cliente verá en su reporte..."
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 resize-none font-sans"
              />
            </div>

            {/* Botones de acción */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setCancellingOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={isCancelling || !cancelReason.trim()}
                onClick={handleConfirmCancelOrder}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-rose-600/20 disabled:opacity-50 active:scale-95 cursor-pointer"
              >
                {isCancelling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Procesando Reembolso...
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    Confirmar Cancelación & Reembolso
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

