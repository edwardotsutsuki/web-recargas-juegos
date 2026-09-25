import React from 'react';
import { GameSummary } from '../../../types';
import { Badge } from '../../../components/atoms/Badge';
import { PriceDisplay } from '../../../components/molecules/PriceDisplay';
import { ShieldCheck, Zap, Sparkles, Layers } from 'lucide-react';

interface GameCardProps {
  game: GameSummary;
  onSelect: (game: GameSummary) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onSelect }) => {
  return (
    <div
      onClick={() => onSelect(game)}
      className="group relative cursor-pointer glass-panel rounded-2xl overflow-hidden border border-slate-800/80 hover:border-indigo-500/50 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1.5 hover:shadow-glow-primary"
    >
      {/* Cover Image & Badges */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-900">
        <img
          src={game.image_url}
          alt={game.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />
        {/* Subtle dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-[#0b0f19]/30 to-black/40" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1.5">
          <Badge
            variant={game.category === 'direct_topup' ? 'primary' : 'warning'}
            size="sm"
            className="backdrop-blur-md"
          >
            {game.category_label}
          </Badge>

          {game.category === 'manual_topup' ? (
            <span className="inline-flex items-center gap-1 bg-amber-950/90 border border-amber-500/50 px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-300 backdrop-blur-md">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Recarga Manual
            </span>
          ) : game.can_verify_player ? (
            <span className="inline-flex items-center gap-1 bg-emerald-950/90 border border-emerald-500/50 px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-300 backdrop-blur-md">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              ID Verificable
            </span>
          ) : !game.requires_player_id ? (
            <span className="inline-flex items-center gap-1 bg-indigo-950/90 border border-indigo-500/50 px-2 py-0.5 rounded-full text-[10px] font-bold text-indigo-300 backdrop-blur-md">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Pin Instantáneo
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-slate-900/90 border border-slate-700/60 px-2 py-0.5 rounded-full text-[10px] font-semibold text-slate-300 backdrop-blur-md">
              ID Requerido
            </span>
          )}
        </div>

        {/* Bottom stats inside cover */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-slate-300">
          <span className="inline-flex items-center gap-1 text-slate-300 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-md text-[10px]">
            <Layers className="w-3 h-3 text-cyan-400" />
            {game.packages_count} {game.packages_count === 1 ? 'opción' : 'opciones'}
          </span>
        </div>
      </div>

      {/* Content Info */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="text-base font-black text-white font-['Rajdhani'] uppercase tracking-wide group-hover:text-cyan-300 transition-colors line-clamp-1">
            {game.name}
          </h3>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {game.description}
          </p>
        </div>

        {/* Pricing & CTA */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              Desde
            </span>
            <PriceDisplay
              cents={game.min_price_cents}
              currency={game.currency}
              size="md"
              className="text-white group-hover:text-cyan-400 transition-colors"
            />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 group-hover:bg-indigo-600 border border-indigo-500/30 text-indigo-300 group-hover:text-white text-xs font-bold transition-all">
            <Zap className="w-3.5 h-3.5 text-cyan-400 group-hover:text-white" />
            Recargar
          </div>
        </div>
      </div>
    </div>
  );
};

