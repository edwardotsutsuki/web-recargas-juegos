import React, { useState, useEffect } from 'react';
import { GameDetail, GamePackage, Product, CustomPrice } from '../../../types';
import { catalogService } from '../../../services/api/catalog.service';
import { playerService } from '../../../services/api/player.service';
import { ordersService } from '../../../services/api/orders.service';
import { resellerService } from '../../../services/api/reseller.service';
import { useWalletStore } from '../../../store/useWalletStore';
import { useCartStore } from '../../../store/useCartStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { Button } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import {
  ArrowLeft,
  UserCheck,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Zap,
  ShoppingCart,
  Check,
  Sparkles,
  Globe,
  AlertTriangle,
  Clock,
  Star,
  Tag,
  TrendingUp,
  Edit3,
  Share2,
  Save,
  X,
} from 'lucide-react';

interface GameTopupPanoramicViewProps {
  gameId: string;
  onBack: () => void;
  circuitBreakerActive?: boolean;
  circuitBreakerMessage?: string;
}

export const GameTopupPanoramicView: React.FC<GameTopupPanoramicViewProps> = ({
  gameId,
  onBack,
  circuitBreakerActive = false,
  circuitBreakerMessage,
}) => {
  const { role, user } = useAuthStore();
  const { wallet, fetchWallet } = useWalletStore();
  const { addItem } = useCartStore();

  const [game, setGame] = useState<GameDetail | null>(null);
  const [isLoadingGame, setIsLoadingGame] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<GamePackage | null>(null);

  // Precios personalizados de reventa (PVP fijado por el revendedor)
  const [customPricesMap, setCustomPricesMap] = useState<Record<string, number>>({});
  const [editingPvpSku, setEditingPvpSku] = useState<string | null>(null);
  const [tempPvpInput, setTempPvpInput] = useState<string>('');
  const [isSavingPvp, setIsSavingPvp] = useState<boolean>(false);

  // Player fields
  const [playerId, setPlayerId] = useState('');
  const [serverZone, setServerZone] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [verifiedRegion, setVerifiedRegion] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Processing state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);
  const [orderErrorMsg, setOrderErrorMsg] = useState<string | null>(null);

  // Cargar precios personalizados del revendedor
  useEffect(() => {
    if (user?.id) {
      resellerService
        .getCustomPrices()
        .then((prices: CustomPrice[]) => {
          if (Array.isArray(prices)) {
            const map: Record<string, number> = {};
            for (const cp of prices) {
              map[cp.sku] = cp.custom_pvp_cents;
            }
            setCustomPricesMap(map);
          }
        })
        .catch((err) => {
          console.warn('No se pudieron cargar precios PVP del revendedor:', err);
        });
    }
  }, [user?.id]);

  const handleSaveCustomPvp = async (sku: string, pvpDecimalStr: string) => {
    const clean = (pvpDecimalStr || '').replace(/,/g, '.').trim();
    const num = parseFloat(clean);
    if (isNaN(num) || num <= 0) return;
    setIsSavingPvp(true);
    try {
      await resellerService.setCustomPrice(sku, num);
      setCustomPricesMap((prev) => ({ ...prev, [sku]: Math.round(num * 100) }));
      setEditingPvpSku(null);
    } catch (err) {
      console.error('Error guardando PVP:', err);
    } finally {
      setIsSavingPvp(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoadingGame(true);
    catalogService
      .getGameDetails(gameId)
      .then((data: GameDetail | null) => {
        if (!isMounted) return;
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
      .catch((err: any) => {
        console.error('Error cargando detalles del juego:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingGame(false);
      });

    return () => {
      isMounted = false;
    };
  }, [gameId]);

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
    if (!playerId.trim() || !game || !selectedPackage) return;
    setIsVerifying(true);
    setVerifyError(null);
    setVerifiedName(null);
    setVerifiedRegion(null);

    try {
      const res = await playerService.verifyPlayer({
        productId: selectedPackage.sku,
        playerId: playerId.trim(),
        serverZone: serverZone.trim() || undefined,
      });

      if (res.valid) {
        const nameToDisplay =
          res.playerName ||
          (res.message && res.message.includes('juego no expone')
            ? 'Cuenta Verificada (Nombre Oculto)'
            : `Jugador #${playerId}`);
        setVerifiedName(nameToDisplay);
        setVerifiedRegion(res.detectedRegion || selectedRegion);

        if (res.detectedRegion && res.detectedRegion !== selectedRegion) {
          handleSelectRegion(res.detectedRegion);
        }
      } else {
        setVerifyError(res.message || 'Jugador no encontrado. Verifica el ID ingresado.');
      }
    } catch {
      setVerifyError('Error al contactar con el servicio oficial de verificación.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCustomFieldChange = (key: string, val: string) => {
    setCustomFields((prev) => ({ ...prev, [key]: val }));
  };

  const hasRequiredFields = Boolean(
    selectedPackage?.required_fields && selectedPackage.required_fields.length > 0
  );

  const areCustomFieldsValid = hasRequiredFields
    ? selectedPackage!.required_fields!.every(
        (f) => !f.required || (customFields[f.key] && customFields[f.key].trim().length > 0)
      )
    : true;

  const isPlayerValid = hasRequiredFields
    ? areCustomFieldsValid
    : !game?.requires_player_id ||
      (game.can_verify_player ? Boolean(verifiedName) : Boolean(playerId.trim()));

  const handleAddToCart = () => {
    if (!selectedPackage || !game) return;
    const productItem: Product = {
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
      hasRequiredFields ? undefined : playerId.trim() || undefined,
      hasRequiredFields
        ? undefined
        : verifiedName || (playerId ? `ID: ${playerId.trim()}` : undefined),
      hasRequiredFields ? customFields : undefined
    );
  };

  const handleBuyNow = async () => {
    if (!selectedPackage || !game || !isPlayerValid) return;
    setIsSubmitting(true);
    setOrderErrorMsg(null);
    setOrderSuccessMsg(null);

    try {
      const res: any = await ordersService.createOrder({
        productId: selectedPackage.sku,
        playerId: hasRequiredFields ? undefined : playerId.trim() || undefined,
        playerName: hasRequiredFields ? undefined : verifiedName || undefined,
        fields: hasRequiredFields ? customFields : undefined,
        currency: selectedPackage.currency || 'USD',
      });

      const displayId = res?.orderId || res?.id || '';
      setOrderSuccessMsg(
        `¡Orden #${displayId.slice(0, 8)} generada exitosamente! Tu recarga está siendo procesada en vivo.`
      );
      fetchWallet();
    } catch (err: any) {
      setOrderErrorMsg(
        err?.message || 'No se pudo procesar la recarga. Verifica tu saldo e inténtalo de nuevo.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingGame || !game) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-400">Cargando catálogo oficial de recargas...</p>
      </div>
    );
  }

  // Filtrado de paquetes por región
  const regionPackages = selectedRegion
    ? game.packages.filter((p) => !p.region || p.region === selectedRegion)
    : game.packages;

  const isPassOrSubscription = (pkg: GamePackage) => {
    const n = pkg.name.toLowerCase();
    return n.includes('pase') || n.includes('semanal') || n.includes('mensual') || n.includes('suscrip');
  };

  const isPopularPackage = (pkg: GamePackage, index: number) => {
    const n = pkg.name.toLowerCase();
    return (
      n.includes('341') ||
      n.includes('100 +') ||
      n.includes('semanal') ||
      index === 1
    );
  };

  const diamondPackages = regionPackages.filter((p) => !isPassOrSubscription(p));
  const subscriptionPackages = regionPackages.filter((p) => isPassOrSubscription(p));

  const currentPriceCents = selectedPackage ? selectedPackage.price_cents : 0;
  const selectedPvpCents = selectedPackage
    ? customPricesMap[selectedPackage.sku] || Math.round(selectedPackage.price_cents * 1.2)
    : 0;
  const selectedProfitCents = Math.max(0, selectedPvpCents - currentPriceCents);
  const selectedMarginPercent =
    currentPriceCents > 0 ? Math.round((selectedProfitCents / currentPriceCents) * 100) : 0;
  const hasEnoughBalance = wallet.available_balance_cents >= currentPriceCents;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ========================================================================= */}
      {/* BARRA SUPERIOR DE ACCIÓN (Estilo B2B Proveedor): Volver + Datos del Juego */}
      {/* El saldo está centralizado de forma limpia en el header principal         */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBack}
            className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-bold transition-all flex items-center gap-2 border border-slate-700/60 active:scale-95 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>Volver a Juegos</span>
          </button>

          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
            <img
              src={game.image_url}
              alt={game.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white font-['Rajdhani'] uppercase tracking-wide">
                {game.name}
              </h2>
              {game.is_featured && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase">
                {game.category_label}
              </span>
              {game.can_verify_player && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ID Verificable
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {game.subtitle || game.description}
            </p>
          </div>
        </div>
      </div>

      {/* Alerta de Pausa Preventiva / Freno de Emergencia */}
      {circuitBreakerActive && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-white uppercase font-['Rajdhani'] flex items-center gap-2">
              Reposición de Inventario de Recargas en Curso
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-sans font-bold">
                Pausa Preventiva
              </span>
            </h3>
            <p className="text-xs text-slate-300">
              {circuitBreakerMessage ||
                'Estamos reponiendo inventario de recargas. El servicio se reactivará automáticamente en unos momentos.'}
            </p>
          </div>
        </div>
      )}

      {/* Banners de Confirmación o Error */}
      {orderSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 space-y-3 shadow-lg">
          <div className="flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-semibold text-white">{orderSuccessMsg}</span>
            </div>
            <button
              onClick={() => setOrderSuccessMsg(null)}
              className="text-emerald-400 hover:text-white font-bold underline text-xs"
            >
              Cerrar
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-emerald-800/60">
            <div className="text-xs text-emerald-200">
              <span>Cobraste a tu cliente: <strong className="text-white">${(selectedPvpCents / 100).toFixed(2)} USD</strong></span>
              <span className="mx-2">·</span>
              <span>Tu ganancia neta: <strong className="text-emerald-400">+${(selectedProfitCents / 100).toFixed(2)} USD ({selectedMarginPercent}%)</strong></span>
            </div>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `🎮 *COMPROBANTE DE RECARGA EXITOSA* 🎮\n\n` +
                `🕹️ *Juego:* ${game.name}\n` +
                `💎 *Paquete:* ${selectedPackage?.name}\n` +
                (playerId ? `👤 *ID Jugador:* ${playerId}\n` : '') +
                (verifiedName ? `🏷️ *Nombre:* ${verifiedName}\n` : '') +
                `💵 *Total Pagado:* $${(selectedPvpCents / 100).toFixed(2)} USD\n` +
                `⚡ *Estado:* ¡Recarga Completada y Entregada con Éxito!\n\n` +
                `¡Gracias por tu compra!`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Enviar Comprobante WhatsApp al Cliente</span>
            </a>
          </div>
        </div>
      )}

      {orderErrorMsg && (
        <div className="p-4 rounded-2xl bg-red-950/70 border border-red-500/50 flex items-center gap-3 text-xs text-red-200 shadow-lg">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span className="font-semibold">{orderErrorMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CUERPO PANORÁMICO DE 2 COLUMNAS (Estilo Widescreen B2B)                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMNA IZQUIERDA: Formulario de Jugador + Resumen de Orden (Sticky) */}
        <div className="lg:col-span-4 xl:col-span-4 2xl:col-span-3 space-y-4 lg:sticky lg:top-20">
          {/* PASO 1: Datos de la Cuenta */}
          <div className="p-5 rounded-2xl bg-[#0b0f19] border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
                1
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Datos de la Cuenta
              </h3>
            </div>

            {/* Campos condicionales según tipo de entrega */}
            {selectedPackage?.delivery?.mode === 'human' ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-xs text-amber-300">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-200 block">Atención Manual de Operadores</span>
                    Horario de entrega: {selectedPackage.delivery.hours || '10:00 - 22:00 Lima'}
                  </div>
                </div>

                {(selectedPackage.required_fields || []).map((field) => (
                  <div key={field.key}>
                    <Input
                      label={field.label}
                      placeholder={field.help || `Ingresa tu ${field.label}`}
                      type={field.sensitive ? 'password' : 'text'}
                      value={customFields[field.key] || ''}
                      onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                      required={field.required}
                    />
                  </div>
                ))}
              </div>
            ) : game.requires_player_id ? (
              <div className="space-y-3">
                <Input
                  label={game.player_id_label || 'ID de Jugador (UID)'}
                  placeholder={game.player_id_placeholder || 'Ej: 198273645'}
                  value={playerId}
                  onChange={(e) => {
                    setPlayerId(e.target.value);
                    setVerifiedName(null);
                    setVerifiedRegion(null);
                    setVerifyError(null);
                  }}
                  helperText={game.player_id_hint || 'Encuentra tu ID de 8 a 10 dígitos en tu perfil del juego.'}
                  error={verifyError || undefined}
                />

                {game.requires_server && (
                  <Input
                    label={game.server_label || 'Servidor / Zone ID'}
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
                )}

                {!game.can_verify_player && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>Verificación de nombre no disponible. Comprueba tu ID antes de enviar.</span>
                  </div>
                )}

                {game.can_verify_player && (
                  <div className="space-y-2 pt-1">
                    <Button
                      type="button"
                      variant={verifiedName ? 'secondary' : 'outline'}
                      size="sm"
                      isLoading={isVerifying}
                      disabled={!playerId.trim() || Boolean(verifiedName)}
                      onClick={handleVerify}
                      className="w-full text-xs font-bold"
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                      {verifiedName ? 'ID Verificado' : 'Verificar Nombre del Jugador'}
                    </Button>

                    {verifiedName && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5 truncate">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-white truncate">{verifiedName}</span>
                        </span>
                        {verifiedRegion && (
                          <span className="text-[10px] bg-emerald-900/60 px-1.5 py-0.5 rounded text-emerald-400 uppercase">
                            {verifiedRegion}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-slate-300 space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Código Digital Directo
                </span>
                <p className="text-[11px] text-slate-400">
                  No requiere ID. Recibirás tu código oficial al instante tras completar la orden.
                </p>
              </div>
            )}
          </div>

          {/* Resumen de Orden B2B */}
          <div className="p-5 rounded-2xl bg-[#0b0f19] border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Resumen de Orden
              </h3>
              {selectedPackage && (
                <span className="text-[11px] font-bold text-indigo-400 truncate max-w-[150px]">
                  {selectedPackage.name}
                </span>
              )}
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Costo Plataforma</span>
                <span className="font-bold text-white">
                  ${(currentPriceCents / 100).toFixed(2)} USD
                </span>
              </div>

              {/* PVP al Cliente Final */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <span className="text-indigo-300 font-bold flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" /> Tu PVP al Cliente
                </span>
                <span className="font-black text-indigo-300 text-sm">
                  ${(selectedPvpCents / 100).toFixed(2)} USD
                </span>
              </div>

              {/* Ganancia Neta Estimada */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Tu Ganancia Neta
                </span>
                <span className="font-black text-emerald-400 text-sm">
                  +${(selectedProfitCents / 100).toFixed(2)} USD ({selectedMarginPercent}%)
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-400 pt-1">
                <span>Tu saldo disponible</span>
                <span className={`font-bold ${hasEnoughBalance ? 'text-slate-300' : 'text-amber-400'}`}>
                  ${(wallet.available_balance_cents / 100).toFixed(2)} USD
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="font-black text-xs uppercase text-white block">Total a Pagar</span>
                  <span className="text-[10px] text-slate-400">Débito directo de tu billetera</span>
                </div>
                <span className="font-black text-base text-cyan-400">
                  ${(currentPriceCents / 100).toFixed(2)} USD
                </span>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="space-y-2 pt-2">
              <Button
                type="button"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                disabled={!selectedPackage || !isPlayerValid || circuitBreakerActive}
                onClick={handleBuyNow}
                className="w-full text-xs font-bold shadow-glow-primary"
              >
                {circuitBreakerActive ? (
                  'Pausa Preventiva'
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-1.5 text-cyan-300" />
                    Comprar Ahora
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!selectedPackage || !isPlayerValid}
                className="w-full py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 border border-slate-700/80 disabled:opacity-50"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-slate-400" />
                <span>Agregar al Carrito</span>
              </button>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Denominaciones y Paquetes (Fluida con Grilla Auto-Adaptable) */}
        <div className="lg:col-span-8 xl:col-span-8 2xl:col-span-9 space-y-6">
          <div className="p-5 rounded-2xl bg-[#0b0f19] border border-slate-800 shadow-lg space-y-6">
            {/* Header del Paso 2: Selector de Región / Servidor */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
                  2
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Selecciona la Denominación ({regionPackages.length} paquetes disponibles)
                </h3>
              </div>

              {game.regions && game.regions.length > 1 && (
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold">
                  <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
                  {game.regions.map((reg) => (
                    <button
                      key={reg.id}
                      onClick={() => handleSelectRegion(reg.id)}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        selectedRegion === reg.id
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {reg.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* SECCIÓN 1: Diamantes y Monedas */}
            {diamondPackages.length > 0 && (
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Diamantes y Monedas
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                  {diamondPackages.map((pkg, idx) => {
                    const isSelected = selectedPackage?.id === pkg.id;
                    const platformCostCents = pkg.price_cents;
                    const resellerPvpCents = customPricesMap[pkg.sku] || Math.round(platformCostCents * 1.2);
                    const resellerProfitCents = Math.max(0, resellerPvpCents - platformCostCents);
                    const marginPercent = platformCostCents > 0 ? Math.round((resellerProfitCents / platformCostCents) * 100) : 0;
                    const isPopular = isPopularPackage(pkg, idx);

                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setSelectedPackage(pkg)}
                        className={`relative p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[135px] group ${
                          isSelected
                            ? 'bg-indigo-950/70 border-cyan-400 shadow-glow-primary'
                            : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        {isPopular && (
                          <span className="absolute -top-2 left-3 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-wider shadow-xs">
                            Más pedido
                          </span>
                        )}

                        <div className="flex items-start justify-between gap-1 w-full">
                          <span className="font-extrabold text-white text-xs tracking-tight line-clamp-2">
                            {pkg.name}
                          </span>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center shrink-0">
                              <Check className="w-2.5 h-2.5 text-slate-950 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-1 mt-2 w-full">
                          <div className="flex items-baseline justify-between gap-1">
                            <div>
                              <span className="text-[10px] text-slate-400 font-medium block">Costo:</span>
                              <div className="text-xs font-black text-white">
                                ${(platformCostCents / 100).toFixed(2)}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-indigo-300 font-bold block">Tu PVP:</span>
                              <div className="text-xs font-black text-cyan-300">
                                ${(resellerPvpCents / 100).toFixed(2)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/60">
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/20 truncate">
                              +{marginPercent}% (+${(resellerProfitCents / 100).toFixed(2)})
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingPvpSku(pkg.sku);
                                setTempPvpInput((resellerPvpCents / 100).toFixed(2));
                              }}
                              title="Personalizar tu precio de venta final (PVP)"
                              className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 transition-colors shrink-0"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </div>

                          {role === 'admin' && (pkg.wholesale_cents || 0) > 0 && (
                            <div className="text-[9px] text-slate-500 font-mono truncate">
                              API: ${((pkg.wholesale_cents || 0) / 100).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECCIÓN 2: Pases y Suscripciones */}
            {subscriptionPackages.length > 0 && (
              <div className="space-y-3 pt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Pases y Suscripciones
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                  {subscriptionPackages.map((pkg, idx) => {
                    const isSelected = selectedPackage?.id === pkg.id;
                    const platformCostCents = pkg.price_cents;
                    const resellerPvpCents = customPricesMap[pkg.sku] || Math.round(platformCostCents * 1.2);
                    const resellerProfitCents = Math.max(0, resellerPvpCents - platformCostCents);
                    const marginPercent = platformCostCents > 0 ? Math.round((resellerProfitCents / platformCostCents) * 100) : 0;
                    const isPopular = isPopularPackage(pkg, idx);

                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setSelectedPackage(pkg)}
                        className={`relative p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[135px] group ${
                          isSelected
                            ? 'bg-indigo-950/70 border-cyan-400 shadow-glow-primary'
                            : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        {isPopular && (
                          <span className="absolute -top-2 left-3 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-wider shadow-xs">
                            Más pedido
                          </span>
                        )}

                        <div className="flex items-start justify-between gap-1 w-full">
                          <span className="font-extrabold text-white text-xs tracking-tight line-clamp-2">
                            {pkg.name}
                          </span>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center shrink-0">
                              <Check className="w-2.5 h-2.5 text-slate-950 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-1 mt-2 w-full">
                          <div className="flex items-baseline justify-between gap-1">
                            <div>
                              <span className="text-[10px] text-slate-400 font-medium block">Costo:</span>
                              <div className="text-xs font-black text-white">
                                ${(platformCostCents / 100).toFixed(2)}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-indigo-300 font-bold block">Tu PVP:</span>
                              <div className="text-xs font-black text-cyan-300">
                                ${(resellerPvpCents / 100).toFixed(2)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/60">
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/20 truncate">
                              +{marginPercent}% (+${(resellerProfitCents / 100).toFixed(2)})
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingPvpSku(pkg.sku);
                                setTempPvpInput((resellerPvpCents / 100).toFixed(2));
                              }}
                              title="Personalizar tu precio de venta final (PVP)"
                              className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 transition-colors shrink-0"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </div>

                          {role === 'admin' && (pkg.wholesale_cents || 0) > 0 && (
                            <div className="text-[9px] text-slate-500 font-mono truncate">
                              API: ${((pkg.wholesale_cents || 0) / 100).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal flotante de edición rápida de PVP */}
      {editingPvpSku && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setEditingPvpSku(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-cyan-400" />
                Ajustar Tu Precio de Venta (PVP)
              </h4>
              <button
                onClick={() => setEditingPvpSku(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-2">
              <p>Define cuánto le cobrarás a tu cliente final por este paquete. Tu ganancia neta se calculará en vivo.</p>
              {selectedPackage && (
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Costo Plataforma:</span>
                  <span className="font-bold text-white">${(selectedPackage.price_cents / 100).toFixed(2)} USD</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">
                Tu PVP al Cliente Final (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={tempPvpInput}
                  onChange={(e) => setTempPvpInput(e.target.value.replace(/,/g, '.'))}
                  onBlur={() => {
                    const num = parseFloat(tempPvpInput.replace(/,/g, '.'));
                    if (!isNaN(num) && num > 0) setTempPvpInput(num.toFixed(2));
                  }}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-sm font-bold focus:outline-none focus:border-cyan-400"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingPvpSku(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                isLoading={isSavingPvp}
                onClick={() => handleSaveCustomPvp(editingPvpSku, tempPvpInput)}
                className="flex-1 text-xs font-bold"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Guardar PVP
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

