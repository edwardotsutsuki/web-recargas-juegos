import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  ZoomIn,
  User,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  Search,
  Landmark,
} from 'lucide-react';
import { Button } from '../../../components/atoms/Button';
import { useUIStore } from '../../../store/useUIStore';
import { adminService } from '../../../services/api/admin.service';
import { DepositRequest } from '../../../types';

export const AdminDepositsPage: React.FC = () => {
  const { showToast } = useUIStore();

  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Modales
  const [zoomVoucherUrl, setZoomVoucherUrl] = useState<string | null>(null);
  const [selectedDepositForReject, setSelectedDepositForReject] = useState<DepositRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Comprobante no coincide con el extracto bancario');
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const fetchDeposits = async () => {
    setLoading(true);
    try {
      const data = await adminService.getDeposits(filterStatus === 'all' ? undefined : filterStatus);
      setDeposits(data || []);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar depósitos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
  }, [filterStatus]);

  const handleApprove = async (deposit: DepositRequest) => {
    if (!confirm(`¿Confirmas la acreditación inmediata de $${(deposit.amount_cents / 100).toFixed(2)} ${deposit.currency} a la cuenta del revendedor?`)) {
      return;
    }

    setActionInProgressId(deposit.id);
    try {
      await adminService.approveDeposit(deposit.id, deposit.voucher_compressed_url || deposit.voucher_url);
      showToast(`¡Depósito aprobado! Se acreditaron $${(deposit.amount_cents / 100).toFixed(2)} exitosamente.`, 'success');
      fetchDeposits();
    } catch (err: any) {
      showToast(err.message || 'Error al aprobar depósito', 'error');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!selectedDepositForReject) return;

    setActionInProgressId(selectedDepositForReject.id);
    try {
      await adminService.rejectDeposit(selectedDepositForReject.id, rejectionReason);
      showToast('Depósito rechazado correctamente.', 'info');
      setSelectedDepositForReject(null);
      fetchDeposits();
    } catch (err: any) {
      showToast(err.message || 'Error al rechazar depósito', 'error');
    } finally {
      setActionInProgressId(null);
    }
  };

  const filtered = deposits.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.reference_number.toLowerCase().includes(q) ||
      d.bank_name.toLowerCase().includes(q) ||
      d.user?.full_name?.toLowerCase().includes(q) ||
      d.user?.phone?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white font-['Rajdhani'] uppercase tracking-wide flex items-center gap-2">
            Gestión y Aprobación de Depósitos <CreditCard className="w-5 h-5 text-indigo-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Inspecciona los vouchers bancarios con zoom de alta fidelidad y acredita saldo atómicamente a los revendedores.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            to="/sys-admin-auth/bank-accounts"
            className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-200 text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <Landmark className="w-3.5 h-3.5" />
            Cuentas Bancarias
          </Link>
          <button
            onClick={fetchDeposits}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refrescar Lista
          </button>
        </div>
      </div>

      {/* Filtros y Buscador */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-panel p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'pending', label: 'Pendientes' },
            { id: 'approved', label: 'Aprobados' },
            { id: 'rejected', label: 'Rechazados' },
            { id: 'all', label: 'Todos' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filterStatus === tab.id
                  ? 'bg-indigo-600 text-white shadow-glow-primary'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por referencia, socio o banco..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Tabla de Depósitos */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            Cargando solicitudes de depósito...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileCheck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-300">No hay solicitudes en esta categoría.</p>
            <p className="text-xs text-slate-500 mt-1">Los nuevos comprobantes reportados aparecerán aquí.</p>
          </div>
        ) : (
          <>
            {/* Mobile Card Layout (Exclusivo para celular / APK - Cómodo y táctil) */}
            <div className="md:hidden space-y-3 p-3">
              {filtered.map((item) => {
                const isPending = item.status === 'pending';
                const isAction = actionInProgressId === item.id;
                const dateStr = new Date(item.created_at).toLocaleString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-sm"
                  >
                    {/* Top: Cliente & Banco */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-sm text-white flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-400" />
                          {item.user?.full_name || 'Socio Revendedor'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                          {dateStr} • Ref: {item.reference_number}
                        </span>
                      </div>

                      <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-cyan-300 text-[11px] font-bold border border-slate-700">
                        {item.bank_name}
                      </span>
                    </div>

                    {/* Middle: Monto y Miniatura del Comprobante */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                          Monto a Acreditar
                        </span>
                        <span className="text-xl font-black text-emerald-400 font-['Rajdhani']">
                          ${(item.amount_cents / 100).toFixed(2)} {item.currency}
                        </span>
                      </div>

                      {/* Voucher Thumbnail button */}
                      {(item.voucher_compressed_url || item.voucher_url) ? (
                        <button
                          onClick={() => setZoomVoucherUrl(item.voucher_url || item.voucher_compressed_url || null)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold active:scale-95 transition-all"
                        >
                          <ZoomIn className="w-4 h-4" />
                          <span>Ver Voucher</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Sin foto</span>
                      )}
                    </div>

                    {/* Bottom: Estado o Botones de Acción Táctiles */}
                    {isPending ? (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Button
                          variant="primary"
                          size="md"
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-emerald-900/30"
                          disabled={isAction}
                          onClick={() => handleApprove(item)}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1.5" />
                          Aprobar
                        </Button>

                        <Button
                          variant="outline"
                          size="md"
                          className="w-full text-rose-400 hover:bg-rose-950/40 border-rose-800/50 font-bold py-2.5 rounded-xl"
                          disabled={isAction}
                          onClick={() => setSelectedDepositForReject(item)}
                        >
                          <XCircle className="w-4 h-4 mr-1.5" />
                          Rechazar
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                        <span className="text-[11px] text-slate-400">Estado:</span>
                        {item.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Aprobado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <XCircle className="w-3.5 h-3.5" /> Rechazado
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (100% Preservado para Web de Escritorio) */}
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Revendedor / Socio</th>
                  <th className="py-3 px-4">Banco Destino</th>
                  <th className="py-3 px-4">Referencia</th>
                  <th className="py-3 px-4">Monto ($ USD)</th>
                  <th className="py-3 px-4 text-center">Voucher</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((item) => {
                  const isPending = item.status === 'pending';
                  const isAction = actionInProgressId === item.id;
                  const dateStr = new Date(item.created_at).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">{dateStr}</td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-white flex items-center gap-1">
                            <User className="w-3 h-3 text-cyan-400" />
                            {item.user?.full_name || 'Socio Revendedor'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {item.user?.referral_code || item.user_id.substring(0, 8)}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-800/80 text-cyan-300 font-semibold border border-slate-700/60">
                          {item.bank_name}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                        {item.reference_number}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-sm font-black text-emerald-400 font-['Rajdhani']">
                          ${(item.amount_cents / 100).toFixed(2)}
                        </span>
                      </td>

                      {/* Miniatura Voucher con botón Zoom */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-block relative group">
                          <img
                            src={item.voucher_compressed_url || item.voucher_url}
                            alt="Comprobante"
                            className="w-12 h-12 object-cover rounded-lg border border-slate-700 cursor-pointer group-hover:scale-105 transition-transform"
                            onClick={() => setZoomVoucherUrl(item.voucher_compressed_url || item.voucher_url)}
                          />
                          <button
                            type="button"
                            onClick={() => setZoomVoucherUrl(item.voucher_compressed_url || item.voucher_url)}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity text-white"
                          >
                            <ZoomIn className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {item.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            <Clock className="w-3 h-3" /> Pendiente
                          </span>
                        )}
                        {item.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Aprobado
                          </span>
                        )}
                        {item.status === 'rejected' && (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                              <XCircle className="w-3 h-3" /> Rechazado
                            </span>
                            {item.rejection_reason && (
                              <span className="text-[10px] text-rose-400 mt-0.5 max-w-[150px] truncate" title={item.rejection_reason}>
                                {item.rejection_reason}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="primary"
                              size="sm"
                              className="px-2.5 py-1 text-[11px] bg-emerald-600 hover:bg-emerald-500 border-none shadow-none"
                              disabled={isAction}
                              onClick={() => handleApprove(item)}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Aprobar
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="px-2.5 py-1 text-[11px] text-rose-400 hover:bg-rose-950/40 border-rose-800/50"
                              disabled={isAction}
                              onClick={() => setSelectedDepositForReject(item)}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              Rechazar
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500">Procesado</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* Modal Zoom de Voucher en Alta Resolución */}
      {zoomVoucherUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={() => setZoomVoucherUrl(null)}
        >
          <div
            className="max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-3xl p-5 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ZoomIn className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase font-['Rajdhani'] tracking-wide">
                  Visor de Auditoría de Comprobante (Voucher)
                </h3>
              </div>
              <button
                onClick={() => setZoomVoucherUrl(null)}
                className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cerrar Visor
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/80 rounded-2xl my-3 border border-slate-800">
              <img
                src={zoomVoucherUrl}
                alt="Comprobante en Alta Resolución"
                className="max-h-[68vh] w-auto object-contain rounded-lg shadow-2xl"
              />
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              💡 Tip: Verifica que el número de transacción, la hora y el valor coincidan con la cuenta bancaria antes de pulsar "Aprobar".
            </p>
          </div>
        </div>
      )}

      {/* Modal para Rechazar Depósito */}
      {selectedDepositForReject && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedDepositForReject(null)}
        >
          <div
            className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold uppercase font-['Rajdhani']">Rechazar Solicitud de Depósito</h3>
            </div>

            <p className="text-xs text-slate-300">
              Indica al socio el motivo por el cual no se acredita este depósito:
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500 resize-none"
              placeholder="Ej: El dinero no se refleja en la cuenta bancaria, comprobante borroso, etc."
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDepositForReject(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
              >
                Cancelar
              </button>
              <Button
                variant="outline"
                className="px-4 py-2 text-xs font-bold text-rose-400 border-rose-700 hover:bg-rose-950/50"
                onClick={handleRejectConfirm}
                disabled={Boolean(actionInProgressId)}
              >
                Confirmar Rechazo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
