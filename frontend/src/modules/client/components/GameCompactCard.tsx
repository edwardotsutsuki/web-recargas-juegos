import React from 'react';
import { GameSummary } from '../../../types';
import { ChevronRight, Star } from 'lucide-react';

interface GameCompactCardProps {
  game: GameSummary;
  onSelect: (game: GameSummary) => void;
}

export const GameCompactCard: React.FC<GameCompactCardProps> = ({ game, onSelect }) => {
  const isFeatured = Boolean(game.is_featured || game.id === 'ff' || game.id === 'rb');
  const isManual = game.category === 'manual_topup';

  const subtitle =
    game.subtitle ||
    (isManual
      ? 'Recarga Manual · Soporte'
      : game.category === 'gift_card'
      ? 'Gift Card · Código Digital'
      : game.can_verify_player
      ? 'Diamantes · Solo ID'
      : 'Recarga Directa con ID');

  return (
    <div
      onClick={() => onSelect(game)}
      className={`group relative cursor-pointer rounded-2xl p-2.5 sm:p-3 flex items-center justify-between transition-all duration-200 active:scale-[0.98] ${
        isFeatured
          ? 'border-2 border-amber-400 bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-850 shadow-sm shadow-amber-500/10 hover:shadow-amber-500/20'
          : 'border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-indigo-500/50 hover:shadow-md dark:hover:shadow-glow-primary'
      }`}
    >
      {/* Izquierda: Imagen del juego + Títulos */}
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 shadow-xs">
          <img
            src={game.image_url}
            alt={game.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-cyan-300 transition-colors truncate tracking-tight">
              {game.name}
            </h4>

            {isFeatured && (
              <span className="inline-flex items-center text-amber-500 shrink-0" title="Juego Más Popular">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
              </span>
            )}

            {isManual && (
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 shrink-0 uppercase tracking-wider">
                Manual
              </span>
            )}

            {game.category === 'gift_card' && !isManual && (
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-indigo-100 dark:bg-cyan-500/10 text-indigo-800 dark:text-cyan-300 border border-indigo-200 dark:border-cyan-500/20 shrink-0 uppercase tracking-wider">
                Código
              </span>
            )}

            {game.can_verify_player && !isManual && (
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/20 shrink-0 uppercase tracking-wider">
                ID Verif.
              </span>
            )}
          </div>

          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate mt-0.5 transition-colors">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Derecha: Botón Recargar + Chevron (Sin precios "Desde" mayoristas) */}
      <div className="flex items-center gap-2 shrink-0 ml-1">
        <span className="hidden sm:inline-flex items-center text-xs font-bold text-indigo-600 dark:text-cyan-400 group-hover:translate-x-0.5 transition-transform">
          Recargar
        </span>
        <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-cyan-400 group-hover:border-indigo-400 dark:group-hover:border-cyan-500/40 group-hover:translate-x-0.5 transition-all shadow-xs">
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </div>
      </div>
    </div>
  );
};

