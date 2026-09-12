import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, X, Flame } from 'lucide-react';
import { resellerService } from '../../services/api/reseller.service';
import { Promotion } from '../../types';

export const PromotionsBanner: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function loadPromos() {
      try {
        const list = await resellerService.getPromotions();
        const activeTop = list.filter((p: Promotion) => p.is_active && (p.placement === 'top_banner' || !p.placement));
        setPromotions(activeTop);
      } catch (err) {
        console.error('Error cargando promociones:', err);
      }
    }
    loadPromos();
  }, []);

  if (dismissed || promotions.length === 0) return null;

  const current = promotions[currentIndex % promotions.length];

  return (
    <div className="bg-gradient-to-r from-indigo-950 via-purple-950 to-indigo-950 border-b border-indigo-500/30 text-white px-4 py-2 relative z-30 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-pink-500 text-white font-black text-[10px] tracking-wider uppercase flex items-center gap-1 shrink-0 shadow-sm">
            <Flame className="w-3 h-3 text-yellow-200 animate-pulse" />
            {current.badge_text || 'PROMO'}
          </span>

          <div className="flex items-center gap-2 truncate">
            <strong className="text-white shrink-0">{current.title}</strong>
            <span className="text-slate-300 hidden md:inline truncate">{current.message}</span>
          </div>

          {current.action_url && (
            <Link
              to={current.action_url}
              className="text-cyan-300 hover:text-cyan-200 font-bold underline decoration-cyan-400/60 flex items-center gap-1 shrink-0 text-[11px] ml-1 transition-colors"
            >
              <span>{current.action_label || 'Ver más'}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {promotions.length > 1 && (
            <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 font-mono">
              <button
                onClick={() => setCurrentIndex((prev) => (prev - 1 + promotions.length) % promotions.length)}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700"
              >
                ◀
              </button>
              <span>
                {currentIndex + 1}/{promotions.length}
              </span>
              <button
                onClick={() => setCurrentIndex((prev) => (prev + 1) % promotions.length)}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700"
              >
                ▶
              </button>
            </div>
          )}

          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Cerrar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
