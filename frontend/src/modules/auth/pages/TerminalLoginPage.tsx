import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { staffService, StoreOperator } from '../../../services/api/staff.service';
import { useAuthStore } from '../../../store/useAuthStore';
import { useUIStore } from '../../../store/useUIStore';
import { Store, User, Lock, Delete, ArrowRight, ShieldCheck, Gamepad2, ArrowLeft, RefreshCw } from 'lucide-react';

export const TerminalLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setTerminalSession } = useAuthStore();
  const { showToast } = useUIStore();

  const [storeSlug, setStoreSlug] = useState<string>(() => {
    return localStorage.getItem('recargas_last_store') || '';
  });
  const [storeName, setStoreName] = useState<string>('');
  const [operators, setOperators] = useState<StoreOperator[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<string>('');
  const [pin, setPin] = useState<string>('');

  const [isLoadingOperators, setIsLoadingOperators] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pinContainerRef = useRef<HTMLDivElement>(null);

  // Cargar operadores cuando cambia el local
  const loadOperators = async (slugToSearch: string) => {
    const clean = slugToSearch.trim().toLowerCase();
    if (!clean || clean.length < 2) {
      setOperators([]);
      setStoreName('');
      return;
    }

    try {
      setIsLoadingOperators(true);
      setErrorMessage(null);
      const res = await staffService.getStoreOperators(clean);
      setStoreName(res.storeName || clean);
      setOperators(res.operators || []);
      localStorage.setItem('recargas_last_store', clean);

      // Pre-seleccionar el primer cajero o el dueño
      if (res.operators && res.operators.length > 0) {
        // Si hay cajeros, preseleccionar el primer cajero; de lo contrario el dueño
        const firstCashier = res.operators.find((op) => !op.isMaster);
        setSelectedOperator(firstCashier ? firstCashier.name : res.operators[0].name);
      }
    } catch (err: any) {
      setOperators([]);
      setStoreName('');
      setErrorMessage(err.message || 'Local no encontrado. Verifica el nombre con el administrador.');
    } finally {
      setIsLoadingOperators(false);
    }
  };

  useEffect(() => {
    if (storeSlug) {
      loadOperators(storeSlug);
    }
  }, []);

  const handleStoreBlur = () => {
    if (storeSlug) {
      loadOperators(storeSlug);
    }
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      setErrorMessage(null);

      // Auto-submit si llega a 4 dígitos
      if (nextPin.length === 4) {
        submitLogin(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleClear = () => {
    setPin('');
    setErrorMessage(null);
  };

  // Escuchar teclado físico
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter') {
        if (pin.length >= 4) {
          submitLogin(pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, storeSlug, selectedOperator]);

  const submitLogin = async (pinToSubmit: string) => {
    if (!storeSlug.trim()) {
      setErrorMessage('Ingresa el nombre o identificador de tu local.');
      return;
    }
    if (!selectedOperator) {
      setErrorMessage('Selecciona o ingresa el nombre de tu usuario / cajero.');
      return;
    }
    if (pinToSubmit.length < 4) {
      setErrorMessage('El PIN debe tener al menos 4 dígitos.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await staffService.terminalLogin({
        storeSlug: storeSlug.trim(),
        operatorName: selectedOperator,
        pinCode: pinToSubmit,
      });

      // Guardar sesión en el store de auth
      setTerminalSession({
        user: {
          id: res.user.id,
          email: res.user.email,
          role: res.user.role,
          fullName: res.user.fullName,
        },
        token: res.token,
        operatorName: res.operatorName,
        isCashier: res.isCashier,
        storeSlug: res.storeSlug,
      });

      showToast(
        res.isCashier
          ? `¡Turno abierto para ${res.operatorName}! Modo Mostrador activado.`
          : `¡Bienvenido Dueño! Acceso completo habilitado.`,
        'success'
      );

      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'PIN incorrecto o usuario no autorizado.');
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 select-none">
      {/* Fondo Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-cyan-600/10 via-indigo-600/15 to-purple-600/10 blur-[130px] rounded-full" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Encabezado Superior */}
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/login"
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Acceso Estándar</span>
          </Link>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[10px] font-bold text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            TERMINAL POS V1
          </div>
        </div>

        {/* Tarjeta Principal del Terminal */}
        <div className="bg-[#0b111e]/95 border border-slate-800/90 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
          {/* Logo y Título */}
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-indigo-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-400 mb-3 shadow-glow-sm">
              <Gamepad2 className="w-8 h-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black font-['Rajdhani'] uppercase tracking-wider text-white">
              Terminal de Mostrador
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Ingreso rápido para dueños y cajeros por PIN
            </p>
          </div>

          {/* Formulario de Local y Operador */}
          <div className="space-y-3.5 mb-6">
            {/* Input Local */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Local / Comercio
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Store className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={storeSlug}
                  onChange={(e) => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  onBlur={handleStoreBlur}
                  onKeyDown={(e) => e.key === 'Enter' && handleStoreBlur()}
                  placeholder="Ej: ryuu, cyber-gamer, demo..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm font-bold focus:outline-hidden focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => loadOperators(storeSlug)}
                  disabled={isLoadingOperators}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-cyan-400"
                  title="Cargar cajeros de este local"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOperators ? 'animate-spin text-cyan-400' : ''}`} />
                </button>
              </div>
              {storeName && (
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{storeName}</span>
                </div>
              )}
            </div>

            {/* Selector de Operador */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Operador / Cajero
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>

                {operators.length > 0 ? (
                  <select
                    value={selectedOperator}
                    onChange={(e) => setSelectedOperator(e.target.value)}
                    className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white text-sm font-bold focus:outline-hidden focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all cursor-pointer capitalize"
                  >
                    {operators.map((op) => (
                      <option key={op.name} value={op.name} className="bg-slate-900 text-white py-1">
                        {op.name} {op.isMaster ? '★ (Dueño / Total)' : '(Cajero / Solo PVP)'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={selectedOperator}
                    onChange={(e) => setSelectedOperator(e.target.value)}
                    placeholder="genesis, Dueño / Admin..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm font-bold focus:outline-hidden focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Visor de PIN con Puntos Indicadores */}
          <div className="mb-5 text-center" ref={pinContainerRef}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Ingresa tu PIN de 4 dígitos
            </div>

            <div className="flex justify-center items-center gap-3.5 py-3 px-4 rounded-2xl bg-[#070b14] border border-slate-800">
              {[0, 1, 2, 3].map((idx) => {
                const filled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                      filled
                        ? 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] scale-110'
                        : 'bg-slate-800 border border-slate-700'
                    }`}
                  />
                );
              })}
            </div>

            {/* Mensaje de Error */}
            {errorMessage && (
              <div className="mt-2.5 p-2 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs font-bold animate-shake">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Teclado Numérico Táctil */}
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeyPress(digit)}
                disabled={isSubmitting}
                className="h-13 rounded-2xl bg-slate-900/80 hover:bg-slate-800 active:bg-cyan-500/20 active:border-cyan-400 border border-slate-800/80 text-xl font-black text-white transition-all shadow-xs flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {digit}
              </button>
            ))}

            <button
              type="button"
              onClick={handleClear}
              disabled={isSubmitting || pin.length === 0}
              className="h-13 rounded-2xl bg-slate-900/40 hover:bg-slate-800 active:bg-slate-700 border border-slate-800/80 text-xs font-bold text-slate-400 hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-30"
            >
              Borrar Todo
            </button>

            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              disabled={isSubmitting}
              className="h-13 rounded-2xl bg-slate-900/80 hover:bg-slate-800 active:bg-cyan-500/20 active:border-cyan-400 border border-slate-800/80 text-xl font-black text-white transition-all shadow-xs flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-50"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting || pin.length === 0}
              className="h-13 rounded-2xl bg-slate-900/40 hover:bg-slate-800 active:bg-slate-700 border border-slate-800/80 text-slate-400 hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-30"
              aria-label="Borrar último dígito"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Botón de Entrada Manual si tiene 4 dígitos */}
          <button
            type="button"
            onClick={() => submitLogin(pin)}
            disabled={isSubmitting || pin.length < 4}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:opacity-95 active:scale-98 text-white font-black text-sm uppercase tracking-wider transition-all shadow-glow-primary flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Iniciar Turno de Mostrador</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Info y Reglas de Seguridad */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Los cajeros solo visualizan precio venta al público. Tus ganancias y saldo permanecen 100% blindados.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};
