import React, { useState, useEffect } from 'react';
import {
  Tag,
  Save,
  RefreshCw,
  Search,
  Gamepad2,
  Info,
} from 'lucide-react';
import { Button } from '../../../components/atoms/Button';
import { useUIStore } from '../../../store/useUIStore';
import { catalogService } from '../../../services/api/catalog.service';
import { resellerService } from '../../../services/api/reseller.service';
import { Product } from '../../../types';

export const ResellerPvpPage: React.FC = () => {
  const { showToast } = useUIStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGameFilter, setSelectedGameFilter] = useState('all');

  // Mapa local de PVP editables: sku -> valor en string (ej. "1.25")
  const [pvpValues, setPvpValues] = useState<Record<string, string>>({});
  const [savingSku, setSavingSku] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Cargar catálogo de productos y paquetes
      const catalogData = await catalogService.getCatalog();
      setProducts(catalogData);

      // 2. Cargar precios personalizados guardados
      const customPrices = await resellerService.getCustomPrices();
      const initialMap: Record<string, string> = {};

      for (const cp of customPrices) {
        initialMap[cp.sku] = (cp.custom_pvp_cents / 100).toFixed(2);
      }

      // Para los paquetes que no tienen PVP personalizado, rellenar con sugerido (+15%)
      for (const prod of catalogData) {
        if (!initialMap[prod.id]) {
          const cost = prod.price_cents / 100;
          initialMap[prod.id] = (cost * 1.15).toFixed(2);
        }
      }

      setPvpValues(initialMap);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar catálogo de precios', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePriceChange = (sku: string, val: string) => {
    setPvpValues((prev) => ({
      ...prev,
      [sku]: val,
    }));
  };

  const handleSavePrice = async (sku: string) => {
    const rawVal = pvpValues[sku];
    const num = parseFloat(rawVal || '0');
    if (isNaN(num) || num <= 0) {
      showToast('Ingresa un precio PVP válido.', 'error');
      return;
    }

    setSavingSku(sku);
    try {
      await resellerService.setCustomPrice(sku, num);
      showToast(`¡PVP guardado con éxito ($${num.toFixed(2)} USD)!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al guardar PVP', 'error');
    } finally {
      setSavingSku(null);
    }
  };

  // Juegos únicos para el filtro
  const uniqueGames = Array.from(new Set(products.map((p) => p.game))).filter(Boolean);

  const filtered = products.filter((prod) => {
    const matchesGame = selectedGameFilter === 'all' || prod.game === selectedGameFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || prod.name.toLowerCase().includes(q) || prod.game.toLowerCase().includes(q);
    return matchesGame && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white font-['Rajdhani'] uppercase tracking-wide flex items-center gap-2">
            Panel de Precios de Venta (PVP) <Tag className="w-5 h-5 text-indigo-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Personaliza tus precios de venta al público. Tus ganancias netas se calcularán automáticamente en tu Libro Contable.
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 self-start sm:self-auto transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Recargar Catálogo
        </button>
      </div>

      {/* Alerta Informativa */}
      <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-bold text-white">¿Cómo funciona tu margen de ganancia?</p>
          <p className="text-slate-400">
            El <strong>Costo Mayorista</strong> es lo que te descuenta la plataforma de tu saldo. El <strong>PVP</strong> es lo que tú le cobras a tus clientes. La diferencia se registra como tu <strong>Ganancia Neta</strong>.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-panel p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedGameFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedGameFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-glow-primary'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Todos los Juegos ({products.length})
          </button>
          {uniqueGames.map((gameName) => (
            <button
              key={gameName}
              onClick={() => setSelectedGameFilter(gameName)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedGameFilter === gameName
                  ? 'bg-indigo-600 text-white shadow-glow-primary'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {gameName}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar paquete o diamantes..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Tabla de PVP */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            Cargando lista de paquetes y precios...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Gamepad2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-300">No se encontraron productos.</p>
          </div>
        ) : (
          <>
            {/* Mobile Card Layout (md:hidden) - Táctil y sin desbordes horizontales (Imagen 5) */}
            <div className="md:hidden space-y-3 p-3">
              {filtered.map((prod) => {
                const wholesaleCost = prod.price_cents / 100;
                const suggestedPvp = (wholesaleCost * 1.15).toFixed(2);
                const currentPvp = parseFloat(pvpValues[prod.id] || suggestedPvp);
                const estimatedProfit = Math.max(0, currentPvp - wholesaleCost).toFixed(2);
                const profitMargin = wholesaleCost > 0 ? (((currentPvp - wholesaleCost) / wholesaleCost) * 100).toFixed(1) : '0.0';
                const isSaving = savingSku === prod.id;

                return (
                  <div
                    key={prod.id}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xs"
                  >
                    {/* Cabecera: Juego y Paquete */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-black text-white uppercase font-['Rajdhani'] tracking-wide block">
                          {prod.game}
                        </span>
                        <span className="text-sm font-extrabold text-indigo-300 block">
                          {prod.name}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono shrink-0">
                        {prod.currency}
                      </span>
                    </div>

                    {/* Fila de Costos Mayorista vs Sugerido */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Costo Mayorista (-)
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-200">
                          ${wholesaleCost.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Sugerido (+15%)
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          ${suggestedPvp}
                        </span>
                      </div>
                    </div>

                    {/* Input de PVP & Ganancia Táctil */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                          Tu Precio de Venta (PVP)
                        </span>
                        <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 focus-within:border-cyan-400">
                          <span className="text-slate-400 font-bold text-xs">$</span>
                          <input
                            type="number"
                            step="0.05"
                            min={wholesaleCost}
                            value={pvpValues[prod.id] || ''}
                            onChange={(e) => handlePriceChange(prod.id, e.target.value)}
                            className="w-full bg-transparent font-mono font-bold text-cyan-300 text-sm focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                          Ganancia
                        </span>
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-sm font-black text-emerald-400 font-['Rajdhani']">
                            +${estimatedProfit}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/20">
                            {profitMargin}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Botón Guardar PVP de Ancho Completo */}
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full py-2 rounded-xl text-xs font-bold justify-center"
                      disabled={isSaving}
                      onClick={() => handleSavePrice(prod.id)}
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      {isSaving ? 'Guardando Precio...' : 'Guardar PVP'}
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (hidden md:block) - 100% Intacta */}
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Juego</th>
                  <th className="py-3 px-4">Paquete</th>
                  <th className="py-3 px-4">Costo Mayorista (-)</th>
                  <th className="py-3 px-4">PVP Sugerido (+15%)</th>
                  <th className="py-3 px-4">Tu Precio de Venta (PVP)</th>
                  <th className="py-3 px-4">Ganancia Estimada</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((prod) => {
                  const wholesaleCost = prod.price_cents / 100;
                  const suggestedPvp = (wholesaleCost * 1.15).toFixed(2);
                  const currentPvp = parseFloat(pvpValues[prod.id] || suggestedPvp);
                  const estimatedProfit = Math.max(0, currentPvp - wholesaleCost).toFixed(2);
                  const profitMargin = wholesaleCost > 0 ? (((currentPvp - wholesaleCost) / wholesaleCost) * 100).toFixed(1) : '0.0';
                  const isSaving = savingSku === prod.id;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                        {prod.game}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-200">
                        {prod.name}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-300">
                        ${wholesaleCost.toFixed(2)} {prod.currency}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        ${suggestedPvp}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 w-32">
                          <span className="text-slate-400 font-bold">$</span>
                          <input
                            type="number"
                            step="0.05"
                            min={wholesaleCost}
                            value={pvpValues[prod.id] || ''}
                            onChange={(e) => handlePriceChange(prod.id, e.target.value)}
                            className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 font-mono font-bold text-cyan-300 text-xs focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-emerald-400 font-['Rajdhani']">
                            +${estimatedProfit}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/20">
                            {profitMargin}%
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="px-3 py-1 text-[11px] font-bold"
                          disabled={isSaving}
                          onClick={() => handleSavePrice(prod.id)}
                        >
                          <Save className="w-3 h-3 mr-1" />
                          {isSaving ? 'Guardando...' : 'Guardar'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
};

