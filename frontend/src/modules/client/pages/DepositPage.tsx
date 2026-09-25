import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Upload,
  CheckCircle2,
  Building2,
  ShieldCheck,
  Clock,
  Copy,
  Check,
  XCircle,
  Image as ImageIcon,
  Sparkles,
  Camera,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import { useUIStore } from '../../../store/useUIStore';
import { useWalletStore } from '../../../store/useWalletStore';
import { resellerService } from '../../../services/api/reseller.service';
import { PaymentMethod, DepositRequest } from '../../../types';
import { compressVoucherImage } from '../../../utils/imageCompressor';
import { captureVoucherPhoto } from '../../../utils/nativeCamera';

export const DepositPage: React.FC = () => {
  const navigate = useNavigate();
  const { wallet } = useWalletStore();
  const { showToast } = useUIStore();

  const [activeTab, setActiveTab] = useState<'report' | 'history'>('report');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [selectedBank, setSelectedBank] = useState('');
  const [amount, setAmount] = useState('10.00');
  const [reference, setReference] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Compresión de imagen WebP
  const [voucherDataUrl, setVoucherDataUrl] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSizeKb: number;
    compressedSizeKb: number;
    ratio: string;
  } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [depositHistory, setDepositHistory] = useState<DepositRequest[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  // Cargar métodos de pago al montar
  useEffect(() => {
    async function loadMethods() {
      try {
        const methods = await resellerService.getPaymentMethods();
        setPaymentMethods(methods);
        if (methods.length > 0) {
          setSelectedMethodId(methods[0].id);
          setSelectedBank(methods[0].bank_name);
        }
      } catch (err) {
        console.error('Error cargando métodos de pago:', err);
      }
    }
    loadMethods();
  }, []);

  // Cargar historial de depósitos
  const loadDeposits = async () => {
    setIsLoadingHistory(true);
    try {
      const deposits = await resellerService.getMyDeposits();
      setDepositHistory(deposits);
    } catch (err) {
      console.error('Error cargando historial de depósitos:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadDeposits();
    }
  }, [activeTab]);

  const handleCopyAccount = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Número de cuenta copiado al portapapeles', 'info');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      setIsCompressing(true);

      try {
        const result = await compressVoucherImage(file);
        setVoucherDataUrl(result.dataUrl);
        setCompressionInfo({
          originalSizeKb: Math.round(result.originalSizeBytes / 1024),
          compressedSizeKb: Math.round(result.compressedSizeBytes / 1024),
          ratio: result.compressionRatio,
        });
        showToast(`Imagen optimizada a WebP (${result.compressionRatio} menos de peso)`, 'success');
      } catch (err: any) {
        showToast(err.message || 'Error al procesar la imagen.', 'error');
        setFileName(null);
        setVoucherDataUrl(null);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleCapturePhoto = async () => {
    setIsCompressing(true);
    try {
      const result = await captureVoucherPhoto();
      if (!result) {
        setIsCompressing(false);
        return;
      }

      if (result.blob) {
        const compressed = await compressVoucherImage(
          new File([result.blob], 'comprobante_camara.jpg', { type: result.blob.type || 'image/jpeg' })
        );
        setVoucherDataUrl(compressed.dataUrl);
        setFileName('comprobante_camara.webp');
        setCompressionInfo({
          originalSizeKb: Math.round(compressed.originalSizeBytes / 1024),
          compressedSizeKb: Math.round(compressed.compressedSizeBytes / 1024),
          ratio: compressed.compressionRatio,
        });
        showToast(`Comprobante capturado y optimizado (${compressed.compressionRatio} reducción)`, 'success');
      } else if (result.dataUrl) {
        setVoucherDataUrl(result.dataUrl);
        setFileName('comprobante_camara.jpg');
        showToast('Comprobante capturado exitosamente.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Error al capturar imagen con la cámara.', 'error');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBank) {
      showToast('Por favor selecciona la cuenta a la que transferiste.', 'error');
      return;
    }
    if (!reference.trim()) {
      showToast('Ingresa el número de referencia o comprobante.', 'error');
      return;
    }
    if (!voucherDataUrl) {
      showToast('Debes adjuntar la foto o comprobante del depósito.', 'error');
      return;
    }

    const numAmount = parseFloat((amount || '0').replace(/,/g, '.').trim());
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('Ingresa un monto válido mayor a $0.00 USD.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await resellerService.submitDeposit({
        paymentMethodId: selectedMethodId || undefined,
        bankName: selectedBank,
        amount: numAmount,
        referenceNumber: reference.trim(),
        voucherUrl: voucherDataUrl,
      });

      showToast('¡Comprobante enviado! El administrador lo validará y acreditará tu saldo.', 'success');
      setReference('');
      setFileName(null);
      setVoucherDataUrl(null);
      setCompressionInfo(null);
      setActiveTab('history');
      loadDeposits();
    } catch (err: any) {
      showToast(err.message || 'Error al registrar el comprobante.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-full overflow-x-hidden">
      {/* ========================================================================= */}
      {/* VISTA MÓVIL (md:hidden): Cargar Saldo Estilo Proveedor (Imagen 3)          */}
      {/* ========================================================================= */}
      <div className="md:hidden space-y-4">
        {/* Cabecera Móvil */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-base font-extrabold text-white">Cargar saldo</h2>
          </div>
          <div className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-black text-xs">
            $ {(wallet.available_balance_cents / 100).toFixed(2)}
          </div>
        </div>

        {/* Pestañas Móviles */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
          <button
            onClick={() => setActiveTab('report')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'report'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 bg-slate-900/60 border border-slate-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Cargar Saldo
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 bg-slate-900/60 border border-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Historial ({depositHistory.length})
          </button>
        </div>

        {activeTab === 'report' ? (
          <div className="bg-white text-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-sm border border-slate-200">
            {/* Input de Monto & Píldoras Rápidas (Imagen 3) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600">
                ¿Cuánto quieres cargar? ($)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/,/g, '.'))}
                onBlur={() => {
                  const num = parseFloat((amount || '0').replace(/,/g, '.'));
                  if (!isNaN(num) && num > 0) setAmount(num.toFixed(2));
                }}
                placeholder="100.00"
                className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 font-extrabold text-lg focus:outline-none focus:border-indigo-500 shadow-2xs font-mono"
              />

              {/* 4 Píldoras de Monto Rápido */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {['50', '100', '300', '500'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                      amount === val
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs font-extrabold'
                        : 'border-slate-200 text-slate-700 bg-white hover:border-slate-300'
                    }`}
                  >
                    $ {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Selector de Método de Pago Radio Cards */}
            <div className="space-y-2.5 pt-2">
              <label className="block text-xs font-bold text-slate-600">
                ¿Cómo vas a pagar?
              </label>

              <div className="space-y-2.5">
                {paymentMethods.map((acc) => {
                  const isSelected = selectedBank === acc.bank_name;
                  const isBinance = acc.bank_name.toLowerCase().includes('binance');
                  const isUsdt = acc.bank_name.toLowerCase().includes('usdt');

                  return (
                    <div
                      key={acc.id}
                      onClick={() => {
                        setSelectedBank(acc.bank_name);
                        setSelectedMethodId(acc.id);
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-500 bg-[#f0edff] ring-2 ring-indigo-500/80 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 block">{acc.bank_name}</span>
                            <span className="text-[10px] text-slate-500 block">
                              {isBinance ? 'Solo por Binance Pay' : isUsdt ? 'Solo red BEP-20' : acc.account_type}
                            </span>
                          </div>
                        </div>

                        {isBinance ? (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 text-[10px] font-bold border border-cyan-200">
                            Sin comisión
                          </span>
                        ) : isUsdt ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            Al toque
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                            {acc.account_type}
                          </span>
                        )}
                      </div>

                      {/* Detalles del método seleccionado */}
                      {isSelected && (
                        <div
                          className="mt-3 pt-3 border-t border-indigo-200/60 space-y-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="p-2.5 rounded-xl bg-white border border-indigo-100 flex items-center justify-between">
                            <div className="min-w-0">
                              <span className="text-[9px] text-slate-400 block uppercase font-bold">
                                Número de Cuenta / Pay ID
                              </span>
                              <span className="text-xs font-mono font-bold text-indigo-900 truncate block">
                                {acc.account_number}
                              </span>
                              <span className="text-[10px] text-slate-500 block">
                                Titular: {acc.account_holder}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyAccount(acc.id, acc.account_number)}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center gap-1 shrink-0"
                            >
                              {copiedId === acc.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedId === acc.id ? 'Copiado' : 'Copiar'}</span>
                            </button>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-600 font-bold block mb-1">
                              Número de Referencia / Comprobante
                            </span>
                            <input
                              type="text"
                              value={reference}
                              onChange={(e) => setReference(e.target.value)}
                              placeholder="Ej: 0048129482 o Order ID"
                              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div className="space-y-2">
                            <span className="text-[10px] text-slate-600 font-bold block">
                              Comprobante de Pago (Foto)
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              <label className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer hover:bg-slate-50 active:scale-95 transition-all text-center">
                                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                                <span>{fileName ? 'Cambiar Foto' : 'Galería'}</span>
                                <input
                                  type="file"
                                  accept="image/png, image/jpeg, image/webp"
                                  onChange={handleFileChange}
                                  className="hidden"
                                />
                              </label>

                              <button
                                type="button"
                                onClick={handleCapturePhoto}
                                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold active:scale-95 transition-all"
                              >
                                <Camera className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Tomar Foto</span>
                              </button>
                            </div>

                            {voucherDataUrl && (
                              <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                                <img
                                  src={voucherDataUrl}
                                  alt="Voucher"
                                  className="w-10 h-10 object-cover rounded-lg border border-emerald-300"
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="text-[11px] font-bold text-emerald-900 block truncate">
                                    {fileName || 'Comprobante listo'}
                                  </span>
                                  <span className="text-[10px] text-emerald-700">✓ Listo para validar</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Botón de Acción Móvil */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isCompressing}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#6d5dfc] hover:bg-[#5c4ce3] disabled:opacity-50 text-white font-bold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 mt-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Enviando Comprobante...'
                  : selectedBank
                  ? `Continuar con ${selectedBank}`
                  : 'Continuar'}
              </span>
            </button>
          </div>
        ) : (
          /* Historial de depósitos en tarjetas táctiles (Móvil) */
          <div className="space-y-3">
            {isLoadingHistory ? (
              <div className="p-8 text-center text-xs text-slate-400">Cargando solicitudes...</div>
            ) : depositHistory.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl text-xs text-slate-400">
                Aún no has reportado depósitos.
              </div>
            ) : (
              depositHistory.map((item) => {
                const dateStr = new Date(item.created_at).toLocaleString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div key={item.id} className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{item.bank_name}</span>
                      <span className="text-emerald-400 font-bold font-mono text-sm">
                        ${(item.amount_cents / 100).toFixed(2)} {item.currency}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Ref: <span className="font-mono text-slate-200">{item.reference_number}</span></span>
                      <span>{dateStr}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <div>
                        {item.status === 'pending' && (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                            En Revisión
                          </span>
                        )}
                        {item.status === 'approved' && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            Acreditado
                          </span>
                        )}
                        {item.status === 'rejected' && (
                          <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                            Rechazado
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setPreviewModalUrl(item.voucher_compressed_url || item.voucher_url)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-cyan-300 text-[10px] font-bold flex items-center gap-1"
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>Ver Voucher</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VISTA ESCRITORIO (hidden md:block): Vista B2B Original Intacta            */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-white font-['Rajdhani'] uppercase tracking-wide flex items-center gap-2">
            Billetera y Recargas de Saldo <CreditCard className="w-5 h-5 text-emerald-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Reporta tus depósitos bancarios o transferencias cripto para acreditar saldo a tu cuenta de revendedor con verificación en tiempo récord.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('report')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'report'
                ? 'bg-indigo-600 text-white shadow-glow-primary'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Reportar Depósito / Transferencia
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-glow-primary'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Historial de Solicitudes ({depositHistory.length})
          </button>
        </div>

      {activeTab === 'report' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Cuentas Autorizadas (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Cuentas Autorizadas
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">Toca para seleccionar</span>
            </div>

            <div className="space-y-3">
              {paymentMethods.map((acc) => {
                const isSelected = selectedBank === acc.bank_name;
                const isCopied = copiedId === acc.id;

                return (
                  <div
                    key={acc.id}
                    onClick={() => {
                      setSelectedBank(acc.bank_name);
                      setSelectedMethodId(acc.id);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'border-cyan-400 bg-indigo-950/40 shadow-glow-primary ring-1 ring-cyan-500/30'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white font-['Rajdhani'] tracking-wide flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        {acc.bank_name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                        {acc.account_type}
                      </span>
                    </div>

                    <div className="mt-2.5 p-2.5 rounded-xl bg-black/50 border border-slate-800/80 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400">Número de Cuenta / Pay ID</span>
                        <span className="text-xs font-mono text-cyan-300 font-bold tracking-wider">
                          {acc.account_number}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyAccount(acc.id, acc.account_number);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition-colors flex items-center gap-1 text-[10px] font-bold"
                        title="Copiar cuenta"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {isCopied ? '¡Copiado!' : 'Copiar'}
                      </button>
                    </div>

                    <span className="text-[11px] text-slate-400 block mt-2">
                      Titular: <strong className="text-slate-200">{acc.account_holder}</strong>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Enviar Comprobante (7 cols) */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-7 glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800 space-y-5"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Enviar Comprobante de Pago
              </h3>
            </div>

            {/* Selector de cuenta */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                ¿A qué cuenta realizaste el pago?
              </label>
              <select
                value={selectedBank}
                onChange={(e) => {
                  setSelectedBank(e.target.value);
                  const matched = paymentMethods.find((m) => m.bank_name === e.target.value);
                  if (matched) setSelectedMethodId(matched.id);
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                required
              >
                <option value="">-- Selecciona el banco o billetera --</option>
                {paymentMethods.map((acc) => (
                  <option key={acc.id} value={acc.bank_name}>
                    {acc.bank_name} ({acc.account_number}) - {acc.account_holder}
                  </option>
                ))}
              </select>
            </div>

            {/* Monto deseado */}
            <div>
              <Input
                label="Monto depositado ($ USD)"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/,/g, '.'))}
                onBlur={() => {
                  const num = parseFloat((amount || '0').replace(/,/g, '.'));
                  if (!isNaN(num) && num > 0) setAmount(num.toFixed(2));
                }}
                placeholder="Ej: 50.00"
                helperText="Se acreditará exactamente este valor a tu saldo tras validar el comprobante."
                required
              />
            </div>

            {/* Número de referencia */}
            <div>
              <Input
                label="Número de Referencia / Transacción Bancaria"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ej: 0048129482, Binance Pay Order ID, etc."
                helperText="Identificador único del recibo. El sistema evita registros duplicados de comprobantes."
                required
              />
            </div>

            {/* Subida y Compresión de Voucher */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Foto o Captura del Comprobante (Voucher)
              </label>

              <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-2xl p-5 text-center bg-slate-900/40 cursor-pointer transition-colors block relative group">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <Upload className="w-6 h-6 text-cyan-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-white block">
                  {fileName ? fileName : 'Toca para seleccionar o arrastrar la foto del comprobante'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Formatos JPG, PNG o capturas de pantalla de tu banca móvil
                </span>

                {isCompressing && (
                  <div className="mt-2 text-xs text-indigo-400 animate-pulse font-medium">
                    ⚡ Optimizando y comprimiendo a WebP ultraligero...
                  </div>
                )}
              </label>

              {/* Botón de Captura Rápida con Cámara / Galería */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCapturePhoto}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600/30 to-indigo-600/30 hover:from-cyan-600/50 hover:to-indigo-600/50 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all shadow-sm active:scale-98"
                >
                  <Camera className="w-4 h-4 text-cyan-400" />
                  <span>Tomar Foto con Cámara o Galería</span>
                </button>
              </div>

              {/* Estadísticas de compresión WebP */}
              {compressionInfo && (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Original: {compressionInfo.originalSizeKb} KB ➔ <strong>WebP: {compressionInfo.compressedSizeKb} KB</strong>
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                    Ahorro: {compressionInfo.ratio}
                  </span>
                </div>
              )}

              {/* Vista previa miniatura */}
              {voucherDataUrl && (
                <div className="relative mt-2 p-2 rounded-xl bg-black/40 border border-slate-800 flex items-center gap-3">
                  <img
                    src={voucherDataUrl}
                    alt="Voucher Preview"
                    className="w-14 h-14 object-cover rounded-lg border border-slate-700"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-white block truncate">{fileName}</span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Listo para envío seguro
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewModalUrl(voucherDataUrl)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium"
                  >
                    Ver Zoom
                  </button>
                </div>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center py-3 text-sm font-bold shadow-glow-primary"
              disabled={isSubmitting || isCompressing}
            >
              {isSubmitting ? (
                'Enviando Comprobante...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Enviar Comprobante para Acreditación
                </>
              )}
            </Button>
          </form>
        </div>
      ) : (
        /* Tab: Historial de Solicitudes */
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" /> Historial de Depósitos Registrados
            </h3>
            <button
              onClick={loadDeposits}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Actualizar
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="p-8 text-center text-xs text-slate-400">Cargando solicitudes...</div>
          ) : depositHistory.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl">
              <CreditCard className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">Aún no has reportado ningún depósito.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Usa la pestaña "Reportar Depósito" para subir tu primer voucher.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Banco / Medio</th>
                    <th className="py-3 px-4">Referencia</th>
                    <th className="py-3 px-4">Monto</th>
                    <th className="py-3 px-4">Comprobante</th>
                    <th className="py-3 px-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {depositHistory.map((item) => {
                    const dateFormatted = new Date(item.created_at).toLocaleString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{dateFormatted}</td>
                        <td className="py-3 px-4 font-bold text-white">{item.bank_name}</td>
                        <td className="py-3 px-4 font-mono text-cyan-300">{item.reference_number}</td>
                        <td className="py-3 px-4 font-bold text-emerald-400">
                          ${(item.amount_cents / 100).toFixed(2)} {item.currency}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => setPreviewModalUrl(item.voucher_compressed_url || item.voucher_url)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 inline-flex items-center gap-1 text-[11px]"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                            Ver
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          {item.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              <Clock className="w-3 h-3" /> En Revisión
                            </span>
                          )}
                          {item.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> Acreditado
                            </span>
                          )}
                          {item.status === 'rejected' && (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                <XCircle className="w-3 h-3" /> Rechazado
                              </span>
                              {item.rejection_reason && (
                                <span className="text-[10px] text-rose-400/80 mt-1 max-w-xs truncate">
                                  {item.rejection_reason}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      </div>

      {/* Modal de Zoom de Comprobante */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div
            className="max-w-3xl w-full bg-slate-900 border border-slate-700 rounded-3xl p-5 overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white uppercase font-['Rajdhani'] flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" /> Inspección de Comprobante
              </h4>
              <button
                onClick={() => setPreviewModalUrl(null)}
                className="text-xs px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 max-h-[75vh] overflow-auto flex items-center justify-center rounded-2xl bg-black/60 p-2">
              <img
                src={previewModalUrl}
                alt="Comprobante Alta Resolución"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
