import React, { useEffect, useState } from 'react';
import { Order } from '../../../types';
import { adminService } from '../../../services/api/admin.service';
import { PriceDisplay } from '../../../components/molecules/PriceDisplay';
import { Badge } from '../../../components/atoms/Badge';
import { ShoppingBag, RefreshCw, ShieldCheck, Search, Filter, User, AlertCircle, Clock } from 'lucide-react';

export const GlobalOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'processing' | 'failed'>('all');
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadOrders = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const data = await adminService.getGlobalOrders();
      setOrders(data);
    } catch (err) {
      console.error('Error cargando órdenes globales:', err);
    } finally {
      if (showLoading) setIsLoading(false);
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

  const filteredOrders = orders.filter((o) => {
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'completed'
        ? o.status === 'completed'
        : statusFilter === 'processing'
        ? o.status === 'processing' || o.status === 'pending'
        : o.status === 'failed' || o.status === 'cancelled';

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
    processing: orders.filter((o) => o.status === 'processing' || o.status === 'pending').length,
    failed: orders.filter((o) => o.status === 'failed' || o.status === 'cancelled').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Rajdhani'] uppercase tracking-wider flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-cyan-400" />
            Monitoreo de Órdenes Globales
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Auditoría en tiempo real de compras, revendedores y despacho de recargas gamer.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              autoRefresh
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            {autoRefresh ? 'En Vivo (15s)' : 'Pausado'}
          </button>

          <button
            onClick={() => loadOrders(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refrescar
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Buscador */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por ID, juego, jugador, revendedor..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Filtro por Juego */}
          <div className="flex items-center gap-2 min-w-[200px]">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              className="w-full py-2 px-3 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
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
        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-800/60">
          {(
            [
              { id: 'all', label: 'Todas', count: countByStatus.all, color: 'text-slate-300' },
              { id: 'completed', label: 'Completadas', count: countByStatus.completed, color: 'text-emerald-400' },
              { id: 'processing', label: 'En Proceso', count: countByStatus.processing, color: 'text-amber-400' },
              { id: 'failed', label: 'Fallidas', count: countByStatus.failed, color: 'text-red-400' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md bg-slate-800 text-[10px] font-mono ${tab.color}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Orders View */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400 glass-panel rounded-2xl border border-slate-800 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          Cargando historial global de órdenes...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center glass-panel rounded-2xl border border-slate-800">
          <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-300">No se encontraron órdenes con estos filtros.</p>
        </div>
      ) : (
        <>
          {/* Mobile Cards (md:hidden) */}
          <div className="md:hidden space-y-3">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-sm"
              >
                {/* Top: ID & Status */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-400 font-semibold">
                    {order.id.slice(0, 12)}...
                  </span>
                  <Badge
                    variant={
                      order.status === 'completed'
                        ? 'success'
                        : order.status === 'failed' || order.status === 'cancelled'
                        ? 'danger'
                        : 'warning'
                    }
                  >
                    {order.status === 'completed'
                      ? 'Completado'
                      : order.status === 'failed'
                      ? 'Fallido'
                      : 'Procesando'}
                  </Badge>
                </div>

                {/* Revendedor */}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="font-mono truncate">{order.user_email || 'Revendedor'}</span>
                </div>

                {/* Product & Game */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider block">
                      {order.game}
                    </span>
                    <h4 className="font-bold text-sm text-white">{order.product_name}</h4>
                  </div>
                  <PriceDisplay
                    cents={order.amount_cents}
                    currency={order.currency}
                    size="md"
                    className="text-emerald-400 font-black"
                  />
                </div>

                {/* Player info or Code */}
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between text-xs">
                  {order.player_id ? (
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>
                        ID: <strong className="text-white">{order.player_id}</strong>
                        {order.player_server && (
                          <span className="text-slate-400"> ({order.player_server})</span>
                        )}
                        {order.player_name && (
                          <span className="text-slate-400"> - {order.player_name}</span>
                        )}
                      </span>
                    </div>
                  ) : order.digital_code ? (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px]">Pin:</span>
                      <code className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-500/30">
                        {order.digital_code}
                      </code>
                    </div>
                  ) : (
                    <span className="text-slate-500">Recarga Directa</span>
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

                {order.failure_code && (
                  <div className="p-2 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-[11px] flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Error: {order.failure_code}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table (hidden md:block) */}
          <div className="hidden md:block glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="p-4">ID Orden</th>
                    <th className="p-4">Revendedor / Cliente</th>
                    <th className="p-4">Producto & Juego</th>
                    <th className="p-4">Datos Jugador</th>
                    <th className="p-4">Importe</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4">Entrega</th>
                    <th className="p-4">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-4 font-mono text-xs text-slate-400 font-semibold">
                        <span title={order.id}>{order.id.slice(0, 10)}...</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-300">
                          <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="font-mono text-xs text-white" title={order.user_email}>
                            {order.user_email || 'Revendedor'}
                          </span>
                        </div>
                        {order.user_name && (
                          <span className="text-[10px] text-slate-400 block ml-5">
                            {order.user_name}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase block">
                          {order.game}
                        </span>
                        <span className="font-semibold text-white">{order.product_name}</span>
                      </td>
                      <td className="p-4">
                        {order.player_id ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-300">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <div>
                              <span className="font-mono font-bold text-white">ID: {order.player_id}</span>
                              {order.player_server && (
                                <span className="text-slate-400 text-[11px] block">Zona: {order.player_server}</span>
                              )}
                              {order.player_name && (
                                <span className="text-slate-400 text-[11px] block">({order.player_name})</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 font-mono">N/A (Pin/Código)</span>
                        )}
                      </td>
                      <td className="p-4">
                        <PriceDisplay
                          cents={order.amount_cents}
                          currency={order.currency}
                          size="sm"
                          className="text-white font-bold"
                        />
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            order.status === 'completed'
                              ? 'success'
                              : order.status === 'failed' || order.status === 'cancelled'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {order.status === 'completed'
                            ? 'Completado'
                            : order.status === 'failed'
                            ? 'Fallido'
                            : 'Procesando'}
                        </Badge>
                        {order.failure_code && (
                          <span className="text-[10px] text-red-400 font-mono block mt-1">
                            {order.failure_code}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {order.digital_code ? (
                          <code className="text-xs font-mono font-bold text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-cyan-500/20">
                            {order.digital_code}
                          </code>
                        ) : (
                          <span className="text-xs text-slate-500">Directa API</span>
                        )}
                      </td>
                      <td className="p-4 text-xs text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>
                            {new Date(order.created_at).toLocaleString('es-ES', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

