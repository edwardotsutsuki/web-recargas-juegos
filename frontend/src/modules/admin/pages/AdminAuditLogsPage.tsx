import React, { useEffect, useState } from 'react';
import { adminService } from '../../../services/api/admin.service';
import {
  History,
  RefreshCw,
  ShieldCheck,
  CreditCard,
  XCircle,
  Sliders,
  DollarSign,
  Search,
  Eye,
  X,
  FileText,
} from 'lucide-react';

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_id: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    role: string;
  };
}

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAuditLogs(100);
      setLogs(data);
    } catch (err) {
      console.error('Error cargando bitácora:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'approve_deposit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
            Aprobación Depósito
          </span>
        );
      case 'reject_deposit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-bold">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            Rechazo Depósito
          </span>
        );
      case 'manual_credit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-bold">
            <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
            Acreditación Saldo
          </span>
        );
      case 'update_settings':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-bold">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            Ajuste Configuración
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            {action}
          </span>
        );
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesSearch =
      searchQuery.trim() === '' ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.target_id && log.target_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.profiles?.full_name && log.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      JSON.stringify(log.details).toLowerCase().includes(searchQuery.toLowerCase());

    return matchesAction && matchesSearch;
  });

  const approvalsCount = logs.filter((l) => l.action === 'approve_deposit').length;
  const rejectionsCount = logs.filter((l) => l.action === 'reject_deposit').length;
  const creditsCount = logs.filter((l) => l.action === 'manual_credit').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Rajdhani'] uppercase tracking-wider flex items-center gap-2">
            <History className="w-7 h-7 text-cyan-400" />
            Bitácora Inmutable de Auditoría
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Registro cronológico inalterable de aprobaciones, rechazos y movimientos ejecutados por administradores.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refrescar Bitácora
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Eventos</span>
          <p className="text-2xl font-black text-white font-mono">{logs.length}</p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-emerald-900/40 bg-emerald-950/20 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Vouchers Aprobados</span>
          <p className="text-2xl font-black text-emerald-300 font-mono">{approvalsCount}</p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-rose-900/40 bg-rose-950/20 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Vouchers Rechazados</span>
          <p className="text-2xl font-black text-rose-300 font-mono">{rejectionsCount}</p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-cyan-900/40 bg-cyan-950/20 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Acreditaciones Saldo</span>
          <p className="text-2xl font-black text-cyan-300 font-mono">{creditsCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por usuario, acción o detalle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['all', 'approve_deposit', 'reject_deposit', 'manual_credit', 'update_settings'].map((act) => (
            <button
              key={act}
              onClick={() => setFilterAction(act)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                filterAction === act
                  ? 'bg-indigo-600 text-white shadow-glow-primary'
                  : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {act === 'all'
                ? 'Todos'
                : act === 'approve_deposit'
                ? 'Aprobados'
                : act === 'reject_deposit'
                ? 'Rechazados'
                : act === 'manual_credit'
                ? 'Saldo Manual'
                : 'Configuración'}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="p-4">Fecha / Hora</th>
                <th className="p-4">Acción Realizada</th>
                <th className="p-4">Administrador</th>
                <th className="p-4">Destino / Target</th>
                <th className="p-4">Detalles Relevantes</th>
                <th className="p-4 text-center">Auditoría</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Cargando bitácora de seguridad...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No se encontraron registros de auditoría coincidentes.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('es-EC', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="p-4">{getActionBadge(log.action)}</td>
                    <td className="p-4">
                      <span className="font-bold text-white block">
                        {log.profiles?.full_name || 'Administrador Central'}
                      </span>
                      <span className="text-[10px] text-indigo-400 font-mono">
                        {log.admin_id.slice(0, 13)}...
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-300">
                      {log.target_id ? (
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                          {log.target_id.slice(0, 13)}...
                        </span>
                      ) : (
                        <span className="text-slate-500">Global</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-300 max-w-xs truncate">
                      {log.details?.amount_cents && (
                        <span className="font-bold text-emerald-400 mr-2">
                          +${(log.details.amount_cents / 100).toFixed(2)} {log.details.currency || 'USD'}
                        </span>
                      )}
                      {log.details?.reason && (
                        <span className="text-slate-400 italic">"{log.details.reason}"</span>
                      )}
                      {log.details?.bank_name && (
                        <span className="text-slate-400 ml-1">({log.details.bank_name})</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Ver payload JSON de auditoría"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-[#0b0f19] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white font-['Rajdhani'] uppercase tracking-wider">
                  Detalle del Evento de Auditoría
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-semibold">ID Evento:</span>
                <span className="font-mono text-slate-200">{selectedLog.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-semibold">Acción:</span>
                <span className="font-mono text-white font-bold">{selectedLog.action}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-semibold">Fecha:</span>
                <span className="font-mono text-slate-200">{selectedLog.created_at}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-semibold">Admin Responsable:</span>
                <span className="font-mono text-cyan-400">{selectedLog.profiles?.full_name || selectedLog.admin_id}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Carga Útil / Payload Registrado:
              </span>
              <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-56">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <button
              onClick={() => setSelectedLog(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
            >
              Cerrar Inspección
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
