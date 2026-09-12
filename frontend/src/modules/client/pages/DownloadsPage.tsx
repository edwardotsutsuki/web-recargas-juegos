import React, { useEffect, useState } from 'react';
import { Download, FileText, Image, BookOpen, Layers, Sparkles, Smartphone, QrCode } from 'lucide-react';
import { Button } from '../../../components/atoms/Button';
import { apiClient } from '../../../services/api/client';
import { PromotionalMaterial } from '../../../types';
import { AppDownloadModal } from '../../../components/molecules/AppDownloadModal';

export const DownloadsPage: React.FC = () => {
  const [materials, setMaterials] = useState<PromotionalMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        setIsLoading(true);
        const data = await apiClient<PromotionalMaterial[]>('/promotional-materials');
        if (Array.isArray(data) && data.length > 0) {
          setMaterials(data);
        }
      } catch (err) {
        console.error('Error cargando materiales promocionales:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMaterials();
  }, []);

  const filteredMaterials = selectedCategory === 'all'
    ? materials
    : materials.filter((m) => m.category === selectedCategory);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'banner':
      case 'story':
        return <Image className="w-6 h-6" />;
      case 'guide':
        return <BookOpen className="w-6 h-6" />;
      case 'pricing_template':
        return <FileText className="w-6 h-6" />;
      default:
        return <Layers className="w-6 h-6" />;
    }
  };

  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'banner':
      case 'story':
        return { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' };
      case 'guide':
        return { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' };
      case 'pricing_template':
        return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' };
      default:
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Card: App Oficial Android (APK) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/70 via-slate-900 to-cyan-950/40 border border-cyan-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold uppercase tracking-wider">
              <Smartphone className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> App Oficial para Socios Android
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-['Rajdhani'] uppercase tracking-wide">
              Descarga la App de <span className="text-cyan-400">Recargas Juegos Online</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Vende recargas a toda velocidad, sube comprobantes de banco tomándoles foto directa con tu cámara y recibe alertas sonoras instantáneas cada vez que se apruebe tu saldo.
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
              <Button
                onClick={() => setIsAppModalOpen(true)}
                className="py-3 px-6 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Descargar APK Android (v1.0.0)
              </Button>
              <button
                onClick={() => setIsAppModalOpen(true)}
                className="px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-colors flex items-center gap-2"
              >
                <QrCode className="w-4 h-4 text-cyan-400" /> Ver Código QR
              </button>
            </div>
          </div>

          <div className="shrink-0 p-3 bg-slate-950/80 rounded-2xl border border-cyan-500/30 text-center shadow-xl">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                window.location.origin + '/downloads/recargas-juegos.apk'
              )}&color=00e5ff&bgcolor=0b0e14`}
              alt="QR Descarga APK"
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-lg object-contain mx-auto"
            />
            <span className="text-[10px] text-cyan-400 font-bold block mt-2">
              Escanear para instalar
            </span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white font-['Rajdhani'] uppercase tracking-wide flex items-center gap-2">
            Material Promocional & Recursos <Download className="w-5 h-5 text-emerald-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Recursos gráficos oficiales, banners en alta definición y plantillas para potenciar tus ventas como revendedor.
          </p>
        </div>

        {/* Categories Tab Filter */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-x-auto">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'banner', label: 'Banners' },
            { id: 'guide', label: 'Guías' },
            { id: 'pricing_template', label: 'Precios PVP' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === tab.id
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Materials */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-panel p-6 rounded-3xl border border-slate-800 animate-pulse h-60" />
          ))}
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center space-y-3">
          <Sparkles className="w-8 h-8 text-cyan-400 mx-auto" />
          <h3 className="text-base font-bold text-white">No hay recursos en esta categoría</h3>
          <p className="text-xs text-slate-400">
            Nuevos materiales se publican frecuentemente para apoyar tus ventas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredMaterials.map((item) => {
            const theme = getCategoryTheme(item.category);
            return (
              <div
                key={item.id}
                className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 flex flex-col justify-between hover:border-slate-700 transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-2xl ${theme.bg} ${theme.text} w-fit border ${theme.border}`}>
                      {getCategoryIcon(item.category)}
                    </div>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                      {item.format} • {item.file_size_mb} MB
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <a
                  href={item.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full"
                >
                  <Button variant="outline" size="sm" className="w-full justify-center group-hover:border-cyan-500/50">
                    <Download className="w-3.5 h-3.5 mr-2 text-cyan-400" />
                    Descargar Recurso ({item.format})
                  </Button>
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de descarga de la App Android */}
      <AppDownloadModal isOpen={isAppModalOpen} onClose={() => setIsAppModalOpen(false)} />
    </div>
  );
};
