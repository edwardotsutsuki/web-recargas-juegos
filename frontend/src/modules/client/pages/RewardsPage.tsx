import React, { useState, useEffect } from 'react';
import { Trophy, Sparkles, Flame, Crown, Clock } from 'lucide-react';
import { resellerService } from '../../../services/api/reseller.service';
import { RewardsResponse } from '../../../types';

export const RewardsPage: React.FC = () => {
  const [data, setData] = useState<RewardsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRewards() {
      setLoading(true);
      try {
        const res = await resellerService.getRewards();
        setData(res);
      } catch (err) {
        console.error('Error cargando recompensas:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRewards();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-black text-white font-['Rajdhani'] uppercase tracking-wide flex items-center gap-2">
          Programa de Recompensas y Desafíos <Trophy className="w-5 h-5 text-amber-400" />
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Gana bonificaciones de saldo y mejores beneficios según tu volumen de ventas acumulado.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Cargando desafíos y metas...</div>
      ) : !data?.enabled ? (
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 text-center max-w-lg mx-auto space-y-3">
          <Clock className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="text-base font-bold text-white uppercase font-['Rajdhani']">
            Temporada de Recompensas en Mantenimiento
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            El sistema de recompensas se encuentra temporalmente en pausa mientras preparamos los nuevos retos y premios del próximo mes.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Banner de Saldo Acumulado */}
          <div className="glass-panel p-6 rounded-3xl border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-cyan-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Tu Volumen Acumulado
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white font-['Rajdhani'] mt-1">
                ${data.total_accumulated_usd} <span className="text-sm font-sans font-bold text-slate-400">USD en ventas</span>
              </div>
            </div>
            <span className="text-xs text-slate-400 max-w-xs text-center sm:text-right">
              Cada recarga exitosa suma automáticamente a tu progreso en todos los desafíos activos.
            </span>
          </div>

          {/* Grid de Recompensas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.rewards.map((reward) => {
              const isCompleted = reward.is_completed;

              return (
                <div
                  key={reward.id}
                  className={`glass-panel p-6 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                    isCompleted
                      ? 'border-emerald-500/40 bg-emerald-950/15 shadow-glow-primary'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-white font-['Rajdhani'] flex items-center gap-2">
                        {reward.badge_icon === 'fire' && <Flame className="w-4 h-4 text-orange-400" />}
                        {reward.badge_icon === 'crown' && <Crown className="w-4 h-4 text-amber-400" />}
                        {reward.badge_icon === 'sparkles' && <Sparkles className="w-4 h-4 text-cyan-400" />}
                        {reward.title}
                      </span>
                      {isCompleted ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                          ¡LOGRADO!
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
                          EN PROGRESO
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {reward.description}
                    </p>
                  </div>

                  {/* Barra de progreso */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-400">Progreso:</span>
                      <span className="text-cyan-300 font-mono">
                        ${reward.current_sales_usd} / ${reward.target_sales_usd} ({reward.progress_percentage}%)
                      </span>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${reward.progress_percentage}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400">Premio:</span>
                      <span className="text-xs font-black text-amber-400 font-['Rajdhani']">
                        +${reward.reward_bonus_usd} Saldo Gratis
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
