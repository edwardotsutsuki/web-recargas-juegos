import { VoucherCard } from '../../../components/molecules/VoucherCard';
import { extractOrderVoucher } from '../../../utils/voucherHelpers';
import { supabase } from '../../../services/supabase/client';
import React, { useEffect, useState, useMemo } from 'react';
import { Order, CustomPrice } from '../../../types';
import { ordersService } from '../../../services/api/orders.service';
import { resellerService } from '../../../services/api/reseller.service';
import { Badge } from '../../../components/atoms/Badge';
import { useUIStore } from '../../../store/useUIStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import {
  Copy,
  Check,
  Gamepad2,
  Key,
  Clock,
  ShieldCheck,
  BookOpen,
  Printer,
  Search,
  User,
  Calendar,
  Eye,
  ArrowLeft,
} from 'lucide-react';
import {
  ThermalTicketData,
  thermalTicketService,
} from '../../../services/thermalTicketService';
import { ThermalTicketPreviewModal } from '../../../components/molecules/ThermalTicketPreviewModal';

export const OrdersHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { isCashier, operatorName, storeSlug, user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customPricesMap, setCustomPricesMap] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [expandedInstructions, setExpandedInstructions] = useState<Record<string, boolean>>({});
  const { showToast } = useUIStore();

  // Estados de filtrado
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'all' | 'today' | 'week'>('all');

  // Modal de vista previa e impresión de ticket
  const [previewTicketData, setPreviewTicketData] = useState<ThermalTicketData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [ordersData, pricesData] = await Promise.all([
          ordersService.getMyOrders(),
          resellerService.getCustomPrices().catch(() => [] as CustomPrice[]),
        ]);
        setOrders(ordersData);

        if (Array.isArray(pricesData) && pricesData.length > 0) {
          const map: Record<string, number> = {};
          for (const cp of pricesData) {
            map[cp.sku] = cp.custom_pvp_cents;
          }
          setCustomPricesMap(map);
        }
      } catch (err) {
        console.error('Error cargando historial de pedidos y precios:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();

    // Actualización en tiempo real (Supabase Realtime)
    if (user?.id) {
      const channel = supabase
        .channel(`orders-history-live-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            ordersService.getMyOrders().then((updated) => setOrders(updated)).catch(() => {});
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  const handleCopyCode = (code: string, orderId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(orderId);
    showToast('¡Código copiado al portapapeles!', 'success');
    setTimeout(() => setCopiedCodeId(null), 2500);
  };

  // Cálculo preciso del PVP (Precio de Venta al Cliente)
  const getOrderPvpDollars = (order: Order): number => {
    // 1. Si la orden tiene registrado el precio de venta final (PVP) guardado en su emisión
    if (order.custom_pvp_cents && order.custom_pvp_cents > 0) {
      return order.custom_pvp_cents / 100;
    }
    // 2. Si el revendedor tiene configurado un PVP para este paquete/sku
    if (order.product_id && customPricesMap[order.product_id]) {
      return customPricesMap[order.product_id] / 100;
    }
    // 3. Margen sugerido de venta (+15%)
    return Math.round(order.amount_cents * 1.15) / 100;
  };

  const handleDirectPrint = (order: Order) => {
    const pvpDollars = getOrderPvpDollars(order);
    const ticketData: ThermalTicketData = {
      orderId: order.id,
      game: order.game,
      productName: order.product_name,
      playerId: order.player_id,
      playerName: order.player_name,
      playerServer: order.player_server,
      digitalCode: order.digital_code,
      redeemInstructions: order.redeem_instructions,
      priceDollars: pvpDollars,
      currency: order.currency || 'USD',
      operatorName: order.operator_name || operatorName,
      storeName: storeSlug ? `LOCAL: ${storeSlug.toUpperCase()}` : 'RECARGAS JUEGOS PRO',
      createdAt: order.created_at,
      isReprint: true,
    };

    thermalTicketService.printThermalTicket(ticketData);
    showToast('Enviando ticket a la impresora térmica (80mm)...', 'info');
  };

  const handleOpenPreview = (order: Order) => {
    const pvpDollars = getOrderPvpDollars(order);
    const ticketData: ThermalTicketData = {
      orderId: order.id,
      game: order.game,
      productName: order.product_name,
      playerId: order.player_id,
      playerName: order.player_name,
      playerServer: order.player_server,
      digitalCode: order.digital_code,
      redeemInstructions: order.redeem_instructions,
      priceDollars: pvpDollars,
      currency: order.currency || 'USD',
      operatorName: order.operator_name || operatorName,
      storeName: storeSlug ? `LOCAL: ${storeSlug.toUpperCase()}` : 'RECARGAS JUEGOS PRO',
      createdAt: order.created_at,
      isReprint: true,
    };
    setPreviewTicketData(ticketData);
    setIsPreviewOpen(true);
  };

  // Lista de operadores únicos detectados en las órdenes (para el dueño)
  const uniqueOperators = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.operator_name && o.operator_name.trim()) {
        set.add(o.operator_name.trim().toLowerCase());
      }
    });
    return Array.from(set);
  }, [orders]);

  // Filtrado estricto por permisos de cajero vs dueño
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. REGLA DE SEGURIDAD PARA CAJEROS:
      // Si es cajero, SOLO puede ver sus propias ventas.
      if (isCashier && operatorName) {
        const orderOp = (order.operator_name || '').trim().toLowerCase();
        const currentOp = operatorName.trim().toLowerCase();
        if (orderOp !== currentOp) {
          return false;
        }
      }

      // 2. Filtro de Operador (Para el dueño con panel completo)
      if (!isCashier && selectedOperatorFilter !== 'all') {
        const orderOp = (order.operator_name || '').trim().toLowerCase();
        if (orderOp !== selectedOperatorFilter.toLowerCase()) {
          return false;
        }
      }

      // 3. Filtro por Fecha
      if (selectedDateFilter !== 'all') {
        const orderDate = new Date(order.created_at);
        const now = new Date();
        if (selectedDateFilter === 'today') {
          const isToday =
            orderDate.getDate() === now.getDate() &&
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getFullYear() === now.getFullYear();
          if (!isToday) return false;
        } else if (selectedDateFilter === 'week') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          if (orderDate < sevenDaysAgo) return false;
        }
      }

      // 4. Búsqueda por texto (ID, Juego, Producto, Código PIN, ID Jugador)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = order.id.toLowerCase().includes(q);
        const matchesGame = order.game.toLowerCase().includes(q);
        const matchesProduct = order.product_name.toLowerCase().includes(q);
        const matchesPin = (order.digital_code || '').toLowerCase().includes(q);
        const matchesPlayer = (order.player_id || '').toLowerCase().includes(q);
        const matchesOp = (order.operator_name || '').toLowerCase().includes(q);

        if (
          !matchesId &&
          !matchesGame &&
          !matchesProduct &&
          !matchesPin &&
          !matchesPlayer &&
          !matchesOp
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    orders,
    isCashier,
    operatorName,
    selectedOperatorFilter,
    selectedDateFilter,
    searchQuery,
  ]);

  const getStatusBadge = (order: Order) => {
    switch (order.status) {
      case 'completed':
        return <Badge variant="success">Completado</Badge>;
      case 'processing':
      case 'pending':
        if (order.failure_code === 'WAITING_PROVIDER_BALANCE') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 whitespace-nowrap">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              En cola de despacho
            </span>
          );
        }
        return <Badge variant="warning">Procesando</Badge>;
      case 'failed':
        return <Badge variant="danger">Fallido</Badge>;
      default:
        return <Badge variant="neutral">{order.status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fade-in">
      {/* Título de la Sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button
              type="button"
              onClick={() => navigate('/catalog')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700/90 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200 dark:border-slate-700/80 active:scale-95 shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-500" />
              <span>Volver a Catálogo</span>
            </button>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-['Rajdhani'] uppercase tracking-wider flex items-center gap-2.5">
            <Key className="w-7 h-7 text-cyan-500 dark:text-cyan-400" />
            {isCashier ? 'Mis Ventas & Tickets (Cajero)' : 'Historial de Pedidos & Reimpresión'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isCashier
              ? `Consulta tus ventas asignadas y reimprime los comprobantes térmicos de tus clientes.`
              : `Gestiona todas las compras, filtra por cajero o fecha y reimprime tickets térmicos de 80mm.`}
          </p>
        </div>

        {/* Badge de Seguridad para Cajero */}
        {isCashier && operatorName && (
          <div className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-500/40 text-cyan-800 dark:text-cyan-300 text-xs font-bold flex items-center gap-2 shadow-xs">
            <User className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Cajero Activo: <strong className="text-cyan-950 dark:text-white uppercase">{operatorName}</strong></span>
          </div>
        )}
      </div>

      {/* Banner Informativo de Restricción para Cajero */}
      {isCashier && (
        <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <p>
            <strong>Privacidad de Caja:</strong> Por políticas de seguridad de la tienda, solo puedes visualizar y reimprimir tickets de las ventas generadas bajo tu usuario de cajero (<strong>{operatorName}</strong>).
          </p>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs dark:shadow-md space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Buscador */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por ID, juego, pin o cliente..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-medium focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Filtro de Fecha */}
          <div className={`${isCashier ? 'sm:col-span-6' : 'sm:col-span-3'} flex items-center gap-1.5`}>
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedDateFilter}
              onChange={(e: any) => setSelectedDateFilter(e.target.value)}
              className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Todas las Fechas</option>
              <option value="today">Ventas de Hoy</option>
              <option value="week">Últimos 7 Días</option>
            </select>
          </div>

          {/* Filtro de Cajero (Solo visible para el Propietario / Dueño) */}
          {!isCashier && (
            <div className="sm:col-span-3 flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedOperatorFilter}
                onChange={(e) => setSelectedOperatorFilter(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Todos los Cajeros</option>
                {uniqueOperators.map((op) => (
                  <option key={op} value={op}>
                    Cajero: {op.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Resumen de Resultados */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span>
            Mostrando <strong>{filteredOrders.length}</strong> de {orders.length} órdenes registradas
          </span>
          {(searchQuery || selectedDateFilter !== 'all' || selectedOperatorFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDateFilter('all');
                setSelectedOperatorFilter('all');
              }}
              className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Lista de Órdenes */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-900/60 animate-pulse border border-slate-200 dark:border-slate-800"
            />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 p-6 shadow-xs">
          <Gamepad2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No se encontraron compras con los filtros seleccionados
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {isCashier
              ? 'No tienes ventas registradas bajo tu usuario con este filtro. Las órdenes que generes aparecerán aquí de inmediato.'
              : 'Prueba cambiando los filtros de fecha o búsqueda para ubicar el ticket deseado.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="p-5 rounded-2xl bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col gap-4 shadow-xs dark:shadow-md"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Detalles Izquierda */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-medium">
                      Ticket #{order.id.slice(0, 10)}
                    </span>
                    {getStatusBadge(order)}
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(order.created_at).toLocaleString('es-ES', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                    {order.operator_name && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                        Cajero: {order.operator_name.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                      🎮 {order.game}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {order.product_name}
                    </h3>
                  </div>

                  {/* Datos del jugador si fue recarga directa */}
                  {order.player_id && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        Cuenta ID: <strong className="text-slate-900 dark:text-white">{order.player_id}</strong>
                        {order.player_name && ` (${order.player_name})`}
                      </span>
                    </div>
                  )}

                  {/* Voucher / PIN Digital si aplica */}
                  {(() => { const v = extractOrderVoucher(order); return v ? <VoucherCard pin={v.pin} serial={v.serial} instructions={v.instructions} /> : null; })()}
                </div>

                {/* Derecha: Código Digital / Precio / Botones de Impresión */}
                <div className="flex flex-col md:items-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="text-left md:text-right space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Cobrado al Cliente (PVP)
                    </span>
                    <span className="text-base sm:text-lg font-black font-mono text-cyan-600 dark:text-cyan-400 block">
                      ${getOrderPvpDollars(order).toFixed(2)} {order.currency || 'USD'}
                    </span>
                    {!isCashier && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-mono">
                        Costo: ${(order.amount_cents / 100).toFixed(2)} &bull; Ganancia: +${(getOrderPvpDollars(order) - order.amount_cents / 100).toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Código digital si aplica */}
                  {order.digital_code && (
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/90 border border-cyan-300 dark:border-cyan-500/30 px-3 py-1.5 rounded-xl shadow-xs">
                      <code className="text-xs font-mono font-black text-cyan-700 dark:text-cyan-300 select-all">
                        {order.digital_code}
                      </code>
                      <button
                        onClick={() => handleCopyCode(order.digital_code!, order.id)}
                        className="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                        title="Copiar código"
                      >
                        {copiedCodeId === order.id ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Botones de Reimpresión de Ticket Térmico 80mm */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(order)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
                      title="Ver vista previa del ticket de 80mm"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span>Ver Ticket</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDirectPrint(order)}
                      className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                      title="Imprimir ticket en impresora térmica de 80mm"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir (80mm)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Instrucciones Oficiales de Canje si aplican */}
              {order.redeem_instructions && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedInstructions((prev) => ({
                        ...prev,
                        [order.id]: !prev[order.id],
                      }))
                    }
                    className="flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>
                      {expandedInstructions[order.id]
                        ? 'Ocultar instrucciones de canje'
                        : '📖 ¿Cómo canjear este código? Ver instrucciones oficiales'}
                    </span>
                  </button>
                  {expandedInstructions[order.id] && (
                    <div className="mt-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/90 border border-cyan-200 dark:border-cyan-500/20 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed font-sans animate-fade-in shadow-inner">
                      <span className="text-[11px] font-bold text-cyan-700 dark:text-cyan-300 block mb-1 uppercase tracking-wider">
                        Instrucciones de Canje Oficiales:
                      </span>
                      {order.redeem_instructions}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Previsualización e Impresión Térmica */}
      <ThermalTicketPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        ticketData={previewTicketData}
      />
    </div>
  );
};
