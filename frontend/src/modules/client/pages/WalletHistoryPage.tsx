import React, { useState } from 'react';
import { useWalletStore } from '../../../store/useWalletStore';
import { PriceDisplay } from '../../../components/molecules/PriceDisplay';
import { BookOpen, Search, Filter, RotateCcw } from 'lucide-react';
import { Input } from '../../../components/atoms/Input';
import { Button } from '../../../components/atoms/Button';

export const WalletHistoryPage: React.FC = () => {
  const { wallet } = useWalletStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Movimientos de muestra
  const movements: any[] = [];

  const handleReset = () => {
    setSearchQuery('');
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header with current balance indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white font-['Rajdhani'] uppercase tracking-wide flex items-center gap-2">
            Mi Libro Contable <BookOpen className="w-5 h-5 text-cyan-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro detallado de depósitos acreditados, ventas de recargas y comisiones generadas.
          </p>
        </div>

        <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Fondo Actual:
          </span>
          <PriceDisplay
            cents={wallet.available_balance_cents}
            currency={wallet.currency}
            size="sm"
            className="text-emerald-400 font-bold"
          />
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row items-center gap-3">
        <div className="w-full md:flex-1">
          <Input
            placeholder="Buscar por detalle, ID de jugador o referencia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            title="Desde Fecha"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            title="Hasta Fecha"
          />

          <Button variant="primary" size="sm" className="shrink-0">
            <Filter className="w-3.5 h-3.5 mr-1" />
            Filtrar
          </Button>

          <button
            onClick={handleReset}
            title="Limpiar filtros"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Accounting Table */}
      <div className="glass-panel rounded-3xl border border-slate-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 bg-slate-950/40">
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Clasificación</th>
                <th className="py-3 px-4">Detalle del Movimiento</th>
                <th className="py-3 px-4">Saldo Anterior</th>
                <th className="py-3 px-4">Transacción</th>
                <th className="py-3 px-4">Saldo Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-400">
                    No hay movimientos registrados en tu cuenta todavía.
                  </td>
                </tr>
              ) : (
                movements.map((m, i) => (
                  <tr key={i} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-slate-300">{m.date}</td>
                    <td className="py-3 px-4">{m.category}</td>
                    <td className="py-3 px-4 font-bold text-white">{m.detail}</td>
                    <td className="py-3 px-4 text-slate-400">${m.prevBalance}</td>
                    <td className="py-3 px-4 font-bold text-emerald-400">{m.amount}</td>
                    <td className="py-3 px-4 font-bold text-white">${m.finalBalance}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

