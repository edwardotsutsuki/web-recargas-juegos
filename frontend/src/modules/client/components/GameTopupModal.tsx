import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameDetail, GamePackage } from '../../../types';
import { catalogService } from '../../../services/api/catalog.service';
import { playerService } from '../../../services/api/player.service';
import { ordersService } from '../../../services/api/orders.service';
import { useWalletStore } from '../../../store/useWalletStore';
import { useCartStore } from '../../../store/useCartStore';
import { PriceDisplay } from '../../../components/molecules/PriceDisplay';
import { Button } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import { Badge } from '../../../components/atoms/Badge';
import {
  X,
  UserCheck,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Zap,
  ShoppingCart,
  Check,
  Wallet,
  Sparkles,
  Info,
  Globe,
  AlertTriangle,
  ChevronLeft,
} from 'lucide-react';

interface GameTopupModalProps {
  gameId: string | null;
  isOpen: boolean;
  onClose: () => void;
  circuitBreakerActive?: boolean;
  circuitBreakerMessage?: string;
}

export const GameTopupModal: React.FC<GameTopupModalProps> = ({
  gameId,
  isOpen,
  onClose,
  circuitBreakerActive = false,
  circuitBreakerMessage,
}) => {
  const { wallet } = useWalletStore();
  const { addItem } = useCartStore();
  const navigate = useNavigate();

  const [game, setGame] = useState<GameDetail | null>(null);
  const [isLoadingGame, setIsLoadingGame] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<GamePackage | null>(null);

  // Player fields
  const [playerId, setPlayerId] = useState('');
  const [serverZone, setServerZone] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [verifiedRegion, setVerifiedRegion] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Direct order processing
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);
  const [orderErrorMsg, setOrderErrorMsg] = useState<string | null>(null);

  // Load game details whenever modal opens or gameId changes
  useEffect(() => {
    if (isOpen && gameId) {
      setIsLoadingGame(true);
      setPlayerId('');
      setServerZone('');
      setVerifiedName(null);
      setVerifiedRegion(null);
      setVerifyError(null);
      setOrderSuccessMsg(null);
      setOrderErrorMsg(null);

      catalogService
        .getGameDetails(gameId)
        .then((data) => {
          setGame(data);
          if (data) {
            const defaultReg = data.regions && data.regions.length > 0 ? data.regions[0].id : null;
            setSelectedRegion(defaultReg);

            const initialPackages = defaultReg
              ? data.packages.filter((p) => !p.region || p.region === defaultReg)
              : data.packages;

            const available = initialPackages.filter((p) => p.is_active !== false);
            if (available.length > 0) {
              setSelectedPackage(available[0]);
            } else if (initialPackages.length > 0) {
              setSelectedPackage(initialPackages[0]);
            }
          }
        })
        .finally(() => {
          setIsLoadingGame(false);
        });
    }
  }, [isOpen, gameId]);

  if (!isOpen) return null;

  const handleSelectRegion = (regionId: string) => {
    setSelectedRegion(regionId);
    if (!game) return;
    const regionPackages = game.packages.filter((p) => !p.region || p.region === regionId);
    const available = regionPackages.filter((p) => p.is_active !== false);
    if (available.length > 0) {
      setSelectedPackage(available[0]);
    } else if (regionPackages.length > 0) {
      setSelectedPackage(regionPackages[0]);
    }
  };

  const handleVerify = async () => {
    if (!playerId.trim()) {
      setVerifyError('Por favor introduce tu ID de cuenta.');
      return;
    }

    if (!game || !selectedPackage) return;

    setVerifyError(null);
    setIsVerifying(true);
    try {
      const res = await playerService.verifyPlayer({
        productId: selectedPackage.sku,
        playerId: playerId.trim(),
        serverZone: serverZone.trim() || undefined,
      });

      if (res.valid) {
        setVerifiedName(res.playerName || `Jugador #${playerId}`);
        setVerifiedRegion(res.detectedRegion || selectedRegion);

        // Si se detectó una región diferente (ej: el usuario tenía Brasil pero su cuenta es LATAM), auto-ajustamos la región
        if (res.detectedRegion && res.detectedRegion !== selectedRegion) {
          handleSelectRegion(res.detectedRegion);
        }
      } else {
        setVerifyError(res.message || 'No se pudo validar el ID en el servidor del juego.');
        setVerifiedName(null);
        setVerifiedRegion(null);
      }
    } catch (err: any) {
      setVerifyError(err.message || 'Error al conectar con el servicio de verificación.');
      setVerifiedName(null);
      setVerifiedRegion(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAddToCart = () => {
    if (!game || !selectedPackage) return;

    const productItem = {
      id: selectedPackage.sku,
      name: `${game.name} - ${selectedPackage.name}`,
      game: game.name,
      category: game.category_label,
      price_cents: selectedPackage.price_cents,
      currency: selectedPackage.currency,
      image_url: game.image_url,
      requires_player_id: selectedPackage.requires_player_id,
      can_verify_player: selectedPackage.can_verify_player,
    };

    addItem(
      productItem,
      playerId.trim() || undefined,
      verifiedName || (playerId ? `ID: ${playerId.trim()}` : undefined)
    );
    onClose();
  };

  const handleDirectBuy = async () => {
    if (!game || !selectedPackage) return;

    setIsOrdering(true);
    setOrderErrorMsg(null);
    setOrderSuccessMsg(null);

    try {
      const res = await ordersService.createOrder({
        productId: selectedPackage.sku,
        playerId: playerId.trim() || undefined,
        playerName: verifiedName || undefined,
        currency: selectedPackage.currency,
      });

      setOrderSuccessMsg(
        `¡Orden #${res.orderId.slice(0, 8)} aceptada! Se ha enviado a la cola de despacho.`
      );
    } catch (err: any) {
      setOrderErrorMsg(err.message || 'Ocurrió un error al procesar la compra.');
    } finally {
      setIsOrdering(false);
    }
  };

  // Filtrar paquetes según la región activa
  const visiblePackages = game
    ? selectedRegion
      ? game.packages.filter((p) => !p.region || p.region === selectedRegion)
      : game.packages
    : [];

  const isSufficientFunds =
    selectedPackage ? wallet.available_balance_cents >= selectedPackage.price_cents : false;

  const isPlayerValid =
    !game?.requires_player_id ||
    (game.can_verify_player ? Boolean(verifiedName) : Boolean(playerId.trim()));

  const missingCents = selectedPackage
    ? Math.max(0, selectedPackage.price_cents - wallet.available_balance_cents)
    : 0;
  const missingDollars = (missingCents / 100).toFixed(2);

  const isPassOrSubscription = (pkg: GamePackage) => {
    const n = pkg.name.toLowerCase();
    return n.includes('pase') || n.includes('semanal') || n.includes('mensual') || n.includes('suscrip');
  };

  const diamondPackages = visiblePackages.filter((p) => !isPassOrSubscription(p));
  const subscriptionPackages = visiblePackages.filter((p) => isPassOrSubscription(p));

  const canProceed = Boolean(selectedPackage) && isSufficientFunds && isPlayerValid && !circuitBreakerActive;

  return (
    <>
      {/* ========================================================================= */}
      {/* VISTA MÓVIL (md:hidden): Pantalla Completa Estilo Proveedor (Imagen 2)    */}
      {/* ========================================================================= */}
      <div className="md:hidden fixed inset-0 z-50 bg-[#F8FAFC] text-slate-800 flex flex-col overflow-hidden animate-fade-in">
        {/* Barra Superior Móvil */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-2xs shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
            <span>Elegir paquete</span>
          </button>

          {game && (
            <div className="flex items-center gap-2">
              <img
                src={game.image_url}
                alt={game.name}
                className="w-6 h-6 rounded-lg object-cover border border-slate-100"
              />
              <span className="font-extrabold text-xs text-slate-900 truncate max-w-[120px]">
                {game.name}
              </span>
            </div>
          )}

          <div className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black">
            $ {(wallet.available_balance_cents / 100).toFixed(2)}
          </div>
        </div>

        {/* Cuerpo Desplazable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoadingGame || !game ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Cargando paquetes en vivo...</p>
            </div>
          ) : (
            <>
              {/* Notificación de Éxito Móvil */}
              {orderSuccessMsg && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800 font-bold shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{orderSuccessMsg}</span>
                  </div>
                  <button
                    onClick={onClose}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold"
                  >
                    OK
                  </button>
                </div>
              )}

              {/* Notificación de Error Móvil */}
              {orderErrorMsg && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs text-red-800 shadow-xs">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{orderErrorMsg}</span>
                </div>
              )}

              {/* Selector de Región / Servidor Píldoras */}
              {game.regions && game.regions.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {game.regions.map((reg) => (
                    <button
                      key={reg.id}
                      type="button"
                      onClick={() => handleSelectRegion(reg.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                        selectedRegion === reg.id
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700'
                      }`}
                    >
                      {reg.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Formulario de Player ID Móvil */}
              {game.requires_player_id ? (
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {game.player_id_label || 'ID de Jugador (UID)'}
                    </span>
                    {verifiedName && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {verifiedName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={playerId}
                      onChange={(e) => {
                        setPlayerId(e.target.value);
                        setVerifiedName(null);
                        setVerifiedRegion(null);
                        setVerifyError(null);
                      }}
                      placeholder={game.player_id_placeholder || 'Ingresa tu Player ID'}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:border-indigo-500"
                    />
                    {game.can_verify_player && (
                      <button
                        type="button"
                        onClick={handleVerify}
                        disabled={!playerId.trim() || Boolean(verifiedName) || isVerifying}
                        className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold whitespace-nowrap active:scale-95 disabled:opacity-50 transition-all"
                      >
                        {isVerifying ? 'Verificando...' : verifiedName ? 'Verificado' : 'Verificar'}
                      </button>
                    )}
                  </div>
                  {game.requires_server && (
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">
                        {game.server_label || 'Servidor / Zone ID'}
                      </span>
                      <input
                        type="text"
                        value={serverZone}
                        onChange={(e) => setServerZone(e.target.value)}
                        placeholder={game.server_placeholder || 'Ej: 2045'}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                  {verifyError && (
                    <p className="text-[11px] text-red-600 font-medium">{verifyError}</p>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <p>Código digital oficial. Se despachará inmediatamente tras confirmar la compra.</p>
                </div>
              )}

              {/* Categoría: DIAMANTES (Cuadrícula 2 Columnas) */}
              {diamondPackages.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                    {subscriptionPackages.length > 0 ? 'Diamantes' : 'Paquetes Disponibles'}
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    {diamondPackages.map((pkg) => {
                      const isSelected = selectedPackage?.sku === pkg.sku;
                      const isAvailable = pkg.is_active !== false;

                      return (
                        <button
                          key={pkg.sku}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => isAvailable && setSelectedPackage(pkg)}
                          className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all min-h-[76px] active:scale-[0.98] ${
                            !isAvailable
                              ? 'opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed'
                              : isSelected
                              ? 'border-indigo-600 bg-[#f0edff] shadow-xs ring-2 ring-indigo-500/80'
                              : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                          }`}
                        >
                          <span className="text-xs font-extrabold text-slate-900 line-clamp-2">
                            {pkg.name} {pkg.name.toLowerCase().includes('diamante') ? '💎' : ''}
                          </span>
                          <span className="text-sm font-black text-slate-900 mt-2">
                            $ {(pkg.price_cents / 100).toFixed(2)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Categoría: PASES Y SUSCRIPCIONES (Cuadrícula 2 Columnas) */}
              {subscriptionPackages.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                    Pases y Suscripciones
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    {subscriptionPackages.map((pkg) => {
                      const isSelected = selectedPackage?.sku === pkg.sku;
                      const isAvailable = pkg.is_active !== false;

                      return (
                        <button
                          key={pkg.sku}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => isAvailable && setSelectedPackage(pkg)}
                          className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all min-h-[76px] active:scale-[0.98] ${
                            !isAvailable
                              ? 'opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed'
                              : isSelected
                              ? 'border-indigo-600 bg-[#f0edff] shadow-xs ring-2 ring-indigo-500/80'
                              : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                          }`}
                        >
                          <span className="text-xs font-extrabold text-slate-900 line-clamp-2">
                            {pkg.name} 💎
                          </span>
                          <span className="text-sm font-black text-slate-900 mt-2">
                            $ {(pkg.price_cents / 100).toFixed(2)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Barra Inferior Fija de Resumen y Compra (Móvil) */}
        {game && (
          <div className="bg-white border-t border-slate-200 p-4 space-y-2.5 shadow-lg shrink-0">
            {/* Warning si falta saldo */}
            {!isSufficientFunds && selectedPackage && !circuitBreakerActive && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Te faltan ${missingDollars} para vender este paquete</span>
              </div>
            )}

            {/* Pausa preventiva alerta */}
            {circuitBreakerActive && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Reposición de inventario con proveedor en curso.</span>
              </div>
            )}

            {/* Resumen de orden */}
            {selectedPackage && (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Paquete</span>
                  <span className="font-bold text-slate-900">{selectedPackage.name}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Saldo actual</span>
                  <span>$ {(wallet.available_balance_cents / 100).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-slate-900 font-extrabold text-sm">
                  <span>Cobrar al cliente</span>
                  <span className="text-indigo-600 font-black">$ {(selectedPackage.price_cents / 100).toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Botones de acción móvil */}
            <div className="space-y-2">
              {!isSufficientFunds && selectedPackage && !circuitBreakerActive ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/wallet/deposit');
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#6d5dfc] hover:bg-[#5c4ce3] text-white font-bold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Cargar saldo · faltan ${missingDollars}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDirectBuy}
                  disabled={!canProceed || isOrdering}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#6d5dfc] hover:bg-[#5c4ce3] disabled:opacity-50 text-white font-bold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>
                    {circuitBreakerActive
                      ? 'Pausa Preventiva'
                      : isOrdering
                      ? 'Procesando Recarga...'
                      : `Confirmar Recarga · $${selectedPackage ? (selectedPackage.price_cents / 100).toFixed(2) : '0.00'}`}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!selectedPackage || !isPlayerValid}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Agregar al Carrito</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VISTA ESCRITORIO (hidden md:flex): Modal Gamer Original Intacto           */}
      {/* ========================================================================= */}
      <div className="hidden md:flex fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="relative w-full max-w-3xl bg-[#0b0f19] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-all backdrop-blur-md border border-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header Banner */}
        {isLoadingGame || !game ? (
          <div className="h-44 bg-slate-900 animate-pulse" />
        ) : (
          <div className="relative h-44 sm:h-52 w-full overflow-hidden shrink-0">
            <img
              src={game.banner_url || game.image_url}
              alt={game.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-[#0b0f19]/70 to-black/50" />

            <div className="absolute bottom-4 left-5 right-12 flex items-end justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={game.category === 'direct_topup' ? 'primary' : 'warning'} size="sm">
                    {game.category_label}
                  </Badge>
                  {game.can_verify_player && (
                    <span className="inline-flex items-center gap-1 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-md text-[10px] font-bold text-emerald-300">
                      <ShieldCheck className="w-3 h-3" />
                      ID Verificable
                    </span>
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white font-['Rajdhani'] uppercase tracking-wide">
                  {game.name}
                </h2>
                <p className="text-xs text-slate-300 line-clamp-1 max-w-xl">
                  {game.description}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1">
          {isLoadingGame || !game ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Cargando catálogo en vivo de {gameId}...</p>
            </div>
          ) : (
            <>
              {/* Success Message Banner if order was placed */}
              {orderSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-white">¡Recarga Procesada!</h4>
                      <p className="text-xs text-emerald-300">{orderSuccessMsg}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={onClose}>
                    Cerrar
                  </Button>
                </div>
              )}

              {/* Error Message Banner */}
              {orderErrorMsg && (
                <div className="p-4 rounded-2xl bg-red-950/60 border border-red-500/50 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  <p className="text-xs text-red-200">{orderErrorMsg}</p>
                </div>
              )}

              {/* PASO 1: Datos de tu Cuenta */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                    1
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    {game.requires_player_id ? 'Ingresa los Datos de tu Cuenta' : 'Información de Entrega'}
                  </h3>
                </div>

                {game.requires_player_id ? (
                  <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Player ID Input */}
                      <div>
                        <Input
                          label={game.player_id_label || 'ID de Jugador (UID)'}
                          placeholder={game.player_id_placeholder || 'Ej: 123456789'}
                          value={playerId}
                          onChange={(e) => {
                            setPlayerId(e.target.value);
                            setVerifiedName(null);
                            setVerifiedRegion(null);
                            setVerifyError(null);
                          }}
                          helperText={game.player_id_hint || undefined}
                          error={verifyError || undefined}
                        />
                      </div>

                      {/* Optional Server / Zone ID */}
                      {game.requires_server && (
                        <div>
                          <Input
                            label={game.server_label || 'Zone ID / Servidor'}
                            placeholder={game.server_placeholder || 'Ej: 2045'}
                            value={serverZone}
                            onChange={(e) => {
                              setServerZone(e.target.value);
                              setVerifiedName(null);
                              setVerifiedRegion(null);
                              setVerifyError(null);
                            }}
                            helperText={game.server_hint || undefined}
                          />
                        </div>
                      )}
                    </div>

                    {/* Verification Button for verifiable games */}
                    {game.can_verify_player && (
                      <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-800/80">
                        <Button
                          type="button"
                          variant={verifiedName ? 'secondary' : 'outline'}
                          size="sm"
                          isLoading={isVerifying}
                          disabled={!playerId.trim() || Boolean(verifiedName)}
                          onClick={handleVerify}
                        >
                          <UserCheck className="w-4 h-4 mr-2" />
                          {verifiedName ? 'ID Verificado Correctamente' : 'Verificar Nombre del Jugador'}
                        </Button>

                        {/* Verified Nickname Chip */}
                        {verifiedName && (
                          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-bold animate-fade-in shadow-glow-primary">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>
                              Jugador:{' '}
                              <span className="text-white font-extrabold text-sm tracking-wide">
                                {verifiedName}
                              </span>
                              {verifiedRegion && (
                                <span className="ml-2 text-[10px] text-emerald-400 font-semibold px-1.5 py-0.5 rounded bg-emerald-900/60 border border-emerald-500/30">
                                  {verifiedRegion.toUpperCase()}
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-300 space-y-1">
                      <p className="font-bold text-white">Entrega de Código Digital Instantáneo</p>
                      <p>
                        Este producto no requiere ID de juego. Al completar la compra, recibirás un código alfanumérico oficial para canjear en la tienda de {game.name}.
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {/* PASO 2: Selecciona la Recarga (Denominaciones) */}
              <section className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                      2
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                      Selecciona la Recarga ({visiblePackages.length} disponibles)
                    </h3>
                  </div>

                  {/* Selector de Región / Servidor cuando aplica */}
                  {game.regions && game.regions.length > 1 && (
                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800 self-start sm:self-auto">
                      <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
                      {game.regions.map((reg) => (
                        <button
                          key={reg.id}
                          type="button"
                          onClick={() => handleSelectRegion(reg.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            selectedRegion === reg.id
                              ? 'bg-indigo-600 text-white shadow-glow-primary'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {reg.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {visiblePackages.map((pkg) => {
                    const isSelected = selectedPackage?.sku === pkg.sku;
                    const isAvailable = pkg.is_active !== false;

                    return (
                      <button
                        key={pkg.sku}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => isAvailable && setSelectedPackage(pkg)}
                        className={`relative text-left p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                          !isAvailable
                            ? 'opacity-40 bg-slate-950/80 border-slate-900 cursor-not-allowed'
                            : isSelected
                            ? 'bg-indigo-600/20 border-cyan-400 shadow-glow-primary scale-[1.02]'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                        }`}
                      >
                        {isSelected && isAvailable && (
                          <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}

                        {!isAvailable && (
                          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-black uppercase">
                            Agotado
                          </span>
                        )}

                        <div>
                          <span className="text-xs font-bold text-white line-clamp-2 pr-4">
                            {pkg.name}
                          </span>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-baseline justify-between">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">
                            {isAvailable ? 'Precio' : 'No disponible'}
                          </span>
                          <PriceDisplay
                            cents={pkg.price_cents}
                            currency={pkg.currency}
                            size="sm"
                            className={!isAvailable ? 'text-slate-500 line-through' : isSelected ? 'text-cyan-300 font-bold' : 'text-white'}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* PASO 3: Saldo y Confirmación */}
              <section className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Saldo Virtual Disponible
                      </span>
                      <PriceDisplay
                        cents={wallet.available_balance_cents}
                        currency={wallet.currency}
                        size="md"
                        className="text-white"
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Total a Pagar
                    </span>
                    {selectedPackage ? (
                      <PriceDisplay
                        cents={selectedPackage.price_cents}
                        currency={selectedPackage.currency}
                        size="lg"
                        className="text-cyan-400 font-black"
                      />
                    ) : (
                      <span className="text-slate-500 text-sm">-</span>
                    )}
                  </div>
                </div>

                {/* Circuit Breaker Restocking Warning */}
                {circuitBreakerActive && (
                  <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-500/50 flex items-start gap-2.5 text-xs text-amber-200 shadow-md">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold text-amber-300">Pausa Preventiva de Inventario</strong>
                      <span>
                        {circuitBreakerMessage || 'Estamos reponiendo inventario de recargas con el proveedor central. El servicio se reactivará en breves momentos.'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Insufficient Funds Warning */}
                {!isSufficientFunds && selectedPackage && !circuitBreakerActive && (
                  <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-center gap-2.5 text-xs text-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Saldo insuficiente. Necesitas{' '}
                      <strong>
                        ${((selectedPackage.price_cents - wallet.available_balance_cents) / 100).toFixed(2)} USD
                      </strong>{' '}
                      adicionales para completar esta recarga.
                    </span>
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* Modal Footer Actions */}
        {game && (
          <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Entrega inmediata debitada de tu saldo virtual.</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleAddToCart}
                disabled={!selectedPackage || !isPlayerValid}
                className="w-1/2 sm:w-auto"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Al Carrito
              </Button>

              <Button
                type="button"
                variant={circuitBreakerActive ? 'secondary' : 'accent'}
                size="md"
                onClick={handleDirectBuy}
                disabled={!canProceed}
                isLoading={isOrdering}
                glow={canProceed}
                className="w-1/2 sm:w-auto"
              >
                <Zap className="w-4 h-4 mr-2" />
                {circuitBreakerActive ? 'Pausa Preventiva' : 'Recargar Ahora'}
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  );
};
