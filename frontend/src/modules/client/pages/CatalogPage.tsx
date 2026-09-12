import React, { useEffect, useState } from 'react';
import { GameSummary } from '../../../types';
import { catalogService } from '../../../services/api/catalog.service';
import { GameCard } from '../components/GameCard';
import { GameTopupModal } from '../components/GameTopupModal';
import {
  Search,
  Sparkles,
  ShieldCheck,
  Zap,
  Gamepad2,
  Gift,
  Flame,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Star,
  Wallet,
} from 'lucide-react';
import { Input } from '../../../components/atoms/Input';
import { apiClient } from '../../../services/api/client';
import { useWalletStore } from '../../../store/useWalletStore';

export const CatalogPage: React.FC = () => {
  const { wallet } = useWalletStore();
  const [games, setGames] = useState<GameSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'direct_topup' | 'gift_card'>('all');

  // Active topup modal
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [circuitBreakerStatus, setCircuitBreakerStatus] = useState<any>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [data, status] = await Promise.all([
        catalogService.getGames(),
        apiClient<any>('/system/status').catch(() => null),
      ]);
      setGames(data);
      setCircuitBreakerStatus(status);
    } catch (err) {
      console.error('Error cargando catálogo:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectGame = (game: GameSummary) => {
    setSelectedGameId(game.id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedGameId(null);
  };

  const filteredGames = games.filter((game) => {
    const matchesSearch =
      game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.category_label.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' || game.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const directTopupCount = games.filter((g) => g.category === 'direct_topup').length;
  const giftCardCount = games.filter((g) => g.category === 'gift_card').length;

  // Clasificación para vista móvil compacta
  const isSearching = searchQuery.trim().length > 0;
  const popularGames = games.filter(
    (g) =>
      g.id.toLowerCase().includes('freefire') ||
      g.id.toLowerCase().includes('free-fire') ||
      g.id.toLowerCase().includes('roblox') ||
      g.id.toLowerCase().includes('mobile-legends')
  ).slice(0, 2);

  const popularGameIds = new Set(popularGames.map((g) => g.id));
  const remainingGames = filteredGames.filter((g) => isSearching || !popularGameIds.has(g.id));

  return (
    <div className="space-y-6 pb-16 max-w-full overflow-x-hidden">
      {/* ========================================================================= */}
      {/* VISTA MÓVIL (md:hidden): Diseño limpio estilo Proveedor (Imagen 1)        */}
      {/* ========================================================================= */}
      <div className="md:hidden space-y-4">
        {/* Buscador Táctil Compacto */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar juego..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-sm font-medium shadow-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Barra de Saldo Rápida (Estilo Proveedor) */}
        <div className="flex items-center justify-between px-2 py-1 text-xs border-b border-slate-800/40 pb-2">
          <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">Saldo</span>
          {wallet.available_balance_cents <= 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400 font-bold flex items-center gap-1 text-[11px]">
                <AlertTriangle className="w-3 h-3 text-amber-400" /> Sin saldo
              </span>
              <span className="text-slate-400 text-[11px]">$ 0.00 disponibles</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
              <Wallet className="w-3.5 h-3.5" />
              <span>$ {(wallet.available_balance_cents / 100).toFixed(2)} USD disponibles</span>
            </div>
          )}
        </div>

        {/* Píldoras de Categoría Móviles */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              categoryFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            <Flame className="w-3 h-3 text-cyan-400" />
            Todos ({games.length})
          </button>
          <button
            onClick={() => setCategoryFilter('direct_topup')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              categoryFilter === 'direct_topup'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            <Gamepad2 className="w-3 h-3 text-emerald-400" />
            ID ({directTopupCount})
          </button>
          <button
            onClick={() => setCategoryFilter('gift_card')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              categoryFilter === 'gift_card'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            <Gift className="w-3 h-3 text-indigo-400" />
            Pines ({giftCardCount})
          </button>
        </div>

        {/* Alerta de Pausa Preventiva en Móvil */}
        {circuitBreakerStatus?.circuit_breaker_active && (
          <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-2.5 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-amber-200 text-[11px] leading-tight">
              {circuitBreakerStatus.alert_message || 'Pausa preventiva de inventario en curso. Reanudación automática en breve.'}
            </p>
          </div>
        )}

        {/* Lista de Juegos Móvil */}
        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 rounded-3xl border border-slate-800 space-y-2 p-4">
            <Search className="w-8 h-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white uppercase">No se encontraron juegos</h3>
            <p className="text-xs text-slate-400">Prueba con otro término de búsqueda.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Sección: MÁS VENDIDO (Solo si no hay búsqueda activa y categoría all) */}
            {!isSearching && categoryFilter === 'all' && popularGames.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                  Más Vendido
                </span>
                <div className="space-y-2">
                  {popularGames.map((game) => (
                    <div
                      key={game.id}
                      onClick={() => handleSelectGame(game)}
                      className="border-2 border-amber-400 rounded-2xl bg-white p-3 flex items-center justify-between shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={game.image_url}
                          alt={game.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900 truncate">
                              {game.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold shrink-0 flex items-center gap-1">
                              <Flame className="w-2.5 h-2.5 text-amber-500 fill-amber-500" /> Más vendido
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {game.category === 'direct_topup' ? 'Diamantes · Solo ID' : 'Códigos · Entrega Inmediata'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 shrink-0 ml-2">
                        <Star className="w-4 h-4 text-slate-300" />
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sección: MÁS JUEGOS */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                {isSearching ? `Resultados (${filteredGames.length})` : 'Más Juegos'}
              </span>
              <div className="space-y-2">
                {remainingGames.map((game) => (
                  <div
                    key={game.id}
                    onClick={() => handleSelectGame(game)}
                    className="border border-slate-200 rounded-2xl bg-white p-3 flex items-center justify-between shadow-xs cursor-pointer active:scale-[0.98] transition-transform hover:border-slate-300"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={game.image_url}
                        alt={game.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900 truncate">
                            {game.name}
                          </span>
                          {game.category === 'gift_card' && (
                            <span className="px-1.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 text-[9px] font-bold shrink-0">
                              Código
                            </span>
                          )}
                          {game.can_verify_player && (
                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold shrink-0">
                              Verificable
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {game.description || (game.category === 'direct_topup' ? 'Recarga Directa con ID' : 'Pines y Códigos')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 shrink-0 ml-2">
                      <Star className="w-4 h-4 text-slate-300" />
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selector Guía Inferior */}
            <div className="text-center py-3 px-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-400 text-xs font-semibold">
              Toca cualquier juego para ver paquetes y recargar
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VISTA ESCRITORIO (hidden md:block): Diseño Gamer Original Intacto          */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-8">
        {/* Hero Banner Gamer */}
        <section className="relative rounded-3xl overflow-hidden glass-panel-glow border border-indigo-500/30 p-8 sm:p-12">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Catálogo Oficial de Recargas en Vivo
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white font-['Rajdhani'] uppercase tracking-wide leading-tight">
              Recargas de Juegos & <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400">
                Códigos Digitales al Instante
              </span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Selecciona tu juego favorito, verifica tu Player ID en tiempo real y abona diamantes, monedas o tarjetas de regalo debitadas de tu saldo virtual.
            </p>

            <div className="flex flex-wrap gap-4 pt-2 text-xs text-slate-300 font-semibold">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verificación de ID Oficial en Vivo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>Despacho Automatizado 24/7</span>
              </div>
            </div>
          </div>
        </section>

        {/* Alerta de Freno de Emergencia / Reposición de Inventario */}
        {circuitBreakerStatus?.circuit_breaker_active && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-3 shadow-lg">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase font-['Rajdhani'] flex items-center gap-2">
                Reposición de Inventario de Recargas en Curso
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-sans font-bold">
                  Pausa Preventiva
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                {circuitBreakerStatus.alert_message ||
                  'Estamos reponiendo inventario de recargas con el proveedor central. El servicio se reactivará automáticamente en unos momentos.'}
              </p>
              <span className="text-[11px] text-amber-300/80 font-medium block">
                🛡️ Tu saldo en la plataforma está 100% seguro. Las compras directas se reanudarán de inmediato al completar el abastecimiento.
              </span>
            </div>
          </div>
        )}

        {/* Filter and Search Bar */}
        <section className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="w-full md:w-80">
            <Input
              placeholder="Buscar Free Fire, Roblox, Steam..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          {/* Category Tabs */}
          <div className="w-full md:w-auto flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-2 ${
                categoryFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-glow-primary'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-cyan-400" />
              Todos ({games.length})
            </button>

            <button
              onClick={() => setCategoryFilter('direct_topup')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-2 ${
                categoryFilter === 'direct_topup'
                  ? 'bg-indigo-600 text-white shadow-glow-primary'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
              Recargas con ID ({directTopupCount})
            </button>

            <button
              onClick={() => setCategoryFilter('gift_card')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-2 ${
                categoryFilter === 'gift_card'
                  ? 'bg-indigo-600 text-white shadow-glow-primary'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <Gift className="w-3.5 h-3.5 text-indigo-400" />
              Pines & Tarjetas ({giftCardCount})
            </button>

            <button
              onClick={loadData}
              title="Actualizar catálogo en vivo"
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 active:scale-95 transition-all ml-auto md:ml-0"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </section>

        {/* Games Catalog Grid */}
        <section>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="h-80 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800"
                />
              ))}
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800 space-y-4 max-w-md mx-auto p-6">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white font-['Rajdhani'] uppercase">
                  No se pudo conectar con el catálogo
                </h3>
                <p className="text-xs text-slate-400">
                  Verifica tu conexión o presiona el botón para reintentar la sincronización.
                </p>
              </div>
              <button
                onClick={loadData}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Reintentar Conexión
              </button>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800 space-y-3">
              <Search className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-white font-['Rajdhani'] uppercase">
                No se encontraron juegos
              </h3>
              <p className="text-xs text-slate-400">
                Intenta con otro término de búsqueda o selecciona otra categoría.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onSelect={handleSelectGame}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Interactive Gamer Topup Modal */}
      <GameTopupModal
        gameId={selectedGameId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        circuitBreakerActive={Boolean(circuitBreakerStatus?.circuit_breaker_active)}
        circuitBreakerMessage={circuitBreakerStatus?.alert_message}
      />
    </div>
  );
};
