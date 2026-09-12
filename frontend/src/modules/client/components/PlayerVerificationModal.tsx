import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/atoms/Modal';
import { Input } from '../../../components/atoms/Input';
import { Button } from '../../../components/atoms/Button';
import { playerService } from '../../../services/api/player.service';
import { useUIStore } from '../../../store/useUIStore';
import { CheckCircle2, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';
import { PriceDisplay } from '../../../components/molecules/PriceDisplay';

export const PlayerVerificationModal: React.FC = () => {
  const { verificationModal, closeVerificationModal } = useUIStore();
  const { isOpen, product, onSuccess } = verificationModal;

  const [playerId, setPlayerId] = useState('');
  const [serverZone, setServerZone] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPlayerId('');
      setServerZone('');
      setVerifiedName(null);
      setError(null);
    }
  }, [isOpen]);

  if (!product) return null;

  const handleVerify = async () => {
    if (!playerId.trim()) {
      setError('Por favor introduce tu ID de jugador.');
      return;
    }

    setError(null);
    setIsVerifying(true);
    try {
      const res = await playerService.verifyPlayer({
        productId: product.id,
        playerId: playerId.trim(),
        serverZone: serverZone.trim() || undefined,
      });

      if (res.valid) {
        setVerifiedName(res.playerName || `Jugador #${playerId}`);
      } else {
        setError(res.message || 'No se pudo encontrar al jugador con ese ID.');
        setVerifiedName(null);
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor de verificación.');
      setVerifiedName(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirm = () => {
    // If can_verify_player is true, verifiedName is required
    if (product.can_verify_player && !verifiedName) {
      setError('Debes verificar el jugador antes de continuar.');
      return;
    }

    if (onSuccess) {
      onSuccess(playerId.trim(), verifiedName || `ID: ${playerId.trim()}`);
    }
    closeVerificationModal();
  };

  const isConfirmEnabled = product.can_verify_player ? Boolean(verifiedName) : Boolean(playerId.trim());

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeVerificationModal}
      title="Datos de tu Cuenta de Juego"
      description={`Para acreditar "${product.name}", ingresa los datos de tu cuenta en ${product.game}.`}
      maxWidth="md"
    >
      <div className="space-y-4 mt-2">
        {/* Product preview bar */}
        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-10 h-10 rounded-lg object-cover border border-slate-800"
            />
            <div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase block">
                {product.game}
              </span>
              <h4 className="text-xs font-bold text-white">{product.name}</h4>
            </div>
          </div>
          <PriceDisplay
            cents={product.price_cents}
            currency={product.currency}
            size="sm"
            className="text-cyan-400"
          />
        </div>

        {/* Player ID Field */}
        <div>
          <Input
            label="Player ID (ID de Cuenta)"
            placeholder="Ej: 849204819"
            value={playerId}
            onChange={(e) => {
              setPlayerId(e.target.value);
              setVerifiedName(null);
              setError(null);
            }}
            error={error || undefined}
            helperText="Encuentra tu ID en el perfil principal del juego."
            disabled={isVerifying}
          />
        </div>

        {/* Optional Server / Zone ID for games that need it (e.g. MLBB) */}
        {product.game.includes('Mobile Legends') && (
          <div>
            <Input
              label="Zone ID (Servidor)"
              placeholder="Ej: 2045"
              value={serverZone}
              onChange={(e) => setServerZone(e.target.value)}
              helperText="Los 4 dígitos entre paréntesis junto a tu ID."
            />
          </div>
        )}

        {/* Verification Trigger for can_verify_player */}
        {product.can_verify_player && (
          <div className="space-y-2">
            <Button
              type="button"
              variant={verifiedName ? 'secondary' : 'outline'}
              size="sm"
              className="w-full"
              isLoading={isVerifying}
              disabled={!playerId.trim() || Boolean(verifiedName)}
              onClick={handleVerify}
            >
              <UserCheck className="w-4 h-4 mr-2" />
              {verifiedName ? 'ID Verificado Correctamente' : 'Verificar Nombre del Jugador'}
            </Button>

            {/* Verified Player Badge */}
            {verifiedName && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-300 block">
                      Jugador Encontrado
                    </span>
                    <span className="text-sm font-extrabold text-white">
                      {verifiedName}
                    </span>
                  </div>
                </div>
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
            )}
          </div>
        )}

        {/* Note if verify is required */}
        {product.can_verify_player && !verifiedName && (
          <p className="text-[11px] text-amber-400/90 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Por seguridad, debes verificar tu cuenta antes de habilitar la compra.
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="md"
            className="w-1/3"
            onClick={closeVerificationModal}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="accent"
            size="md"
            className="w-2/3"
            disabled={!isConfirmEnabled}
            onClick={handleConfirm}
            glow={isConfirmEnabled}
          >
            Añadir al Carrito
          </Button>
        </div>
      </div>
    </Modal>
  );
};

