import React, { useState, useEffect, useRef } from 'react';
import { useCashierStore } from '../../../store/useCashierStore';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, Lock, X, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/atoms/Button';

export const CashierPinModal: React.FC = () => {
  const {
    isPinModalOpen,
    pinModalPurpose,
    pendingRedirect,
    errorMessage,
    isVerifying,
    closePinModal,
    verifyAndExecutePin,
  } = useCashierStore();

  const navigate = useNavigate();
  const [pinInput, setPinInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isPinModalOpen) {
      setPinInput('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isPinModalOpen]);

  if (!isPinModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await verifyAndExecutePin(pinInput, () => {
      if (pendingRedirect) navigate(pendingRedirect);
    });
    if (!ok) {
      setPinInput('');
      inputRef.current?.focus();
    }
  };

  const isEnabling = pinModalPurpose === 'enable';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl space-y-5 text-center">
        {/* Close Button */}
        <button
          onClick={closePinModal}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon Header */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-glow-primary">
          {isEnabling ? <ShieldCheck className="w-7 h-7" /> : <Lock className="w-7 h-7 text-amber-400" />}
        </div>

        {/* Title & Description */}
        <div className="space-y-1">
          <h3 className="text-lg font-black text-white uppercase font-['Rajdhani'] tracking-wide">
            {isEnabling ? 'Activar Modo Mostrador' : 'Desactivar Modo Mostrador'}
          </h3>
          <p className="text-xs text-slate-300">
            {isEnabling
              ? 'Oculta automáticamente ganancias, costos mayoristas y configuración contable para atender clientes con total privacidad.'
              : 'Ingresa tu PIN Maestro de Propietario para desbloquear el panel completo y ver tus ganancias.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase block">
              PIN de Propietario (4 a 6 dígitos)
            </label>
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              maxLength={6}
              disabled={isVerifying}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full text-center text-2xl tracking-[0.5em] font-mono font-black py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-cyan-400"
              autoFocus
            />
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center justify-center gap-1.5 animate-shake">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-2 pt-1">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full py-2.5 rounded-xl font-bold text-xs justify-center shadow-lg"
              disabled={isVerifying || pinInput.length < 4}
            >
              {isVerifying ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Verificando con Servidor...
                </span>
              ) : isEnabling ? (
                'Confirmar y Activar Mostrador'
              ) : (
                'Desbloquear Ganancias'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
