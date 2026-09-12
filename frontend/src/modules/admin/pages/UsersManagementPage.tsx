import React, { useEffect, useState } from 'react';
import { AdminUser } from '../../../types';
import { adminService } from '../../../services/api/admin.service';
import { PriceDisplay } from '../../../components/molecules/PriceDisplay';
import { Badge } from '../../../components/atoms/Badge';
import { Button } from '../../../components/atoms/Button';
import { BalanceCreditModal } from '../components/BalanceCreditModal';
import { AdminResetPasswordModal } from '../components/AdminResetPasswordModal';
import { Users, PlusCircle, Search, RefreshCw, KeyRound, Shield, CheckCircle2, AlertCircle, ShieldOff } from 'lucide-react';
import { Input } from '../../../components/atoms/Input';
import { apiClient } from '../../../services/api/client';
import { useUIStore } from '../../../store/useUIStore';

export const UsersManagementPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserForCredit, setSelectedUserForCredit] = useState<AdminUser | null>(null);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<AdminUser | null>(null);
  const { showToast } = useUIStore();

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getAdminUsers();
      setUsers(data || []);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable2FAForUser = async (user: AdminUser) => {
    if (!confirm(`¿Estás seguro de desactivar el 2FA para el usuario "${user.full_name || user.email}"? Esta acción se recomienda si el usuario perdió acceso a su app autenticadora.`)) return;

    try {
      await apiClient(`/admin/users/${user.id}/2fa/disable`, {
        method: 'POST',
      });
      showToast('2FA desactivado correctamente para el usuario', 'success');
      loadUsers();
    } catch (err: any) {
      showToast(err.message || 'Error desactivando 2FA del usuario', 'error');
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = (users || []).filter((u) => {
    const email = (u.email || '').toLowerCase();
    const name = (u.full_name || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return email.includes(q) || name.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Rajdhani'] uppercase tracking-wider flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-400" />
            Directorio de Usuarios & Seguridad
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Administra cuentas, asignación de saldo virtual transaccional y credenciales de acceso.
          </p>
        </div>

        <button
          onClick={loadUsers}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refrescar Directorio
        </button>
      </div>

      {/* Search Input */}
      <div className="max-w-md">
        <Input
          placeholder="Buscar por correo electrónico o nombre..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4 text-slate-400" />}
        />
      </div>

      {/* Users View */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400 glass-panel rounded-2xl border border-slate-800 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
          Cargando directorio de usuarios...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-12 text-center glass-panel rounded-2xl border border-slate-800">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-300">No se encontraron usuarios que coincidan con la búsqueda.</p>
        </div>
      ) : (
        <>
          {/* Mobile Cards (md:hidden) */}
          <div className="md:hidden space-y-3">
            {filteredUsers.map((user) => {
              const isSuperAdmin = user.email === 'b.edumalta@gmail.com' || user.role === 'admin';
              const availableBalance = user.wallet?.available_balance_cents ?? user.wallet?.total_balance_cents ?? 0;
              const currency = user.wallet?.currency || 'USD';

              return (
                <div
                  key={user.id}
                  className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-sm"
                >
                  {/* Top: User info & Role */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                        isSuperAdmin ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {(user.full_name || user.email || 'U').substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-white block truncate">
                          {user.full_name || 'Sin nombre'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono block truncate">
                          {user.email}
                        </span>
                        {user.referral_code && (
                          <span className="text-[10px] text-cyan-400 font-mono block">
                            Ref: {user.referral_code}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {isSuperAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold">
                          <Shield className="w-2.5 h-2.5" /> Admin
                        </span>
                      ) : (
                        <Badge variant="neutral">Socio</Badge>
                      )}
                      {user.two_factor_enabled ? (
                        <span className="text-[9px] text-emerald-400 flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" /> 2FA
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-500">Sin 2FA</span>
                      )}
                    </div>
                  </div>

                  {/* Middle: Saldo */}
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Saldo Disponible:</span>
                    <PriceDisplay
                      cents={availableBalance}
                      currency={currency}
                      size="md"
                      className="text-emerald-400 font-black"
                    />
                  </div>

                  {/* Bottom: Action Buttons */}
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSelectedUserForPassword(user)}
                        className="py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        <span>Contraseña</span>
                      </button>

                      <button
                        onClick={() => setSelectedUserForCredit(user)}
                        className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-indigo-900/30"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Abonar Saldo</span>
                      </button>
                    </div>

                    {user.two_factor_enabled && (
                      <button
                        onClick={() => handleDisable2FAForUser(user)}
                        className="w-full py-1.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                      >
                        <ShieldOff className="w-3.5 h-3.5 text-rose-400" />
                        <span>Desactivar 2FA (Rescate)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table (hidden md:block) */}
          <div className="hidden md:block glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="p-4">Usuario / Cuenta</th>
                    <th className="p-4">Rol & Privilegios</th>
                    <th className="p-4">Seguridad 2FA</th>
                    <th className="p-4">Saldo Total</th>
                    <th className="p-4">Saldo Disponible</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {filteredUsers.map((user) => {
                    const isSuperAdmin = user.email === 'b.edumalta@gmail.com' || user.role === 'admin';
                    const totalBalance = user.wallet?.total_balance_cents ?? 0;
                    const availableBalance = user.wallet?.available_balance_cents ?? user.wallet?.total_balance_cents ?? 0;
                    const currency = user.wallet?.currency || 'USD';

                    return (
                      <tr key={user.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase ${
                              isSuperAdmin ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40' : 'bg-slate-800 text-slate-300'
                            }`}>
                              {(user.full_name || user.email || 'U').substring(0, 2)}
                            </div>
                            <div>
                              <span className="font-semibold text-white block">
                                {user.full_name || 'Sin nombre'}
                              </span>
                              <span className="text-xs text-slate-400 font-mono block">
                                {user.email}
                              </span>
                              {user.referral_code && (
                                <span className="text-[10px] text-cyan-400 font-mono">
                                  Ref: {user.referral_code}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {isSuperAdmin ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold">
                              <Shield className="w-3 h-3" /> Super Admin
                            </span>
                          ) : (
                            <Badge variant="neutral">
                              Cliente / Revendedor
                            </Badge>
                          )}
                        </td>
                        <td className="p-4">
                          {user.two_factor_enabled ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                              <CheckCircle2 className="w-3 h-3" /> Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/60 border border-slate-700 text-slate-400 text-xs font-semibold">
                              <AlertCircle className="w-3 h-3 text-slate-500" /> Inactivo
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <PriceDisplay
                            cents={totalBalance}
                            currency={currency}
                            size="sm"
                            className="text-slate-300 font-medium"
                          />
                        </td>
                        <td className="p-4">
                          <PriceDisplay
                            cents={availableBalance}
                            currency={currency}
                            size="md"
                            className="text-emerald-400 font-bold"
                          />
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {user.two_factor_enabled && (
                              <button
                                onClick={() => handleDisable2FAForUser(user)}
                                title="Desactivar 2FA (Rescate por pérdida de dispositivo)"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
                              >
                                <ShieldOff className="w-3.5 h-3.5" />
                                <span className="hidden lg:inline">Quitar 2FA</span>
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedUserForPassword(user)}
                              title="Restablecer contraseña del usuario"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-amber-400 transition-colors"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                              <span className="hidden sm:inline">Contraseña</span>
                            </button>

                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => setSelectedUserForCredit(user)}
                            >
                              <PlusCircle className="w-3.5 h-3.5 mr-1" />
                              Saldo
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Credit Modal */}
      <BalanceCreditModal
        isOpen={Boolean(selectedUserForCredit)}
        user={selectedUserForCredit}
        onClose={() => setSelectedUserForCredit(null)}
        onSuccess={() => {
          loadUsers();
        }}
      />

      {/* Reset Password Modal */}
      <AdminResetPasswordModal
        isOpen={Boolean(selectedUserForPassword)}
        user={selectedUserForPassword}
        onClose={() => setSelectedUserForPassword(null)}
        onSuccess={() => {
          loadUsers();
        }}
      />
    </div>
  );
};
