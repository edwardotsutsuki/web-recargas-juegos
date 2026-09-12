import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Plus,
  Trash2,
  Edit,
  Power,
  RefreshCw,
  CheckCircle2,
  Flame,
  Crown,
  Sparkles,
  Gift,
} from 'lucide-react';
import { Button } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import { useUIStore } from '../../../store/useUIStore';
import { adminService } from '../../../services/api/admin.service';

export const AdminRewardsPage: React.FC = () => {
  const { showToast } = useUIStore();

  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetSalesUsd, setTargetSalesUsd] = useState('50.00');
  const [rewardBonusUsd, setRewardBonusUsd] = useState('2.50');
  const [badgeIcon, setBadgeIcon] = useState('trophy');
  const [gameId, setGameId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRewards = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAdminRewards();
      setRewards(data || []);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar recompensas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  const handleOpenCreate = () => {
    setEditingRewardId(null);
    setTitle('');
    setDescription('');
    setTargetSalesUsd('50.00');
    setRewardBonusUsd('2.50');
    setBadgeIcon('trophy');
    setGameId('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (r: any) => {
    setEditingRewardId(r.id);
    setTitle(r.title);
    setDescription(r.description || '');
    setTargetSalesUsd((Number(r.target_sales_cents) / 100).toFixed(2));
    setRewardBonusUsd((Number(r.reward_bonus_cents) / 100).toFixed(2));
    setBadgeIcon(r.badge_icon || 'trophy');
    setGameId(r.game_id || '');
    setIsActive(r.is_active !== false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Ingresa el título de la recompensa.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        target_sales_usd: parseFloat(targetSalesUsd || '0'),
        reward_bonus_usd: parseFloat(rewardBonusUsd || '0'),
        game_id: gameId.trim() || undefined,
        badge_icon: badgeIcon,
        is_active: isActive,
      };

      if (editingRewardId) {
        await adminService.updateAdminReward(editingRewardId, payload);
        showToast('¡Desafío actualizado correctamente!', 'success');
      } else {
        await adminService.createAdminReward(payload);
        showToast('¡Nuevo reto de recompensa creado!', 'success');
      }

      setIsModalOpen(false);
      fetchRewards();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar recompensa', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (r: any) => {
    const nextState = !r.is_active;
    try {
      await adminService.updateAdminReward(r.id, { is_active: nextState });
      showToast(nextState ? 'Reto activado.' : 'Reto pausado.', 'info');
      fetchRewards();
    } catch (err: any) {
      showToast(err.message || 'Error al cambiar estado', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este reto?')) return;
    try {
      await adminService.deleteAdminReward(id);
      showToast('Reto eliminado.', 'info');
      fetchRewards();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white font-['Rajdhani'] uppercase tracking-wide flex items-center gap-2">
            Gestión de Retos & Recompensas <Trophy className="w-5 h-5 text-amber-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Crea metas personalizadas por volumen de ventas para incentivar y premiar a los socios revendedores con saldo gratis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRewards}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Button
            variant="primary"
            className="px-4 py-2 text-xs font-bold shadow-glow-primary"
            onClick={handleOpenCreate}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo Reto / Meta
          </Button>
        </div>
      </div>

      {/* Grid de Recompensas */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
          Cargando recompensas...
        </div>
      ) : rewards.length === 0 ? (
        <div className="p-12 text-center glass-panel rounded-3xl border border-slate-800">
          <Gift className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-300">No hay retos registrados.</p>
          <p className="text-xs text-slate-500 mt-1">Crea el primer desafío para tus socios revendedores.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rewards.map((reward) => (
            <div
              key={reward.id}
              className={`glass-panel p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                reward.is_active ? 'border-amber-500/40 bg-amber-950/15' : 'border-slate-800 opacity-60'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-white font-['Rajdhani'] flex items-center gap-1.5">
                    {reward.badge_icon === 'fire' && <Flame className="w-4 h-4 text-orange-400" />}
                    {reward.badge_icon === 'crown' && <Crown className="w-4 h-4 text-amber-400" />}
                    {reward.badge_icon === 'sparkles' && <Sparkles className="w-4 h-4 text-cyan-400" />}
                    {reward.badge_icon === 'trophy' && <Trophy className="w-4 h-4 text-amber-400" />}
                    {reward.title}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-bold">
                    {reward.game_id ? reward.game_id.toUpperCase() : 'TODOS LOS JUEGOS'}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {reward.description}
                </p>

                <div className="p-3 rounded-2xl bg-black/40 border border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Meta de Ventas</span>
                    <strong className="text-white">
                      ${(Number(reward.target_sales_cents) / 100).toFixed(2)} USD
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-sans">Bono Acreditado</span>
                    <strong className="text-emerald-400">
                      +${(Number(reward.reward_bonus_cents) / 100).toFixed(2)} USD
                    </strong>
                  </div>
                </div>
              </div>

              {/* Controles */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleToggleActive(reward)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    reward.is_active
                      ? 'bg-emerald-600/80 text-white hover:bg-emerald-500'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Power className="w-3 h-3" />
                  {reward.is_active ? 'Activo' : 'Pausado'}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(reward)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(reward.id)}
                    className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900 border border-rose-800/40 text-rose-300 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear / Editar */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="max-w-lg w-full bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white uppercase font-['Rajdhani'] flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                {editingRewardId ? 'Editar Reto / Meta' : 'Nuevo Reto de Ventas'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  label="Título del Desafío"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Maestro Free Fire del Mes"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                  placeholder="Explica cómo cumplir la meta y el bono a recibir..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input
                    label="Meta de Ventas ($ USD)"
                    type="number"
                    step="1.00"
                    value={targetSalesUsd}
                    onChange={(e) => setTargetSalesUsd(e.target.value)}
                    placeholder="50.00"
                    required
                  />
                </div>

                <div>
                  <Input
                    label="Bono Saldo Gratis ($ USD)"
                    type="number"
                    step="0.10"
                    value={rewardBonusUsd}
                    onChange={(e) => setRewardBonusUsd(e.target.value)}
                    placeholder="2.50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Ícono del Reto
                  </label>
                  <select
                    value={badgeIcon}
                    onChange={(e) => setBadgeIcon(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="trophy">🏆 Trofeo Dorado</option>
                    <option value="fire">🔥 Fuego / Racha</option>
                    <option value="crown">👑 Corona VIP</option>
                    <option value="sparkles">✨ Destello Mágico</option>
                  </select>
                </div>

                <div>
                  <Input
                    label="Juego Específico (Opcional)"
                    value={gameId}
                    onChange={(e) => setGameId(e.target.value)}
                    placeholder="Dejar vacío para todos"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Estado del Desafío</span>
                  <span className="text-[10px] text-slate-400">Mostrar en el panel de socios</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    isActive ? 'bg-emerald-600 text-white shadow-glow-primary' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isActive ? 'Activo' : 'Pausado'}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <Button
                  type="submit"
                  variant="primary"
                  className="px-5 py-2 text-xs font-bold shadow-glow-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    'Guardando...'
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Guardar Reto
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

