import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  DollarSign,
  TrendingUp,
  Calendar,
  Search,
  MessageCircle,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { useUIStore } from '../../../store/useUIStore';
import { resellerService } from '../../../services/api/reseller.service';
import { AccountingBook, AccountingEntry } from '../../../types';

export const AccountingBookPage: React.FC = () => {
  const { showToast } = useUIStore();

  const [book, setBook] = useState<AccountingBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAccounting = async () => {
    setLoading(true);
    try {
      const data = await resellerService.getAccountingBook();
      setBook(data);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar libro contable', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounting();
  }, []);

  const handleShareWhatsApp = (entry: AccountingEntry) => {
    const message = [
      `🧾 *COMPROBANTE DE RECARGA EXITOSA - RECARGAS JUEGOS ONLINE*`,
      `──────────────────────────────`,
      `🎮 *Juego:* ${entry.product_name}`,
      `👤 *Gamer Nickname:* ${entry.player_name}`,
      `🆔 *ID de Jugador:* ${entry.player_id}`,
      `💰 *Valor Pagado:* $${entry.retail_pvp_usd} ${entry.currency}`,
      `📅 *Fecha:* ${new Date(entry.date).toLocaleString('es-ES')}`,
      `🔢 *Orden:* #${entry.order_id.substring(0, 8).toUpperCase()}`,
      `──────────────────────────────`,
      `✅ *Estado:* ENTREGADO INMEDIATO`,
      `🚀 *Gracias por tu preferencia. ¡Vuelve pronto!*`,
    ].join('\n');

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const filteredEntries = (book?.entries || []).filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.product_name.toLowerCase().includes(q) ||
      e.player_name.toLowerCase().includes(q) ||
      e.player_id.toLowerCase().includes(q) ||
      e.order_id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white font-['Rajdhani'] uppercase tracking-wide flex items-center gap-2">
            Mi Libro Contable & Ganancias <BookOpen className="w-5 h-5 text-emerald-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Bitácora financiera automatizada: controla tus costos mayoristas, ventas cobradas al cliente final y tu ganancia neta en tiempo real.
          </p>
        </div>

        <button
          onClick={fetchAccounting}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 self-start sm:self-auto transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refrescar Contabilidad
        </button>
      </div>

      {/* KPI Cards de Rentabilidad */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ganancia Neta */}
        <div className="glass-panel p-5 rounded-3xl border border-emerald-500/20 bg-emerald-950/10 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-400">
            <span>Ganancia Neta Total</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="text-3xl font-black text-white font-['Rajdhani'] mt-3">
            ${book?.summary.total_net_profit_usd || '0.00'}{' '}
            <span className="text-xs font-sans font-bold text-emerald-400">USD</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            {book?.summary.successful_orders_count || 0} recargas exitosas despachadas
          </span>
        </div>

        {/* Ganancia Hoy */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Ganancia Hoy</span>
            <Calendar className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-white font-['Rajdhani'] mt-3">
            ${book?.summary.today_profit_usd || '0.00'}{' '}
            <span className="text-xs font-sans font-bold text-slate-400">USD</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">Rentabilidad generada en las últimas 24h</span>
        </div>

        {/* Ganancia Este Mes */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Ganancia Este Mes</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-white font-['Rajdhani'] mt-3">
            ${book?.summary.month_profit_usd || '0.00'}{' '}
            <span className="text-xs font-sans font-bold text-slate-400">USD</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">Acumulado del mes en curso</span>
        </div>

        {/* Costo Mayorista Invertido */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Costo Mayorista (-)</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-slate-200 font-['Rajdhani'] mt-3">
            ${book?.summary.total_wholesale_cost_usd || '0.00'}{' '}
            <span className="text-xs font-sans font-bold text-slate-400">USD</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">Total debitado de tu billetera</span>
        </div>
      </div>

      {/* Buscador y Tabla de Transacciones */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400" /> Bitácora de Ventas Detallada
          </h3>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por jugador, ID o producto..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            Cargando libro contable...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-300">Aún no hay transacciones registradas.</p>
            <p className="text-xs text-slate-500 mt-1">
              Cada recarga que vendas generará un asiento contable con su ganancia neta.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-4">Cliente / Gamer</th>
                  <th className="py-3 px-4">Costo Mayorista (-)</th>
                  <th className="py-3 px-4">Venta Cobrada (+)</th>
                  <th className="py-3 px-4">Ganancia Neta (=)</th>
                  <th className="py-3 px-4">Margen</th>
                  <th className="py-3 px-4 text-right">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEntries.map((item) => {
                  const dateFormatted = new Date(item.date).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{dateFormatted}</td>
                      <td className="py-3 px-4 font-bold text-white">{item.product_name}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-200">{item.player_name}</span>
                          <span className="text-[10px] text-cyan-400 font-mono">ID: {item.player_id}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-rose-400 font-mono font-bold">
                        -${item.wholesale_cost_usd}
                      </td>
                      <td className="py-3 px-4 text-cyan-300 font-mono font-bold">
                        +${item.retail_pvp_usd}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-black text-emerald-400 font-['Rajdhani']">
                          +${item.net_profit_usd}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-bold border border-emerald-500/20">
                          {item.margin_percent}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleShareWhatsApp(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-600/40 text-emerald-300 font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                          title="Enviar recibo profesional por WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                          Recibo WhatsApp
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
