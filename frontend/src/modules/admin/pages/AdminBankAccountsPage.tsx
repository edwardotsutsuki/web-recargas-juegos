import React, { useState, useEffect } from 'react';
import {
  Landmark,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  X,
  CreditCard,
  Building2,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/atoms/Button';
import { useUIStore } from '../../../store/useUIStore';
import { adminService } from '../../../services/api/admin.service';

interface PaymentMethodAdmin {
  id: string;
  bank_name: string;
  account_type: string;
  account_number: string;
  account_holder: string;
  notes?: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
}

export const AdminBankAccountsPage: React.FC = () => {
  const { showToast } = useUIStore();

  const [methods, setMethods] = useState<PaymentMethodAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethodAdmin | null>(null);
  const [saving, setSaving] = useState(false);

  // Formulario
  const [bankName, setBankName] = useState('');
  const [accountType, setAccountType] = useState('Ahorros');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState('0');

  const fetchMethods = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAdminPaymentMethods();
      setMethods(data || []);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar cuentas bancarias', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  const handleOpenCreate = () => {
    setEditingMethod(null);
    setBankName('');
    setAccountType('Ahorros');
    setAccountNumber('');
    setAccountHolder('');
    setNotes('');
    setIsActive(true);
    setSortOrder(String(methods.length + 1));
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: PaymentMethodAdmin) => {
    setEditingMethod(m);
    setBankName(m.bank_name);
    setAccountType(m.account_type || 'Ahorros');
    setAccountNumber(m.account_number);
    setAccountHolder(m.account_holder);
    setNotes(m.notes || '');
    setIsActive(m.is_active !== false);
    setSortOrder(String(m.sort_order ?? 0));
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      showToast('Por favor completa Banco, Número de Cuenta y Titular.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        bank_name: bankName.trim(),
        account_type: accountType.trim(),
        account_number: accountNumber.trim(),
        account_holder: accountHolder.trim(),
        notes: notes.trim() || undefined,
        is_active: isActive,
        sort_order: parseInt(sortOrder, 10) || 0,
      };

      if (editingMethod) {
        await adminService.updatePaymentMethod(editingMethod.id, payload);
        showToast('¡Cuenta bancaria actualizada exitosamente!', 'success');
      } else {
        await adminService.createPaymentMethod(payload);
        showToast('¡Nueva cuenta bancaria agregada con éxito!', 'success');
      }

      setIsModalOpen(false);
      fetchMethods();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar la cuenta bancaria', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (m: PaymentMethodAdmin) => {
    const nextState = !m.is_active;
    try {
      await adminService.updatePaymentMethod(m.id, { is_active: nextState });
      showToast(
        nextState ? `Cuenta de "${m.bank_name}" habilitada para depósitos.` : `Cuenta de "${m.bank_name}" pausada.`,
        'info'
      );
      fetchMethods();
    } catch (err: any) {
      showToast(err.message || 'Error al cambiar estado de la cuenta', 'error');
    }
  };

  const handleDelete = async (m: PaymentMethodAdmin) => {
    if (!confirm(`¿Eliminar la cuenta de ${m.bank_name} (${m.account_number})? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await adminService.deletePaymentMethod(m.id);
      showToast('Cuenta bancaria eliminada.', 'info');
      fetchMethods();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar cuenta bancaria', 'error');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('Número de cuenta copiado al portapapeles', 'info');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb & Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/sys-admin-auth/deposits"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Volver a Vouchers"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white font-['Rajdhani'] uppercase tracking-wide flex items-center gap-2">
              Cuentas Bancarias para Depósitos <Landmark className="w-6 h-6 text-indigo-400" />
            </h1>
            <p className="text-xs text-slate-400">
              Administra las cuentas bancarias a las que tus socios revendedores transfieren para recargar saldo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/sys-admin-auth/deposits"
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Ver Vouchers
          </Link>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            Nueva Cuenta Bancaria
          </button>
        </div>
      </div>

      {/* Grid de Cuentas Bancarias */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
          Cargando cuentas bancarias...
        </div>
      ) : methods.length === 0 ? (
        <div className="p-12 text-center glass-panel rounded-3xl border border-slate-800">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No hay cuentas bancarias registradas</h3>
          <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
            Crea la primera cuenta bancaria para que tus clientes puedan seleccionarla al solicitar una recarga.
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
          >
            Agregar Cuenta Ahora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {methods.map((m) => {
            const isCopy = copiedId === m.id;

            return (
              <div
                key={m.id}
                className={`glass-panel rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                  m.is_active
                    ? 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                    : 'border-rose-950/40 bg-slate-950/50 opacity-60'
                }`}
              >
                <div>
                  {/* Top: Banco & Estado */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-500/20 text-indigo-400">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                          {m.bank_name}
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold uppercase">
                          {m.account_type || 'Ahorros'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleActive(m)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                        m.is_active
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                      }`}
                      title={m.is_active ? 'Clic para pausar esta cuenta' : 'Clic para activar'}
                    >
                      {m.is_active ? '● Activa' : '○ Pausada'}
                    </button>
                  </div>

                  {/* Número de Cuenta con botón de copiar */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Número / Dirección</span>
                      <span className="text-xs font-mono font-bold text-white tracking-wider">
                        {m.account_number}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(m.account_number, m.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Copiar número"
                    >
                      {isCopy ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Titular */}
                  <div className="mt-3 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Titular</span>
                    <span className="text-slate-200 font-semibold">{m.account_holder}</span>
                  </div>

                  {/* Notas o Instrucciones */}
                  {m.notes && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-[11px] text-slate-400 flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span>{m.notes}</span>
                    </div>
                  )}
                </div>

                {/* Footer: Acciones */}
                <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Prioridad: #{m.sort_order ?? 0}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(m)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Editar datos de la cuenta"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(m)}
                      className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 border border-rose-800/30 transition-colors"
                      title="Eliminar cuenta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar Cuenta */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-['Rajdhani'] uppercase tracking-wider flex items-center gap-2">
                <Landmark className="w-5 h-5 text-indigo-400" />
                {editingMethod ? 'Editar Cuenta Bancaria' : 'Nueva Cuenta Bancaria'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Nombre del Banco */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nombre del Banco / Plataforma *
                </label>
                <input
                  type="text"
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Ej: BANCO PICHINCHA, BINANCE PAY, PAYPAL..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 uppercase font-semibold"
                />
              </div>

              {/* Tipo de Cuenta y Prioridad */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Tipo de Cuenta
                  </label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Ahorros">Ahorros</option>
                    <option value="Corriente">Corriente</option>
                    <option value="Pay ID">Pay ID (Binance)</option>
                    <option value="Transferencia USD">Transferencia USD (PayPal)</option>
                    <option value="Zelle">Zelle (EE.UU.)</option>
                    <option value="Cripto Wallet">Billetera Cripto (USDT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Orden de Visualización
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Número de Cuenta / Pay ID */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Número de Cuenta / Dirección / Correo *
                </label>
                <input
                  type="text"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Ej: 2200570913 o pagos@dominio.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Titular */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Titular de la Cuenta (Nombre Completo / Razón Social) *
                </label>
                <input
                  type="text"
                  required
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="Ej: Kevin Guerrero o Recargas Juegos Online"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Notas o Instrucciones */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Instrucciones o Notas (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Transferir en horario de 8:00 a 22:00. El comprobante debe mostrar número de autorización."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none text-xs"
                />
              </div>

              {/* Estado Activo */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-0"
                />
                <label htmlFor="isActive" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  Habilitar inmediatamente para que los socios revendedores depositen
                </label>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={saving}
                  className="px-5 py-2 font-bold"
                >
                  {editingMethod ? 'Guardar Cambios' : 'Crear Cuenta Bancaria'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
