import React, { useEffect, useState } from 'react';
import { Order } from '../../../types';
import { adminService } from '../../../services/api/admin.service';
import { PriceDisplay } from '../../../components/molecules/PriceDisplay';
import { Badge } from '../../../components/atoms/Badge';
import { ShoppingBag, RefreshCw, ShieldCheck } from 'lucide-react';

export const GlobalOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = async () => {
    setIsLoading(true);
    const data = await adminService.getGlobalOrders();
    setOrders(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

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
            Auditoría de compras de todos los clientes y despacho de códigos digitales.
          </p>
        </div>

        <button
          onClick={loadOrders}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refrescar Órdenes
        </button>
      </div>

      {/* Orders View */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400 glass-panel rounded-2xl border border-slate-800 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          Cargando historial global de órdenes...
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center glass-panel rounded-2xl border border-slate-800">
          <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-300">No se registran compras todavía.</p>
        </div>
      ) : (
        <>
          {/* Mobile Cards (md:hidden) */}
          <div className="md:hidden space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-sm"
              >
                {/* Top: ID & Status */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-400 font-semibold">
                    {order.id}
                  </span>
                  <Badge variant={order.status === 'completed' ? 'success' : 'warning'}>
                    {order.status === 'completed' ? 'Completado' : order.status}
                  </Badge>
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
                        {order.player_name && (
                          <span className="text-slate-400"> ({order.player_name})</span>
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
              </div>
            ))}
          </div>

          {/* Desktop Table (hidden md:block) */}
          <div className="hidden md:block glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="p-4">ID Orden</th>
                    <th className="p-4">Producto & Juego</th>
                    <th className="p-4">Jugador / ID</th>
                    <th className="p-4">Importe</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4">Código Generado</th>
                    <th className="p-4">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-4 font-mono text-xs text-slate-400 font-semibold">
                        {order.id}
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
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>
                              {order.player_id}{' '}
                              {order.player_name && (
                                <span className="text-slate-400">({order.player_name})</span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 font-mono">N/A (Pin)</span>
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
                          variant={order.status === 'completed' ? 'success' : 'warning'}
                        >
                          {order.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {order.digital_code ? (
                          <code className="text-xs font-mono font-bold text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-cyan-500/20">
                            {order.digital_code}
                          </code>
                        ) : (
                          <span className="text-xs text-slate-500">Directo</span>
                        )}
                      </td>
                      <td className="p-4 text-xs text-slate-400">
                        {new Date(order.created_at).toLocaleString('es-ES', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
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
