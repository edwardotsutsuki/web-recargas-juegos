import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Sliders,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Power,
  Gift,
  Users,
  Activity,
  Zap,
  Mail,
} from 'lucide-react';
import { Button } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import { useUIStore } from '../../../store/useUIStore';
import { adminService } from '../../../services/api/admin.service';
import { SystemStatus } from '../../../types';

export const AdminSettingsPage: React.FC = () => {
  const { showToast } = useUIStore();

  const [loading, setLoading] = useState(true);
  const [refreshingBalance, setRefreshingBalance] = useState(false);
  const [saving, setSaving] = useState(false);

  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  // Form State
  const [warningThreshold, setWarningThreshold] = useState('50.00');
  const [criticalThreshold, setCriticalThreshold] = useState('5.00');
  const [circuitBreakerOverride, setCircuitBreakerOverride] = useState<'auto' | 'force_open' | 'force_pause'>('auto');
  const [rewardsEnabled, setRewardsEnabled] = useState(true);
  const [referralPercent, setReferralPercent] = useState('1.00');
  const [notificationSenderEmail, setNotificationSenderEmail] = useState('notificaciones@recargasjuegospro.cloud');

  const fetchStatus = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshingBalance(true);
    else setLoading(true);

    try {
      const data = await adminService.getSystemStatus(forceRefresh);
      setSystemStatus(data);
      if (data?.settings) {
        setWarningThreshold(data.settings.warning_threshold_usd || '50.00');
        setCriticalThreshold(data.settings.critical_threshold_usd || '5.00');
        setCircuitBreakerOverride(data.settings.circuit_breaker_override || 'auto');
        setRewardsEnabled(data.settings.rewards_enabled !== false);
        setReferralPercent(String(data.settings.referral_commission_percent || '1.00'));
        if (data.settings.notification_sender_email) {
          setNotificationSenderEmail(data.settings.notification_sender_email);
        }
      }
      if (forceRefresh) {
        showToast('Saldo y estado de Canjea actualizados en vivo.', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Error al obtener estado del sistema', 'error');
    } finally {
      setLoading(false);
      setRefreshingBalance(false);
    }
  };

  useEffect(() => {
    fetchStatus(false);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminService.updateSystemSettings({
        canjea_warning_threshold_cents: Math.round(parseFloat(warningThreshold || '0') * 100),
        canjea_critical_threshold_cents: Math.round(parseFloat(criticalThreshold || '0') * 100),
        circuit_breaker_override: circuitBreakerOverride,
        rewards_enabled: rewardsEnabled,
        referral_commission_percent: parseFloat(referralPercent || '1.00'),
        notification_sender_email: notificationSenderEmail.trim(),
      });

      showToast('¡Configuración del sistema guardada con éxito!', 'success');
      fetchStatus(true);
    } catch (err: any) {
      showToast(err.message || 'Error al guardar la configuración', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !systemStatus) {
    return (
      <div className="p-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
        Cargando parámetros de seguridad del sistema...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white font-['Rajdhani'] uppercase tracking-wide flex items-center gap-2">
          Control de Seguridad & Saldo del Proveedor <ShieldAlert className="w-5 h-5 text-amber-400" />
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Monitorea en tiempo real el saldo de Canjea API, configura el Freno de Emergencia (Circuit Breaker) y gestiona los módulos de la tienda.
        </p>
      </div>

      {/* Tarjeta de Saldo del Proveedor Canjea */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Saldo Canjea en Vivo */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Saldo Canjea API
            </span>
            <button
              type="button"
              onClick={() => fetchStatus(true)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Actualizar saldo ahora"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingBalance ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="my-3">
            <div className="text-3xl font-black text-white font-['Rajdhani'] tracking-tight">
              ${systemStatus?.canjea_balance || '0.00'}{' '}
              <span className="text-sm font-sans font-bold text-slate-400">
                {systemStatus?.currency || 'USD'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">
              Última sincronización: {systemStatus?.last_checked ? new Date(systemStatus.last_checked).toLocaleTimeString() : 'Ahora'}
            </span>
          </div>

          {/* Badge de Nivel de Alerta */}
          <div>
            {systemStatus?.alert_level === 'critical' && (
              <div className="px-3 py-1 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                Saldo Crítico: Freno Automático
              </div>
            )}
            {systemStatus?.alert_level === 'warning' && (
              <div className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Alerta Preventiva de Saldo
              </div>
            )}
            {systemStatus?.alert_level === 'normal' && (
              <div className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Operación Normal
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Estado del Freno de Emergencia */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-cyan-400" /> Estado de la Tienda
          </span>

          <div className="my-3">
            {systemStatus?.circuit_breaker_active ? (
              <div>
                <div className="text-xl font-bold text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  Pausa Preventiva Activa
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Las compras de los revendedores están pausadas temporalmente para evitar cobros de saldo sin stock.
                </p>
              </div>
            ) : (
              <div>
                <div className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  Tienda 100% Operativa
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Los revendedores pueden procesar recargas inmediatas con despacho 24/7.
                </p>
              </div>
            )}
          </div>

          <span className="text-[11px] text-slate-500 font-mono">
            Modo: <strong>{circuitBreakerOverride.toUpperCase()}</strong>
          </span>
        </div>

        {/* Card 3: Mensaje que visualiza el Cliente */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-indigo-400" /> Aviso a los Revendedores
          </span>

          <div className="my-2 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 italic">
            "{systemStatus?.alert_message || 'Servicio operando con normalidad.'}"
          </div>

          <span className="text-[10px] text-slate-500">
            Protección de reputación: No arriesga el saldo de tus socios ni genera reclamos.
          </span>
        </div>
      </div>

      {/* Formulario de Configuración de Umbrales */}
      <form onSubmit={handleSave} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
          <Sliders className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white uppercase font-['Rajdhani']">
            Ajustes de Umbrales y Automatización
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Umbral Alerta Amarilla */}
          <div>
            <Input
              label="Alerta Amarilla Preventiva ($ USD)"
              type="number"
              step="0.01"
              value={warningThreshold}
              onChange={(e) => setWarningThreshold(e.target.value)}
              helperText="Cuando el saldo de Canjea baje de este valor, el panel admin te alertará para que recargues."
              required
            />
          </div>

          {/* Umbral Freno Rojo Crítico */}
          <div>
            <Input
              label="Freno de Emergencia Rojo ($ USD)"
              type="number"
              step="0.01"
              value={criticalThreshold}
              onChange={(e) => setCriticalThreshold(e.target.value)}
              helperText="Si el saldo baja de este valor, se pausa automáticamente la tienda para proteger a los revendedores."
              required
            />
          </div>
        </div>

        {/* Override Modo Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            Comportamiento del Circuit Breaker (Freno)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: 'auto',
                title: 'Automático (Recomendado)',
                desc: 'Pausa compras si el saldo es menor al límite crítico.',
              },
              {
                id: 'force_open',
                title: 'Forzar Tienda Abierta',
                desc: 'Permite compras sin importar el saldo del proveedor.',
              },
              {
                id: 'force_pause',
                title: 'Pausa Administrativa',
                desc: 'Pausa compras de inmediato por mantenimiento.',
              },
            ].map((opt) => (
              <div
                key={opt.id}
                onClick={() => setCircuitBreakerOverride(opt.id as any)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  circuitBreakerOverride === opt.id
                    ? 'border-indigo-500 bg-indigo-950/40 shadow-glow-primary'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{opt.title}</span>
                  {circuitBreakerOverride === opt.id && (
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400">{opt.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sección: Recompensas y Referidos */}
        <div className="border-t border-slate-800 pt-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Gift className="w-4 h-4 text-pink-400" /> Módulos de Crecimiento & Revendedores
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Switch Recompensas */}
            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Sistema Modular de Recompensas</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Permite a los socios revendedores desbloquear bonos y metas por volumen.
                </span>
              </div>

              <button
                type="button"
                onClick={() => setRewardsEnabled(!rewardsEnabled)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  rewardsEnabled
                    ? 'bg-emerald-600 text-white shadow-glow-primary'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                {rewardsEnabled ? 'Activado' : 'Desactivado'}
              </button>
            </div>

            {/* Comisión Referidos */}
            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-cyan-400" /> Comisión por Referidos (%)
                </span>
                <span className="text-xs font-mono font-bold text-cyan-300">{referralPercent}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.25"
                value={referralPercent}
                onChange={(e) => setReferralPercent(e.target.value)}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                Porcentaje de bono en saldo que recibe el socio que invita por cada recarga de sus amigos.
              </span>
            </div>
          </div>
        </div>

        {/* Sección: Canal de Notificaciones & Email */}
        <div className="border-t border-slate-800 pt-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-cyan-400" /> Canal de Notificaciones & Correos Salientes
          </h3>

          <div className="p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-900/60 max-w-xl space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Correo Remitente Oficial (Sender Email)
              </label>
              <input
                type="email"
                required
                value={notificationSenderEmail}
                onChange={(e) => setNotificationSenderEmail(e.target.value)}
                placeholder="notificaciones@recargasjuegospro.cloud"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Dirección utilizada como remitente para avisos de restablecimiento de contraseña, confirmación de depósitos bancarios y alertas de soporte. Configurable para tu dominio personalizado.
            </p>
          </div>
        </div>

        {/* Botón Guardar */}
        <div className="pt-4 flex justify-end">
          <Button
            type="submit"
            variant="primary"
            className="px-6 py-3 text-sm font-bold shadow-glow-primary"
            disabled={saving}
          >
            {saving ? (
              'Guardando Parámetros...'
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Guardar Parámetros de Seguridad
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
