import React, { useEffect, useState } from 'react';
import {
  Headphones,
  RefreshCw,
  MessageSquare,
  CheckCircle2,
  Clock,
  Send,
  X,
  User,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
          setNewStatus(current.status);
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

  const handleQuickStatusChange = async (ticketId: string, status: string) => {
    try {
      const updated = await adminService.updateTicket(ticketId, { status });
      showToast(`Estado del ticket cambiado a "${status}"`, 'success');
      if (activeTicket?.id === ticketId && updated) {
        setActiveTicket(updated);
        setNewStatus(updated.status);
      }
      loadTickets(true);
    } catch (err: any) {
      showToast(err.message || 'Error al cambiar estado', 'error');
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('¿Estás seguro de eliminar este ticket permanentemente de la base de datos para liberar memoria? Esta acción no se puede deshacer.')) {
      return;
    }

    setDeletingId(ticketId);
    try {
      await adminService.deleteTicket(ticketId);
      showToast('Ticket eliminado permanentemente para liberar memoria', 'success');
      if (activeTicket?.id === ticketId) {
        setActiveTicket(null);
      }
      loadTickets(false);
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar ticket', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket) return;

    setIsSubmitting(true);
    try {
      let updated;
      if (adminReply.trim()) {
        updated = await adminService.replyTicket(activeTicket.id, {
          status: newStatus,
          message: adminReply.trim(),
        });
        showToast('Respuesta enviada y estado actualizado exitosamente', 'success');
      } else {
        // Actualizar solo el estado si no se ingresó mensaje de texto
        updated = await adminService.updateTicket(activeTicket.id, {
          status: newStatus,
        });
        showToast(`Estado actualizado a "${newStatus}" exitosamente`, 'success');
      }

      setAdminReply('');
      if (updated) {
        setActiveTicket(updated);
        setNewStatus(updated.status);
      }
      loadTickets(true);
    } catch (err: any) {
      showToast(err.message || 'Error al procesar solicitud', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded-lg bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 text-[10px] font-bold uppercase border border-red-200 dark:border-red-500/30">Urgente</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase border border-amber-200 dark:border-amber-500/30">Alta</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 text-[10px] font-bold uppercase border border-slate-200 dark:border-transparent">Baja</span>;
      default:
        return <span className="px-2 py-0.5 rounded-lg bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 text-[10px] font-bold uppercase border border-cyan-200 dark:border-cyan-500/30">Normal</span>;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'open':
        return <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-semibold"><Clock className="w-3.5 h-3.5" /> Abierto</span>;
      case 'in_progress':
        return <span className="inline-flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 font-semibold"><Clock className="w-3.5 h-3.5" /> En Proceso</span>;
      case 'resolved':
        return <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Resuelto</span>;
      case 'closed':
        return <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-semibold"><XCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> Cerrado</span>;
      default:
        return <span className="text-xs text-slate-500 dark:text-slate-400">{s}</span>;
    }
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-['Rajdhani'] uppercase tracking-wider flex items-center gap-2">
            <Headphones className="w-7 h-7 text-indigo-500 dark:text-indigo-400" />
            Mesa de Ayuda & Tickets de Soporte
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Atiende consultas, cambia estados en tiempo real o elimina tickets antiguos para liberar memoria.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadTickets(false)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refrescar
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl w-fit overflow-x-auto max-w-full shadow-sm">
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
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tickets Table */}
      <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-100/90 dark:bg-slate-950/40 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                <th className="p-4">Usuario / Contacto</th>
                <th className="p-4">Asunto / Conversación</th>
                <th className="p-4">Prioridad</th>
                <th className="p-4">Estado (Rápido)</th>
                <th className="p-4">Fecha</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 text-sm">
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
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white block text-xs">
                              {t.profiles?.full_name || t.user_email || 'Revendedor'}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono block">
                              {t.user_email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 max-w-xs sm:max-w-md">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900 dark:text-white block text-xs line-clamp-1">{t.subject}</span>
                          {replyCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-500/30 shrink-0">
                              {replyCount} {replyCount === 1 ? 'resp.' : 'resps.'}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{t.message}</span>
                        {lastReply && (
                          <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-medium line-clamp-1 mt-1 block">
                            ↩ {lastReply.sender === 'client' ? 'Cliente' : 'Soporte'}: {lastReply.message}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {getPriorityBadge(t.priority)}
                      </td>
                      <td className="p-4">
                        {/* Selector de cambio directo de estado */}
                        <select
                          value={t.status}
                          onChange={(e) => handleQuickStatusChange(t.id, e.target.value)}
                          className={`text-xs font-semibold rounded-xl px-2.5 py-1.5 border focus:outline-none transition-all cursor-pointer ${
                            t.status === 'open'
                              ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300'
                              : t.status === 'in_progress'
                              ? 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300'
                              : t.status === 'resolved'
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-400'
                          }`}
                        >
                          <option value="open" className="bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300">Abierto</option>
                          <option value="in_progress" className="bg-white dark:bg-slate-900 text-cyan-700 dark:text-cyan-300">En Proceso</option>
                          <option value="resolved" className="bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300">Resuelto</option>
                          <option value="closed" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400">Cerrado</option>
                        </select>
                      </td>
                      <td className="p-4 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openReplyModal(t)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Ver / Chat</span>
                          </button>

                          <button
                            onClick={() => handleDeleteTicket(t.id)}
                            disabled={deletingId === t.id}
                            title="Eliminar ticket permanentemente para liberar memoria"
                            className="p-1.5 rounded-xl bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reply Modal with Thread / Chat & Direct Status Changer */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100 relative max-h-[92vh] flex flex-col my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Ticket #{activeTicket.id.substring(0, 8)}
                    </h2>
                    {getPriorityBadge(activeTicket.priority)}
                    {getStatusBadge(activeTicket.status)}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {activeTicket.profiles?.full_name ? `${activeTicket.profiles.full_name} (${activeTicket.user_email})` : activeTicket.user_email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteTicket(activeTicket.id)}
                  title="Eliminar este ticket para liberar memoria"
                  className="p-1.5 rounded-xl text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-200 dark:border-red-500/20 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveTicket(null)}
                  className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Acción rápida:</span>
              <div className="flex items-center gap-1.5">
                {activeTicket.status !== 'closed' && (
                  <button
                    type="button"
                    onClick={() => handleQuickStatusChange(activeTicket.id, 'closed')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-transparent"
                  >
                    <XCircle className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                    <span>Cerrar Ticket</span>
                  </button>
                )}
                {activeTicket.status !== 'resolved' && (
                  <button
                    type="button"
                    onClick={() => handleQuickStatusChange(activeTicket.id, 'resolved')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Marcar Resuelto</span>
                  </button>
                )}
                {activeTicket.status !== 'open' && (
                  <button
                    type="button"
                    onClick={() => handleQuickStatusChange(activeTicket.id, 'open')}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span>Reabrir</span>
                  </button>
                )}
              </div>
            </div>

            {/* Conversation Thread (Scrollable) */}
            <div className="overflow-y-auto pr-1 space-y-3 flex-1 min-h-[160px] max-h-[360px]">
              {/* Initial Client Message */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {activeTicket.profiles?.full_name || activeTicket.user_email || 'Cliente'} (Mensaje Original)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    {new Date(activeTicket.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                  Asunto: {activeTicket.subject}
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
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
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-500/30 ml-4 sm:ml-8'
                        : 'bg-slate-50 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 mr-4 sm:mr-8'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {isAdmin ? (
                          <>
                            <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                            <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400">
                              {reply.sender_name || 'Soporte Administrativo'}
                            </span>
                          </>
                        ) : (
                          <>
                            <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                              {reply.sender_name || 'Cliente'}
                            </span>
                          </>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {new Date(reply.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {reply.message}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Reply & Status Form */}
            <form onSubmit={handleSendReply} className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Escribir Respuesta al Cliente (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={adminReply}
                    onChange={(e) => setAdminReply(e.target.value)}
                    placeholder="Escribe un mensaje de respuesta para el cliente..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nuevo Estado
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
                  >
                    <option value="closed">Cerrado (Finalizado)</option>
                    <option value="resolved">Resuelto (Atendido)</option>
                    <option value="in_progress">En Proceso (Investigando)</option>
                    <option value="open">Abierto (Pendiente)</option>
                  </select>

                  <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
                    {adminReply.trim() ? 'Se enviará email al revendedor.' : 'Solo actualizará el estado.'}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTicket(null)}
                  className="py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer border border-slate-200 dark:border-transparent"
                >
                  Cerrar Ventana
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isSubmitting
                      ? 'Guardando...'
                      : adminReply.trim()
                      ? 'Enviar Respuesta & Guardar'
                      : 'Actualizar Estado'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
