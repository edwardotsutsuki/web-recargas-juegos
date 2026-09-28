import React, { useEffect, useState } from 'react';
import { Headphones, RefreshCw, MessageSquare, CheckCircle2, Clock, Send, X, User, ShieldCheck } from 'lucide-react';
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

  const loadTickets = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const data = await adminService.getTickets(selectedStatus === 'all' ? undefined : selectedStatus);
      setTickets(data || []);

      // Si hay un modal abierto, sincronizarlo en tiempo real
      if (activeTicket) {
        const current = (data || []).find((t: SupportTicket) => t.id === activeTicket.id);
        if (current) {
          setActiveTicket(current);
        }
      }
    } catch (err) {
      if (!isBackground) console.error('Error cargando tickets:', err);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
    const interval = setInterval(() => {
      loadTickets(true);
    }, 10000); // Polling cada 10s en segundo plano
    return () => clearInterval(interval);
  }, [selectedStatus, activeTicket?.id]);

  const openReplyModal = (ticket: SupportTicket) => {
    setActiveTicket(ticket);
    setAdminReply('');
    setNewStatus(ticket.status === 'open' ? 'in_progress' : ticket.status);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !adminReply.trim()) return;

    setIsSubmitting(true);
    try {
      const updated = await adminService.replyTicket(activeTicket.id, {
        status: newStatus,
        message: adminReply.trim(),
      });
      showToast('Respuesta enviada exitosamente', 'success');
      setAdminReply('');
      if (updated) {
        setActiveTicket(updated);
      }
      loadTickets(true);
    } catch (err: any) {
      showToast(err.message || 'Error al responder ticket', 'error');
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
            Atiende consultas de recargas, verificación de IDs y dudas de los socios revendedores en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadTickets(false)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refrescar
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-900/80 border border-slate-800 rounded-2xl w-fit overflow-x-auto max-w-full">
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
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
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
                <th className="p-4">Asunto / Conversación</th>
                <th className="p-4">Prioridad</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Fecha</th>
                <th className="p-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {isLoading && tickets.length === 0 ? (
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
                tickets.map((t) => {
                  const replyCount = (t.replies || []).length;
                  const lastReply = replyCount > 0 ? t.replies![replyCount - 1] : null;

                  return (
                    <tr key={t.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
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
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-white block text-xs line-clamp-1">{t.subject}</span>
                          {replyCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30 shrink-0">
                              {replyCount} {replyCount === 1 ? 'resp.' : 'resps.'}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 line-clamp-1 mt-0.5">{t.message}</span>
                        {lastReply && (
                          <span className="text-[11px] text-cyan-400 font-medium line-clamp-1 mt-1 block">
                            ↩ {lastReply.sender === 'client' ? 'Cliente' : 'Soporte'}: {lastReply.message}
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Ver / Responder</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reply Modal with Thread / Chat */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-slate-100 relative max-h-[90vh] flex flex-col my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">
                      Ticket #{activeTicket.id.substring(0, 8)}
                    </h2>
                    {getPriorityBadge(activeTicket.priority)}
                    {getStatusBadge(activeTicket.status)}
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    {activeTicket.profiles?.full_name ? `${activeTicket.profiles.full_name} (${activeTicket.user_email})` : activeTicket.user_email}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTicket(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conversation Thread (Scrollable) */}
            <div className="overflow-y-auto pr-1 space-y-3 flex-1 min-h-[160px] max-h-[380px]">
              {/* Initial Client Message */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-200">
                      {activeTicket.profiles?.full_name || activeTicket.user_email || 'Cliente'} (Mensaje Original)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(activeTicket.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="text-xs font-semibold text-indigo-300">
                  Asunto: {activeTicket.subject}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {activeTicket.message}
                </p>
              </div>

              {/* Thread Replies */}
              {(activeTicket.replies || []).map((reply, idx) => {
                const isAdmin = reply.sender === 'admin';

                return (
                  <div
                    key={reply.id || idx}
                    className={`p-3.5 rounded-2xl border space-y-1.5 ${
                      isAdmin
                        ? 'bg-indigo-950/30 border-indigo-500/30 ml-4 sm:ml-8'
                        : 'bg-slate-950/80 border-slate-800 mr-4 sm:mr-8'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {isAdmin ? (
                          <>
                            <ShieldCheck className="w-4 h-4 text-cyan-400" />
                            <span className="text-xs font-bold text-cyan-400">
                              {reply.sender_name || 'Soporte Administrativo'}
                            </span>
                          </>
                        ) : (
                          <>
                            <User className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="text-xs font-bold text-indigo-300">
                              {reply.sender_name || 'Cliente'}
                            </span>
                          </>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(reply.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {reply.message}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Reply & Status Form */}
            <form onSubmit={handleSendReply} className="space-y-3 pt-3 border-t border-slate-800 shrink-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Escribir Respuesta al Cliente
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={adminReply}
                    onChange={(e) => setAdminReply(e.target.value)}
                    placeholder="Escribe la respuesta o solución para el cliente..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Estado del Ticket
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="in_progress">En Proceso (Investigando)</option>
                    <option value="resolved">Resuelto (Atendido)</option>
                    <option value="closed">Cerrado (Finalizado)</option>
                    <option value="open">Abierto (Pendiente)</option>
                  </select>

                  <div className="mt-2 text-[10px] text-slate-400">
                    Se notificará por email al revendedor al enviar.
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTicket(null)}
                  className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
                >
                  Cerrar Ventana
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !adminReply.trim()}
                  className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
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
