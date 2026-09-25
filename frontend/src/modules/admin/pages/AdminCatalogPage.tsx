import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  Image as ImageIcon,
  Edit,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  X,
} from 'lucide-react';
import { Button } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import { useUIStore } from '../../../store/useUIStore';
import { adminService } from '../../../services/api/admin.service';
import { catalogService } from '../../../services/api/catalog.service';
import { CatalogGameAdmin, GamePackage } from '../../../types';

export const AdminCatalogPage: React.FC = () => {
  const { showToast } = useUIStore();

  const [games, setGames] = useState<CatalogGameAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [savingGameId, setSavingGameId] = useState<string | null>(null);

  // Unified Modal state
  const [editingGame, setEditingGame] = useState<CatalogGameAdmin | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'visuals' | 'pricing'>('visuals');

  // Form Fields
  const [editName, setEditName] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editBannerUrl, setEditBannerUrl] = useState('');
  const [editBadge, setEditBadge] = useState('');
  const [editIsVisible, setEditIsVisible] = useState(true);

  // Packages pricing overrides
  const [packagesList, setPackagesList] = useState<GamePackage[]>([]);

  const fetchGames = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAdminGames();
      setGames(data || []);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar catálogo de administración', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncCatalog = async () => {
    setSyncing(true);
    try {
      const res = await adminService.syncCatalog();
      if (res?.newProductsCount > 0) {
        showToast(
          `¡Sincronización completada! Se detectaron y crearon ${res.newProductsCount} nuevos productos. Se envió una notificación a tu correo.`,
          'success'
        );
      } else {
        showToast(`¡Catálogo sincronizado! Total: ${res?.totalFromProvider || 320} productos al día con Canjea API.`, 'info');
      }
      await fetchGames();
    } catch (err: any) {
      showToast(err.message || 'Error al sincronizar con el proveedor', 'error');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleOpenEdit = async (game: CatalogGameAdmin) => {
    setEditingGame(game);
    setEditName(game.name);
    setEditImageUrl(game.image_url);
    setEditBannerUrl(game.banner_url || game.image_url);
    setEditBadge(game.badge || '');
    setEditIsVisible(game.is_visible !== false);
    setActiveTab('visuals');

    // Fetch live packages and wholesale costs from API
    setLoadingDetails(true);
    try {
      const details = await catalogService.getGameDetails(game.id);
      if (details) {
        setPackagesList(details.packages || []);
      }
    } catch (err) {
      console.error('Error cargando paquetes del juego:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handlePackagePriceChange = (sku: string, newPriceStr: string) => {
    const sanitized = newPriceStr.replace(/,/g, '.');
    setPackagesList((prev) =>
      prev.map((pkg) => {
        if (pkg.sku === sku) {
          const val = parseFloat(sanitized) || 0;
          return {
            ...pkg,
            price_decimal: sanitized,
            price_cents: Math.round(val * 100),
          };
        }
        return pkg;
      })
    );
  };

  const handlePackageToggleActive = (sku: string) => {
    setPackagesList((prev) =>
      prev.map((pkg) => {
        if (pkg.sku === sku) {
          return {
            ...pkg,
            is_active: pkg.is_active === false ? true : false,
          };
        }
        return pkg;
      })
    );
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGame) return;

    setSavingGameId(editingGame.id);
    try {
      await adminService.updateGameOverride(editingGame.id, {
        custom_name: editName.trim() || undefined,
        custom_image_url: editImageUrl.trim() || undefined,
        custom_banner_url: editBannerUrl.trim() || undefined,
        custom_badge: editBadge.trim() || undefined,
        is_visible: editIsVisible,
        packages_override: packagesList.map((p) => ({
          sku: p.sku,
          price_cents: p.price_cents,
          price_decimal: p.price_decimal,
          is_active: p.is_active !== false,
        })),
      });

      showToast(`¡Configuración de "${editingGame.name}" guardada con éxito!`, 'success');
      setEditingGame(null);
      fetchGames();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar cambios de producto', 'error');
    } finally {
      setSavingGameId(null);
    }
  };

  const handleToggleVisibilityQuick = async (game: CatalogGameAdmin) => {
    const nextState = !game.is_visible;
    try {
      await adminService.updateGameOverride(game.id, {
        is_visible: nextState,
      });
      showToast(
        nextState ? `"${game.name}" ahora es visible en la tienda.` : `"${game.name}" ahora está oculto.`,
        'info'
      );
      fetchGames();
    } catch (err: any) {
      showToast(err.message || 'Error al cambiar visibilidad', 'error');
    }
  };

  const filtered = games.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return g.name.toLowerCase().includes(q) || g.category_label.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 pb-12 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Rajdhani'] uppercase tracking-wide flex items-center gap-2">
            Catálogo Unificado & Precios Costo API <Gamepad2 className="w-6 h-6 text-indigo-400" />
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Configuración todo-en-uno por producto: imágenes, banners, precios costo de la API Canjea, PVP sugerido y disponibilidad.
          </p>
        </div>

        <button
          onClick={handleSyncCatalog}
          disabled={syncing || loading}
          className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-200 text-xs font-bold flex items-center gap-2 self-start sm:self-auto transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing || loading ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando con Canjea...' : 'Sincronizar con Canjea API'}
        </button>
      </div>

      {/* Buscador */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar juego por nombre o categoría..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <span className="text-xs text-slate-400 hidden sm:block">
          Mostrando <strong>{filtered.length}</strong> de {games.length} juegos
        </span>
      </div>

      {/* Grid de Juegos con Portadas */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
          Cargando catálogo editable...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center glass-panel rounded-3xl border border-slate-800">
          <Gamepad2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-300">No se encontraron juegos con ese nombre.</p>
        </div>
      ) : (
        <>
          {/* ============================================================ */}
          {/* VISTA MÓVIL (md:hidden) — SIMILAR AL CATÁLOGO DE CLIENTES */}
          {/* ============================================================ */}
          <div className="md:hidden space-y-2.5">
            {filtered.map((game) => {
              const isVisible = game.is_visible !== false;

              return (
                <div
                  key={game.id}
                  className={`rounded-2xl p-3 flex items-center justify-between transition-all shadow-xs ${
                    isVisible
                      ? 'bg-white text-slate-900 border border-slate-200'
                      : 'bg-rose-50/90 text-slate-700 border border-rose-200 opacity-80'
                  }`}
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 truncate">
                          {game.name}
                        </span>
                        {game.badge && (
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[9px] font-black uppercase tracking-wider shrink-0">
                            {game.badge}
                          </span>
                        )}
                        {!isVisible && (
                          <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[9px] font-black uppercase tracking-wider shrink-0">
                            Oculto
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        <span className="font-semibold text-[11px] text-indigo-600">
                          {game.category_label || (game.category === 'direct_topup' ? 'Recarga Directa' : 'Pines')}
                        </span>
                        <span>&bull;</span>
                        <span className="text-[11px] text-slate-500">{game.packages_count} paquetes</span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones Rápidas Táctiles para Móvil */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => handleToggleVisibilityQuick(game)}
                      className={`p-2 rounded-xl border text-xs transition-colors active:scale-95 ${
                        isVisible
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-rose-200 bg-rose-100 text-rose-700 hover:bg-rose-200'
                      }`}
                      title={isVisible ? 'Ocultar de la tienda' : 'Mostrar en la tienda'}
                      aria-label="Alternar visibilidad"
                    >
                      {isVisible ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-rose-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(game)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                    >
                      <Edit className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-[11px]">Editar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ============================================================ */}
          {/* VISTA ESCRITORIO (hidden md:grid) — PRESERVADA 100% */}
          {/* ============================================================ */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((game) => {
              const isVisible = game.is_visible !== false;

            return (
              <div
                key={game.id}
                className={`glass-panel rounded-3xl border overflow-hidden transition-all flex flex-col justify-between group ${
                  isVisible ? 'border-slate-800 hover:border-slate-700' : 'border-rose-900/40 opacity-60 bg-rose-950/10'
                }`}
              >
                <div>
                  {/* Imagen de Portada con Badge */}
                  <div className="relative h-40 w-full overflow-hidden bg-slate-950">
                    <img
                      src={game.image_url}
                      alt={game.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/40" />

                    <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                      {game.badge && (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/80 backdrop-blur-md text-[10px] font-black text-slate-950 uppercase tracking-wider">
                          {game.badge}
                        </span>
                      )}
                      {!isVisible && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-600/90 text-[10px] font-bold text-white uppercase">
                          OCULTO
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-white">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                        {game.category_label}
                      </span>
                      <span className="text-[10px] text-slate-300">
                        {game.packages_count} paquetes
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-1">
                    <h3 className="text-sm font-bold text-white font-['Rajdhani'] tracking-wide truncate">
                      {game.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 block font-mono">ID: {game.id}</span>
                  </div>
                </div>

                {/* Acciones de Edición Todo-en-Uno */}
                <div className="p-4 pt-0 flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 justify-center text-xs font-bold"
                    onClick={() => handleOpenEdit(game)}
                  >
                    <Edit className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                    Configurar Producto
                  </Button>

                  <button
                    type="button"
                    onClick={() => handleToggleVisibilityQuick(game)}
                    className={`p-2 rounded-xl border text-xs transition-colors ${
                      isVisible
                        ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
                        : 'border-rose-700 bg-rose-950/40 text-rose-300'
                    }`}
                    title={isVisible ? 'Ocultar de la tienda' : 'Mostrar en la tienda'}
                  >
                    {isVisible ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-rose-400" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </>
      )}

      {/* Modal Unificado Todo-En-Uno (Imágenes, Precios Costo API y PVP Sugerido) */}
      {editingGame && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setEditingGame(null)}
        >
          <div
            className="max-w-3xl w-full bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white uppercase font-['Rajdhani'] flex items-center gap-2">
                    {editingGame.name}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    ID Franquicia: {editingGame.id} &bull; {editingGame.packages_count} denominaciones
                  </span>
                </div>
              </div>
              <button
                onClick={() => setEditingGame(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('visuals')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  activeTab === 'visuals'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                1. Imágenes & Presentación
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pricing')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  activeTab === 'pricing'
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                2. Costos API Canjea & PVP Sugerido
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-6">
              {/* TAB 1: Portadas & Metadatos */}
              {activeTab === 'visuals' && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <Input
                      label="Nombre del Juego (Visible en la tienda)"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Ej: Free Fire MAX"
                      required
                    />
                  </div>

                  <div>
                    <Input
                      label="URL de Imagen de Portada (Tarjeta Cuadrada / Vertical)"
                      value={editImageUrl}
                      onChange={(e) => setEditImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      helperText="Enlace público en alta resolución para el catálogo principal."
                      required
                    />
                  </div>

                  {editImageUrl && (
                    <div className="p-3 rounded-2xl bg-black/50 border border-slate-800 flex items-center gap-3">
                      <img
                        src={editImageUrl}
                        alt="Preview Portada"
                        className="w-16 h-16 object-cover rounded-xl border border-slate-700"
                        onError={(e) => ((e.target as any).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=700')}
                      />
                      <div className="text-xs text-slate-400">
                        <span className="font-bold text-white block">Vista Previa Portada</span>
                        <span className="text-[11px]">Visible en el menú de selección de juegos.</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <Input
                      label="URL del Banner Horizontal (Cabecera del Modal de Compra)"
                      value={editBannerUrl}
                      onChange={(e) => setEditBannerUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      helperText="Se muestra en la parte superior cuando el revendedor recarga este juego."
                    />
                  </div>

                  {editBannerUrl && (
                    <div className="p-2 rounded-2xl bg-black/50 border border-slate-800">
                      <img
                        src={editBannerUrl}
                        alt="Preview Banner"
                        className="w-full h-24 object-cover rounded-xl border border-slate-700"
                        onError={(e) => ((e.target as any).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200')}
                      />
                    </div>
                  )}

                  <div>
                    <Input
                      label="Etiqueta / Badge Promocional"
                      value={editBadge}
                      onChange={(e) => setEditBadge(e.target.value)}
                      placeholder="Ej: 🔥 HOT, ⚡ RECARGA INMEDIATA, OFICIAL"
                    />
                  </div>

                  {/* Switch de Visibilidad */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">Visibilidad en la Tienda</span>
                      <span className="text-[11px] text-slate-400">
                        Si se desactiva, los clientes no podrán ver ni recargar este juego.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditIsVisible(!editIsVisible)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        editIsVisible
                          ? 'bg-emerald-600 text-white shadow-glow-primary'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {editIsVisible ? 'Visible' : 'Oculto'}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: Costos API Canjea & Precios PVP */}
              {activeTab === 'pricing' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-slate-300 flex items-start gap-2.5">
                    <TrendingUp className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">Sincronización Automática con la API de Canjea</span>
                      Los costos mayoristas mostrados se actualizan directamente del proveedor. Puedes ajustar el PVP sugerido para que tus revendedores tengan un precio de referencia.
                    </div>
                  </div>

                  {loadingDetails ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Cargando paquetes y cotizaciones en vivo...
                    </div>
                  ) : packagesList.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No se encontraron denominaciones registradas para este juego.
                    </div>
                  ) : (
                    <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60">
                      <div className="overflow-x-auto max-h-80">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-slate-950 sticky top-0 border-b border-slate-800 text-slate-400 text-[10px] uppercase font-bold">
                            <tr>
                              <th className="p-3">Paquete / SKU</th>
                              <th className="p-3">Costo API Canjea</th>
                              <th className="p-3">PVP Sugerido ($)</th>
                              <th className="p-3">Margen Ganancia</th>
                              <th className="p-3 text-right">Disponibilidad</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {packagesList.map((pkg) => {
                              const wholesale = parseFloat((pkg.wholesale_decimal || '0').replace(/,/g, '.'));
                              const pvp = parseFloat((pkg.price_decimal || '0').replace(/,/g, '.'));
                              const margin = pvp - wholesale;
                              const marginPercent = wholesale > 0 ? ((margin / wholesale) * 100).toFixed(1) : '0';
                              const isActive = pkg.is_active !== false;

                              return (
                                <tr key={pkg.sku} className={`hover:bg-slate-900/40 ${!isActive ? 'opacity-50' : ''}`}>
                                  <td className="p-3">
                                    <span className="font-semibold text-white block">{pkg.name}</span>
                                    <span className="font-mono text-[10px] text-slate-500">{pkg.sku}</span>
                                  </td>
                                  <td className="p-3 font-mono font-bold text-amber-400">
                                    ${Number(wholesale).toFixed(2)} <span className="text-[10px] text-slate-500">USD</span>
                                  </td>
                                  <td className="p-3">
                                    <div className="w-24">
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={pkg.price_decimal}
                                        onChange={(e) => handlePackagePriceChange(pkg.sku, e.target.value)}
                                        onBlur={() => {
                                          const val = parseFloat((pkg.price_decimal || '0').replace(/,/g, '.'));
                                          if (!isNaN(val) && val > 0) {
                                            handlePackagePriceChange(pkg.sku, val.toFixed(2));
                                          }
                                        }}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                                      />
                                    </div>
                                  </td>
                                  <td className="p-3 font-mono text-emerald-400 font-bold">
                                    +${margin > 0 ? margin.toFixed(2) : '0.00'}{' '}
                                    <span className="text-[10px] text-slate-400">({marginPercent}%)</span>
                                  </td>
                                  <td className="p-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => handlePackageToggleActive(pkg.sku)}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                                        isActive
                                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                          : 'bg-red-500/20 text-red-400 border border-red-500/40'
                                      }`}
                                    >
                                      {isActive ? 'Activo' : 'Agotado'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <span className="text-xs text-slate-500">
                  {packagesList.length} paquetes sincronizados con la API
                </span>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingGame(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="px-6 py-2 text-xs font-bold shadow-glow-primary"
                    disabled={Boolean(savingGameId)}
                  >
                    {savingGameId ? (
                      'Guardando...'
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Guardar Cambios del Producto
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
