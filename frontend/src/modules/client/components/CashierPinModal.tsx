import React, { useState, useEffect, useRef } from 'react';
import { useCashierStore } from '../../../store/useCashierStore';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, Lock, X, KeyRound } from 'lucide-react';
import { Button } from '../../../components/atoms/Button';

export const CashierPinModal: React.FC = () => {
  const {
    isPinModalOpen,
    pinModalPurpose,
    pendingRedirect,
    errorMessage,
    cashierPin,
    closePinModal,
    verifyAndExecutePin,
    setPin,
  } = useCashierStore();

  const navigate = useNavigate();
  const [pinInput, setPinInput] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isPinModalOpen) {
      setPinInput('');
      setNewPinInput('');
      setIsChangingPin(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isPinModalOpen]);

  if (!isPinModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isChangingPin) {
      if (newPinInput.length < 4) return;
      setPin(newPinInput);
      setIsChangingPin(false);
      verifyAndExecutePin(newPinInput, () => {
        if (pendingRedirect) navigate(pendingRedirect);
      });
      return;
    }

    const ok = verifyAndExecutePin(pinInput, () => {
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
            {isChangingPin
              ? 'Configurar Nuevo PIN'
              : isEnabling
              ? 'Activar Modo Mostrador / Cajero'
              : 'Desactivar Modo Mostrador'}
          </h3>
          <p className="text-xs text-slate-300">
            {isChangingPin
              ? 'Define un PIN de 4 dígitos para proteger la privacidad de tu negocio.'
              : isEnabling
              ? 'Oculta automáticamente ganancias, costos mayoristas y configuración de precios para que tu trabajador solo vea precios de venta al cliente.'
              : 'Ingresa tu PIN de 4 dígitos para volver a ver ganancias, costos y configuración contable.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isChangingPin ? (
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase block">
                Nuevo PIN (4 a 6 dígitos)
              </label>
              <input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="****"
                className="w-full text-center text-2xl tracking-[0.5em] font-mono font-black py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-cyan-300 focus:outline-none focus:border-cyan-400"
                autoFocus
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase block">
                Ingresa PIN de Seguridad {cashierPin === '1234' && <span className="text-amber-400">(Inicial: 1234)</span>}
              </label>
              <input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="****"
                className="w-full text-center text-2xl tracking-[0.5em] font-mono font-black py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
                autoFocus
              />
            </div>
          )}

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
              disabled={isChangingPin ? newPinInput.length < 4 : pinInput.length < 4}
            >
              {isChangingPin
                ? 'Guardar Nuevo PIN'
                : isEnabling
                ? 'Confirmar y Activar Modo Cajero'
                : 'Desbloquear y Ver Ganancias'}
            </Button>

            {!isChangingPin && (
              <button
                type="button"
                onClick={() => setIsChangingPin(true)}
                className="text-[11px] text-slate-400 hover:text-cyan-300 transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                <KeyRound className="w-3 h-3" />
                <span>¿Deseas cambiar tu PIN actual?</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
