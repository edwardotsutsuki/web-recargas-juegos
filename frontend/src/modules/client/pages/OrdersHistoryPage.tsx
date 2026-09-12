import React, { useEffect, useState } from 'react';
import { Order } from '../../../types';
import { ordersService } from '../../../services/api/orders.service';
import { Badge } from '../../../components/atoms/Badge';
import { PriceDisplay } from '../../../components/molecules/PriceDisplay';
import { Copy, Check, Gamepad2, Key, Clock, ShieldCheck } from 'lucide-react';
import { useUIStore } from '../../../store/useUIStore';

export const OrdersHistoryPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const { showToast } = useUIStore();

  useEffect(() => {
    async function loadOrders() {
      setIsLoading(true);
      const data = await ordersService.getMyOrders();
      setOrders(data);
      setIsLoading(false);
    }
    loadOrders();
  }, []);

  const handleCopyCode = (code: string, orderId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(orderId);
    showToast('¡Código copiado al portapapeles!', 'success');
    setTimeout(() => setCopiedCodeId(null), 2500);
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completado</Badge>;
      case 'processing':
        return <Badge variant="warning">Procesando</Badge>;
      case 'failed':
        return <Badge variant="danger">Fallido</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white font-['Rajdhani'] uppercase tracking-wider flex items-center gap-2.5">
          <Key className="w-7 h-7 text-cyan-400" />
          Mis Códigos & Historial de Pedidos
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Accede a todos tus códigos digitales comprados y verifica el estado de tus recargas directas.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800 space-y-3">
          <Gamepad2 className="w-12 h-12 text-slate-700 mx-auto" />
          <h3 className="text-lg font-bold text-white">No tienes compras registradas</h3>
          <p className="text-xs text-slate-400">
            Tus recargas completadas y pines digitales aparecerán aquí una vez realices tu primera orden.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left Details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs font-mono text-slate-500 font-medium">
                    ID: {order.id}
                  </span>
                  {getStatusBadge(order.status)}
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(order.created_at).toLocaleString('es-ES', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                    {order.game}
                  </span>
                  <h3 className="text-base font-bold text-white">{order.product_name}</h3>
                </div>

                {/* Player details if direct recharge */}
                {order.player_id && (
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      Cuenta: <strong className="text-white">{order.player_id}</strong>
                      {order.player_name && ` (${order.player_name})`}
                    </span>
                  </div>
                )}
              </div>

              {/* Right: Code Reveal / Amount */}
              <div className="flex flex-col md:items-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                <PriceDisplay
                  cents={order.amount_cents}
                  currency={order.currency}
                  size="lg"
                  className="text-white"
                />

                {/* Digital code box if delivered */}
                {order.digital_code && (
                  <div className="flex items-center gap-2 bg-slate-950/90 border border-cyan-500/30 px-3 py-1.5 rounded-xl">
                    <code className="text-xs font-mono font-bold text-cyan-300 select-all">
                      {order.digital_code}
                    </code>
                    <button
                      onClick={() => handleCopyCode(order.digital_code!, order.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                      title="Copiar código"
                    >
                      {copiedCodeId === order.id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

