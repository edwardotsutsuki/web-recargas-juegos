import React, { useState } from 'react';
import { Smartphone, Download, CheckCircle2, ShieldCheck, Camera, Bell, Zap, X, QrCode } from 'lucide-react';
import { Button } from '../atoms/Button';

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({ isOpen, onClose }) => {
  const [downloadStarted, setDownloadStarted] = useState(false);

  if (!isOpen) return null;

  const apkUrl = '/downloads/recargas-juegos.apk';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    window.location.origin + apkUrl
  )}&color=00e5ff&bgcolor=0b0e14`;

  const handleDownload = () => {
    setDownloadStarted(true);
    const link = document.createElement('a');
    link.href = apkUrl;
    link.download = 'RecargasJuegos-v1.0.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900/95 border border-cyan-500/30 shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Glow de fondo */}
        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />

        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 shrink-0">
            <Smartphone className="w-6 h-6 text-slate-950 font-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white font-['Rajdhani'] uppercase tracking-wide">
                App Oficial Android (APK)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 uppercase">
                v1.0.0
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Instalación directa para socios revendedores y clientes.
            </p>
          </div>
        </div>

        {/* Contenido Central: QR + Botón de Descarga */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5 items-center p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
          <div className="flex flex-col items-center justify-center text-center p-2">
            <div className="p-2 rounded-xl bg-slate-900 border border-cyan-500/30 shadow-inner inline-block">
              <img
                src={qrUrl}
                alt="QR Descarga APK"
                className="w-32 h-32 rounded-lg object-contain"
              />
            </div>
            <span className="text-[10px] text-cyan-400 font-semibold mt-2 flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5" /> Escanea con la cámara de tu móvil
            </span>
          </div>

          <div className="flex flex-col justify-center space-y-3">
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Cero costo, descarga directa</span>
              </div>
              <div className="flex items-center gap-2 text-cyan-300 font-medium">
                <Camera className="w-4 h-4 shrink-0" />
                <span>Foto directa a tus comprobantes</span>
              </div>
              <div className="flex items-center gap-2 text-amber-300 font-medium">
                <Bell className="w-4 h-4 shrink-0" />
                <span>Alertas sonoras de saldo acreditado</span>
              </div>
              <div className="flex items-center gap-2 text-indigo-300 font-medium">
                <Zap className="w-4 h-4 shrink-0" />
                <span>Carga ultra-rápida sin navegador</span>
              </div>
            </div>

            <Button
              onClick={handleDownload}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {downloadStarted ? '¡Descargando APK...!' : 'Descargar APK Android'}
            </Button>
          </div>
        </div>

        {/* Instrucciones de instalación en 3 pasos */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Guía rápida de instalación en tu teléfono:
          </span>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-slate-300">
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <strong className="block text-cyan-400 font-bold mb-1">1. Descargar</strong>
              Toca el botón o escanea el QR desde tu celular.
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <strong className="block text-indigo-400 font-bold mb-1">2. Permitir</strong>
              Habilita &quot;Permitir instalar desde esta fuente&quot;.
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <strong className="block text-emerald-400 font-bold mb-1">3. ¡Listo!</strong>
              Abre la app y entra con tus credenciales de socio.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

