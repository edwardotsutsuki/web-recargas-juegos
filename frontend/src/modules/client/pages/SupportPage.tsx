import React, { useEffect, useState } from 'react';
import { Headphones, MessageCircle, Send, HelpCircle, PlusCircle, CheckCircle2, Clock, MessageSquare } from 'lucide-react';
import { Button } from '../../../components/atoms/Button';
import { apiClient } from '../../../services/api/client';
import { useUIStore } from '../../../store/useUIStore';
import { SupportTicket } from '../../../types';

export const SupportPage: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<string>('deposit_inquiry');
  const [priority, setPriority] = useState<string>('normal');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useUIStore();

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient<SupportTicket[]>('/tickets');
      setTickets(data || []);
    } catch (err) {
      console.error('Error al cargar tickets del usuario:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient('/tickets', {
        method: 'POST',
        body: JSON.stringify({
          subject,
          category,
          priority,
          message,
        }),
      });
      showToast('¡Tu ticket de soporte ha sido enviado al equipo técnico!', 'success');
      setSubject('');
      setMessage('');
      setShowCreateForm(false);
      loadTickets();
    } catch (err: any) {
      showToast(err.message || 'Error al enviar ticket', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Resuelto
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" /> En Revisión
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" /> Pendiente
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 text-slate-100">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white font-['Rajdhani'] uppercase tracking-wide flex items-center gap-2">
          Centro de Soporte & Tickets <Headphones className="w-5 h-5 text-indigo-400" />
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Atención prioritaria para recargas, acreditación de depósitos bancarios y consultas de socios revendedores.
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WhatsApp Direct */}
        <div className="glass-panel p-6 rounded-3xl border border-emerald-500/30 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Atención Rápida por WhatsApp</h3>
                <p className="text-xs text-slate-400">Canal directo con la administración</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Comunícate directamente con nuestro equipo de operaciones para validación ágil de vouchers o soporte de recargas en tiempo real.
            </p>
          </div>
          <a
            href="https://wa.me/593999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition-colors shadow-glow-accent"
          >
            <Send className="w-3.5 h-3.5" />
            Abrir Chat de WhatsApp
          </a>
        </div>

        {/* Ticket Creator Toggle */}
        <div className="glass-panel p-6 rounded-3xl border border-indigo-500/30 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Mesa de Ayuda Formal</h3>
                <p className="text-xs text-slate-400">Historial seguro con respuesta administrativa</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Crea un ticket para reportar incidencias con órdenes, solicitudes de saldo o verificación de cuentas de juego con seguimiento continuo.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            {showCreateForm ? 'Ocultar Formulario' : 'Crear Nuevo Ticket'}
          </Button>
        </div>
      </div>

      {/* Form Section */}
      {showCreateForm && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-500/40 space-y-5 animate-fade-in bg-slate-900/90">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Nuevo Ticket de Soporte</h3>
          </div>

          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Asunto del Ticket
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ej: Acreditación pendiente depósito #12345"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Categoría
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="deposit_inquiry">Depósitos y Saldo</option>
                    <option value="recharge_issue">Fallo en Recarga</option>
                    <option value="id_verification">Verificación de ID</option>
                    <option value="account">Mi Cuenta / 2FA</option>
                    <option value="other">Otra Consulta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Prioridad
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="low">Baja</option>
                    <option value="normal">Normal</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Detalle del Problema o Consulta
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe los datos necesarios (número de comprobante, SKU de producto, ID de jugador o captura)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Enviando ticket...' : 'Enviar Ticket'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* My Tickets History */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Mis Tickets Registrados
        </h3>

        {isLoading ? (
          <div className="glass-panel p-8 rounded-3xl border border-slate-800 text-center text-xs text-slate-500">
            Cargando tus solicitudes de soporte...
          </div>
        ) : tickets.length === 0 ? (
          <div className="glass-panel p-8 rounded-3xl border border-slate-800 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">No tienes tickets abiertos en este momento.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3 hover:border-slate-700 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-indigo-400 font-bold">
                      #{t.id.substring(0, 8)}
                    </span>
                    <h4 className="text-sm font-bold text-white">{t.subject}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(t.status)}
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(t.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60">
                  {t.message}
                </p>

                {t.admin_reply ? (
                  <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                      <Headphones className="w-3.5 h-3.5" />
                      <span>Respuesta de Soporte Oficial</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {t.admin_reply}
                    </p>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 italic">
                    Un asesor revisará tu ticket a la brevedad posible.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
