import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Trash2,
  Edit,
  Power,
  RefreshCw,
  CheckCircle2,
  Flame,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import { useUIStore } from '../../../store/useUIStore';
import { adminService } from '../../../services/api/admin.service';
import { Promotion } from '../../../types';

export const AdminPromotionsPage: React.FC = () => {
  const { showToast } = useUIStore();

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [badgeText, setBadgeText] = useState('HOT PROMO');
  const [actionUrl, setActionUrl] = useState('/catalog');
  const [actionLabel, setActionLabel] = useState('Ver Oferta');
  const [placement, setPlacement] = useState<'top_banner' | 'hero' | 'modal'>('top_banner');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const data = await adminService.getPromotions();
      setPromotions(data || []);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar promociones', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const handleOpenCreate = () => {
    setEditingPromoId(null);
    setTitle('');
    setMessage('');
    setBadgeText('HOT PROMO');
    setActionUrl('/catalog');
    setActionLabel('Ver Oferta');
    setPlacement('top_banner');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Promotion) => {
    setEditingPromoId(p.id);
    setTitle(p.title);
    setMessage(p.message);
    setBadgeText(p.badge_text || 'PROMO');
    setActionUrl(p.action_url || '/catalog');
    setActionLabel(p.action_label || 'Ver Oferta');
    setPlacement(p.placement || 'top_banner');
    setIsActive(p.is_active !== false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast('Por favor completa el título y el mensaje de la promoción.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        badge_text: badgeText.trim(),
        action_url: actionUrl.trim(),
        action_label: actionLabel.trim(),
        placement,
        is_active: isActive,
      };

      if (editingPromoId) {
        await adminService.updatePromotion(editingPromoId, payload);
        showToast('¡Promoción actualizada exitosamente!', 'success');
      } else {
        await adminService.createPromotion(payload);
        showToast('¡Nueva promoción publicada en la tienda!', 'success');
      }

      setIsModalOpen(false);
      fetchPromotions();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar promoción', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (p: Promotion) => {
    const nextState = !p.is_active;
    try {
      await adminService.updatePromotion(p.id, { is_active: nextState });
      showToast(nextState ? 'Promoción activada.' : 'Promoción pausada.', 'info');
      fetchPromotions();
    } catch (err: any) {
      showToast(err.message || 'Error al cambiar estado', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta promoción?')) return;
    try {
      await adminService.deletePromotion(id);
      showToast('Promoción eliminada.', 'info');
      fetchPromotions();
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
            Avisos de Promociones & Campañas <Megaphone className="w-5 h-5 text-amber-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Publica banners y anuncios emergentes para avisar descuentos, bonos relámpago o novedades a todos tus revendedores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPromotions}
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
            Nueva Promoción
          </Button>
        </div>
      </div>

      {/* Lista de Promociones */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
          Cargando promociones...
        </div>
      ) : promotions.length === 0 ? (
        <div className="p-12 text-center glass-panel rounded-3xl border border-slate-800">
          <Megaphone className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-300">No hay promociones registradas.</p>
          <p className="text-xs text-slate-500 mt-1">Crea tu primer anuncio para avisar ofertas a tus clientes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {promotions.map((promo) => (
            <div
              key={promo.id}
              className={`glass-panel p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                promo.is_active ? 'border-indigo-500/40 bg-indigo-950/20' : 'border-slate-800 opacity-60'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    {promo.badge_text}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Ubicación: <strong>{promo.placement}</strong>
                  </span>
                </div>

                <h3 className="text-base font-bold text-white font-['Rajdhani']">
                  {promo.title}
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {promo.message}
                </p>

                {promo.action_url && (
                  <div className="text-[11px] text-cyan-400 font-bold flex items-center gap-1 pt-1">
                    <span>Enlace: {promo.action_url} ({promo.action_label})</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                )}
              </div>

              {/* Botones de Control */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleToggleActive(promo)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    promo.is_active
                      ? 'bg-emerald-600/80 text-white hover:bg-emerald-500'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Power className="w-3 h-3" />
                  {promo.is_active ? 'Activa en Tienda' : 'Pausada'}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(promo)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(promo.id)}
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
                <Megaphone className="w-4 h-4 text-amber-400" />
                {editingPromoId ? 'Editar Promoción' : 'Nueva Promoción para Revendedores'}
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
                  label="Título de la Promoción"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: 🔥 ¡Semana del Diamante Free Fire!"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Mensaje / Detalle del Anuncio
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                  placeholder="Explica la promoción, los porcentajes de descuento o el beneficio..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input
                    label="Etiqueta / Badge"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    placeholder="HOT PROMO"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Ubicación
                  </label>
                  <select
                    value={placement}
                    onChange={(e) => setPlacement(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="top_banner">Barra Superior (Marquee)</option>
                    <option value="hero">Tarjeta Hero Destacada</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input
                    label="Enlace Destino"
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    placeholder="/catalog o /wallet/deposit"
                  />
                </div>

                <div>
                  <Input
                    label="Texto del Botón"
                    value={actionLabel}
                    onChange={(e) => setActionLabel(e.target.value)}
                    placeholder="Ir a la Tienda"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Estado de la Campaña</span>
                  <span className="text-[10px] text-slate-400">Publicar de inmediato en la plataforma</span>
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
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Guardar y Publicar
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
