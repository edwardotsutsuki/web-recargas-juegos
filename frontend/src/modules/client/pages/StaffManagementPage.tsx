import React, { useState, useEffect } from 'react';
import { staffService, ResellerStaffMember } from '../../../services/api/staff.service';
import { useUIStore } from '../../../store/useUIStore';
import { useCashierStore } from '../../../store/useCashierStore';
import {
  Users,
  Store,
  Plus,
  Trash2,
  Edit2,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const StaffManagementPage: React.FC = () => {
  const { showToast } = useUIStore();
  const { isCashierMode, openPinModal } = useCashierStore();

  const [storeSlug, setStoreSlug] = useState('');
  const [masterPin, setMasterPin] = useState('1234');
  const [staffList, setStaffList] = useState<ResellerStaffMember[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Modal para agregar o editar cajero
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<ResellerStaffMember | null>(null);
  const [modalOperatorName, setModalOperatorName] = useState('');
  const [modalPinCode, setModalPinCode] = useState('');
  const [modalRole, setModalRole] = useState<'cashier' | 'admin'>('cashier');
  const [modalIsActive, setModalIsActive] = useState(true);
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchStaffData = async () => {
    try {
      setIsLoading(true);
      const data = await staffService.getMyStaff();
      setStoreSlug(data.storeSlug || '');
      setMasterPin(data.masterPin || '1234');
      setStaffList(data.staff || []);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar la lista de personal.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeSlug.trim()) {
      showToast('El nombre o código de tu local es obligatorio.', 'error');
      return;
    }
    if (masterPin.length < 4) {
      showToast('El PIN maestro del dueño debe tener al menos 4 dígitos.', 'error');
      return;
    }

    try {
      setIsSavingSettings(true);
      const res = await staffService.updateStoreSettings({
        storeSlug: storeSlug.trim().toLowerCase(),
        masterPin: masterPin.trim(),
      });
      setStoreSlug(res.storeSlug);
      setMasterPin(res.masterPin);
      showToast('¡Configuración de local y PIN maestro actualizados con éxito!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al guardar la configuración del local.', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingStaff(null);
    setModalOperatorName('');
    setModalPinCode('');
    setModalRole('cashier');
    setModalIsActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (staff: ResellerStaffMember) => {
    setEditingStaff(staff);
    setModalOperatorName(staff.operator_name);
    setModalPinCode(staff.pin_code);
    setModalRole(staff.role || 'cashier');
    setModalIsActive(staff.is_active);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveStaffMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalOperatorName.trim()) {
      setModalError('El nombre del cajero es requerido.');
      return;
    }
    if (modalPinCode.trim().length < 4) {
      setModalError('El PIN debe tener al menos 4 números.');
      return;
    }

    try {
      setIsSavingStaff(true);
      setModalError(null);

      await staffService.saveStaff({
        id: editingStaff?.id,
        operatorName: modalOperatorName.trim(),
        pinCode: modalPinCode.trim(),
        role: modalRole,
        isActive: modalIsActive,
      });

      showToast(
        editingStaff ? '¡Cajero actualizado correctamente!' : '¡Nuevo cajero registrado con éxito!',
        'success'
      );
      setIsModalOpen(false);
      fetchStaffData();
    } catch (err: any) {
      setModalError(err.message || 'Error al guardar el cajero.');
    } finally {
      setIsSavingStaff(false);
    }
  };

  const handleDeleteStaffMember = async (id: string, name: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar al cajero "${name}"? Ya no podrá iniciar sesión.`)) {
      return;
    }

    try {
      await staffService.deleteStaff(id);
      showToast(`Cajero "${name}" eliminado.`, 'success');
      setStaffList((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar el cajero.', 'error');
    }
  };

  // Si está en Modo Cajero, bloquear la pantalla para proteger las claves de los empleados
  if (isCashierMode) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-[#0b111e]/90 border border-slate-800 rounded-3xl max-w-lg mx-auto mt-8">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black font-['Rajdhani'] uppercase text-white mb-2">
          Gestión de Personal Bloqueada
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Esta pantalla contiene los PINs y accesos del negocio. Para configurarla debes ingresar con el PIN de Propietario.
        </p>
        <button
          onClick={() => openPinModal('access_restricted')}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg hover:opacity-95"
        >
          Desbloquear con PIN de Dueño
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Encabezado Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-[#0d1527] via-[#0e172a] to-[#0a101d] p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Terminal POS & Mostrador</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-['Rajdhani'] uppercase tracking-wide text-white">
            Personal y Cajeros
          </h1>
          <p className="text-xs text-slate-400 max-w-xl mt-1">
            Configura el código de tu local, tu PIN de Propietario y los cajeros que atenderán a tus clientes en mostrador con ganancias ocultas.
          </p>
        </div>

        <Link
          to="/terminal"
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold text-xs uppercase tracking-wider transition-all self-start sm:self-auto"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Abrir Terminal Mostrador</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tarjeta 1: Configuración de Tienda y PIN Maestro */}
          <div className="lg:col-span-1 bg-[#0b111e]/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Identificador de Local
                </h3>
                <span className="text-[11px] text-slate-400">Datos para ingreso en Terminal</span>
              </div>
            </div>

            <form onSubmit={handleSaveStoreSettings} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Nombre / Código de tu Local
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={storeSlug}
                    onChange={(e) =>
                      setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                    }
                    placeholder="Ej: ryuu, cyberzone, galaxia"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white font-mono font-bold text-sm focus:outline-hidden focus:border-cyan-400"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Este es el nombre corto que tus cajeros escribirán al abrir la terminal (ej: <span className="text-cyan-400 font-bold">{storeSlug || 'ryuu'}</span>).
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  PIN Maestro de Dueño (4 a 6 dígitos)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={6}
                    value={masterPin}
                    onChange={(e) => setMasterPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white font-mono font-bold text-sm focus:outline-hidden focus:border-cyan-400 tracking-widest"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Al ingresar con este PIN, se desbloquean todas las ganancias, balance contable y recargas.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSavingSettings ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Guardar Ajustes de Local</span>
                  </>
                )}
              </button>
            </form>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <ShieldAlert className="w-4 h-4" />
                <span>Seguridad de Blindaje</span>
              </div>
              <p>
                Los cajeros que crees en la sección contigua <span className="text-white font-bold">NUNCA</span> podrán ver tus costos de proveedor ni tu margen de ganancia.
              </p>
            </div>
          </div>

          {/* Tarjeta 2: Listado de Cajeros / Personal */}
          <div className="lg:col-span-2 bg-[#0b111e]/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Cajeros y Operadores Registrados
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      Personal autorizado para emitir recargas en tu local
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Cajero</span>
                </button>
              </div>

              {staffList.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-2xl">
                  <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-300">No tienes cajeros registrados todavía</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Haz clic en "Nuevo Cajero" para dar de alta a tus empleados con su propio PIN de 4 dígitos.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <th className="py-2.5 px-3">Operador</th>
                        <th className="py-2.5 px-3">PIN</th>
                        <th className="py-2.5 px-3">Rol</th>
                        <th className="py-2.5 px-3">Estado</th>
                        <th className="py-2.5 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs">
                      {staffList.map((staff) => (
                        <tr key={staff.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 px-3 font-bold text-white">
                            <span className="capitalize">{staff.operator_name}</span>
                          </td>
                          <td className="py-3 px-3 font-mono text-cyan-400 font-bold tracking-widest">
                            •••• ({staff.pin_code})
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                staff.role === 'admin'
                                  ? 'bg-purple-950/80 text-purple-300 border border-purple-500/30'
                                  : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {staff.role === 'admin' ? 'Encargado' : 'Cajero (Solo PVP)'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                staff.is_active
                                  ? 'bg-cyan-950/80 text-cyan-300'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {staff.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(staff)}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                              title="Editar Cajero"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStaffMember(staff.id, staff.operator_name)}
                              className="p-1.5 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900/60 hover:text-red-200 transition-colors"
                              title="Eliminar Cajero"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Guía Rápida Inferior */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-slate-400">
              <span>
                Acceso para cajeros desde cualquier navegador: <span className="text-cyan-400 font-bold font-mono">/terminal</span>
              </span>
              <span className="text-emerald-400 font-bold">
                ✓ Despachos automáticos 24/7 sin exponer tus datos
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Crear / Editar Cajero */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#0b111e] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black font-['Rajdhani'] uppercase tracking-wider text-white">
                {editingStaff ? 'Editar Cajero' : 'Registrar Nuevo Cajero'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-2.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs font-bold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveStaffMember} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Nombre de Usuario / Empleado
                </label>
                <input
                  type="text"
                  value={modalOperatorName}
                  onChange={(e) => setModalOperatorName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="Ej: genesis, carlos, maria"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white font-bold text-sm focus:outline-hidden focus:border-cyan-400"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Sin espacios ni caracteres especiales.
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  PIN Numérico (4 a 6 dígitos)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={modalPinCode}
                  onChange={(e) => setModalPinCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="1234"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white font-mono font-bold text-sm focus:outline-hidden focus:border-cyan-400 tracking-widest"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Nivel de Acceso
                </label>
                <select
                  value={modalRole}
                  onChange={(e) => setModalRole(e.target.value as 'cashier' | 'admin')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white font-bold text-xs focus:outline-hidden focus:border-cyan-400 cursor-pointer"
                >
                  <option value="cashier">Cajero Estándar (Solo Ventas al PVP - Ganancias Ocultas)</option>
                  <option value="admin">Encargado de Local (Permisos Administrativos)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={modalIsActive}
                  onChange={(e) => setModalIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 cursor-pointer"
                />
                <label htmlFor="isActiveCheck" className="text-xs font-bold text-slate-300 cursor-pointer">
                  Cajero Activo (habilitado para despachar)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingStaff}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-95 text-white text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingStaff && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingStaff ? 'Actualizar' : 'Crear Cajero'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
