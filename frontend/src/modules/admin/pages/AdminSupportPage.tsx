import React, { useEffect, useState } from 'react';
import { Headphones, RefreshCw, MessageSquare, CheckCircle2, Clock, Send, X, User } from 'lucide-react';
import { SupportTicket } from '../../../types';
import { adminService } from '../../../services/api/admin.service';
import { useUIStore } from '../../../store/useUIStore';

export const AdminSupportPage: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [adminReply, setAdminReply] = useState('');
  const [newStatus, setNewStatus] = useState<string>('resolved');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useUIStore();

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getTickets(selectedStatus === 'all' ? undefined : selectedStatus);
      setTickets(data || []);
    } catch (err) {
      console.error('Error cargando tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [selectedStatus]);

  const openReplyModal = (ticket: SupportTicket) => {
    setActiveTicket(ticket);
    setAdminReply(ticket.admin_reply || '');
    setNewStatus(ticket.status === 'open' ? 'in_progress' : ticket.status);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket) return;

    setIsSubmitting(true);
    try {
      await adminService.updateTicket(activeTicket.id, {
        status: newStatus,
        admin_reply: adminReply,
      });
      showToast('Respuesta enviada y estado del ticket actualizado', 'success');
      setActiveTicket(null);
      loadTickets();
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar ticket', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold uppercase border border-red-500/30">Urgente</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase border border-amber-500/30">Alta</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold uppercase">Baja</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase">Normal</span>;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'open':
        return <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-semibold"><Clock className="w-3.5 h-3.5" /> Abierto</span>;
      case 'in_progress':
        return <span className="inline-flex items-center gap-1 text-xs text-cyan-400 font-semibold"><Clock className="w-3.5 h-3.5" /> En Proceso</span>;
      case 'resolved':
        return <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Resuelto</span>;
      case 'closed':
        return <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-semibold">Cerrado</span>;
      default:
        return <span className="text-xs text-slate-400">{s}</span>;
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Rajdhani'] uppercase tracking-wider flex items-center gap-2">
            <Headphones className="w-7 h-7 text-indigo-400" />
            Mesa de Ayuda & Tickets de Soporte
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Atiende consultas de recargas, verificación de IDs y dudas de los socios revendedores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadTickets}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refrescar
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-900/80 border border-slate-800 rounded-2xl w-fit">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'open', label: 'Abiertos' },
          { id: 'in_progress', label: 'En Proceso' },
          { id: 'resolved', label: 'Resueltos' },
          { id: 'closed', label: 'Cerrados' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedStatus(t.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedStatus === t.id
                ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tickets Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="p-4">Usuario / Contacto</th>
                <th className="p-4">Asunto / Mensaje</th>
                <th className="p-4">Prioridad</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Fecha</th>
                <th className="p-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Cargando tickets de soporte...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No hay tickets registrados en esta sección.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-semibold text-white block text-xs">
                            {t.profiles?.full_name || t.user_email || 'Revendedor'}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono block">
                            {t.user_email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 max-w-xs sm:max-w-md">
                      <span className="font-semibold text-white block text-xs line-clamp-1">{t.subject}</span>
                      <span className="text-xs text-slate-400 line-clamp-1 mt-0.5">{t.message}</span>
                      {t.admin_reply && (
                        <span className="text-[11px] text-cyan-400 font-medium line-clamp-1 mt-1 block">
                          ↩ Resp: {t.admin_reply}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {getPriorityBadge(t.priority)}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(t.status)}
                    </td>
                    <td className="p-4 text-xs font-mono text-slate-400 whitespace-nowrap">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => openReplyModal(t)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Responder</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reply Modal */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100 relative">
            <button
              onClick={() => setActiveTicket(null)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  Ticket #{activeTicket.id.substring(0, 8)}
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  {activeTicket.user_email}
                </p>
              </div>
            </div>

            {/* Ticket Subject & Message Details */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                  {activeTicket.subject}
                </span>
                {getPriorityBadge(activeTicket.priority)}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeTicket.message}
              </p>
              <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
                Enviado: {new Date(activeTicket.created_at).toLocaleString()}
              </div>
            </div>

            <form onSubmit={handleSendReply} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Respuesta Oficial de la Administración
                </label>
                <textarea
                  required
                  rows={4}
                  value={adminReply}
                  onChange={(e) => setAdminReply(e.target.value)}
                  placeholder="Escribe la respuesta o solución que el revendedor visualizará en su panel de soporte..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Cambiar Estado del Ticket
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="open">Abierto (Pendiente)</option>
                  <option value="in_progress">En Proceso (Investigando)</option>
                  <option value="resolved">Resuelto (Atendido y Solucionado)</option>
                  <option value="closed">Cerrado (Finalizado)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTicket(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !adminReply}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Enviando...' : 'Enviar Respuesta'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
