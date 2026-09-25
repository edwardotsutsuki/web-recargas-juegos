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
          ? 'border-2 border-amber-400/90 bg-slate-900/90 hover:bg-slate-850 hover:border-amber-400 shadow-sm shadow-amber-500/10 hover:shadow-amber-500/20'
          : 'border border-slate-800/80 bg-slate-900/60 hover:bg-slate-850 hover:border-indigo-500/50 hover:shadow-glow-primary'
      }`}
    >
      {/* Izquierda: Imagen del juego + Títulos */}
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 bg-slate-950 border border-slate-800/80">
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
            <h4 className="font-extrabold text-sm text-slate-100 group-hover:text-cyan-300 transition-colors truncate">
              {game.name}
            </h4>

            {isFeatured && (
              <span className="inline-flex items-center text-amber-400 shrink-0" title="Juego Más Popular">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              </span>
            )}

            {isManual && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                Manual
              </span>
            )}

            {game.category === 'gift_card' && !isManual && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shrink-0">
                Código
              </span>
            )}

            {game.can_verify_player && !isManual && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shrink-0">
                ID Verif.
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 truncate mt-0.5 group-hover:text-slate-300 transition-colors">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Derecha: Precio Desde + Chevron */}
      <div className="flex items-center gap-2 shrink-0 ml-1">
        <div className="text-right hidden sm:block">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block leading-none">
            Desde
          </span>
          <span className="text-xs font-black text-cyan-400">
            $ {(game.min_price_cents / 100).toFixed(2)}
          </span>
        </div>

        <div className="w-6 h-6 rounded-full flex items-center justify-center text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all">
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </div>
      </div>
    </div>
  );
};

