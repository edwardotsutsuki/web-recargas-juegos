import { CanjeaClient } from '../providers/canjea/client.js';
import { supabaseAdmin, isSupabaseConfigured } from '../repositories/supabaseClient.js';

class BalanceMonitorService {
  constructor() {
    this.canjeaClient = new CanjeaClient();
    this.cachedBalance = null;
    this.lastCheckedAt = null;
    this.cacheTtlMs = 20000; // 20 segundos de caché para el balance en vivo
  }

  /**
   * Obtiene la configuración actual del sistema
   */
  async getSystemSettings() {
    if (!isSupabaseConfigured) {
      return {
        id: 'singleton',
        canjea_warning_threshold_cents: 5000,
        canjea_critical_threshold_cents: 500,
        circuit_breaker_override: 'auto',
        rewards_enabled: true,
        referral_commission_percent: 1.0,
      };
    }

    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .select('*')
      .eq('id', 'singleton')
      .maybeSingle();

    if (error || !data) {
      return {
        id: 'singleton',
        canjea_warning_threshold_cents: 5000,
        canjea_critical_threshold_cents: 500,
        circuit_breaker_override: 'auto',
        rewards_enabled: true,
        referral_commission_percent: 1.0,
      };
    }

    return data;
  }

  /**
   * Actualiza la configuración global del sistema (Solo Administrador)
   */
  async updateSystemSettings(updates) {
    if (!isSupabaseConfigured) return { ...updates };

    const payload = {
      updated_at: new Date().toISOString(),
    };

    if (updates.canjea_warning_threshold_cents !== undefined) {
      payload.canjea_warning_threshold_cents = Number(updates.canjea_warning_threshold_cents);
    }
    if (updates.canjea_critical_threshold_cents !== undefined) {
      payload.canjea_critical_threshold_cents = Number(updates.canjea_critical_threshold_cents);
    }
    if (updates.circuit_breaker_override !== undefined) {
      payload.circuit_breaker_override = updates.circuit_breaker_override;
    }
    if (updates.rewards_enabled !== undefined) {
      payload.rewards_enabled = Boolean(updates.rewards_enabled);
    }
    if (updates.referral_commission_percent !== undefined) {
      payload.referral_commission_percent = Number(updates.referral_commission_percent);
    }
    if (updates.notification_sender_email !== undefined) {
      payload.notification_sender_email = String(updates.notification_sender_email).trim();
    }

    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .update(payload)
      .eq('id', 'singleton')
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Obtiene el saldo real de Canjea y el estado del Circuit Breaker
   */
  async getStatus(forceRefresh = false) {
    const now = Date.now();
    let balanceData = this.cachedBalance;

    if (!balanceData || forceRefresh || !this.lastCheckedAt) {
      try {
        balanceData = await this.canjeaClient.getBalance();
        this.cachedBalance = balanceData;
        this.lastCheckedAt = now;
      } catch (err) {
        balanceData = this.cachedBalance || { ok: false, balance: '0.00', currency: 'USD', error: err.message };
      }
    } else if (now - this.lastCheckedAt > this.cacheTtlMs) {
      // Revalidación asíncrona en segundo plano sin bloquear al cliente (Stale-While-Revalidate)
      if (!this._isFetching) {
        this._isFetching = true;
        this.canjeaClient.getBalance().then((data) => {
          this.cachedBalance = data;
          this.lastCheckedAt = Date.now();
        }).catch(() => {}).finally(() => {
          this._isFetching = false;
        });
      }
    }

    const rawBalance = parseFloat(balanceData?.balance || '0.00');
    const balanceCents = Math.round(rawBalance * 100);
    const settings = await this.getSystemSettings();

    const warningCents = Number(settings.canjea_warning_threshold_cents || 5000);
    const criticalCents = Number(settings.canjea_critical_threshold_cents || 500);
    const override = settings.circuit_breaker_override || 'auto';

    let circuitBreakerActive = false;
    let alertLevel = 'normal'; // 'normal' | 'warning' | 'critical'
    let alertMessage = 'Servicio de recargas operando con normalidad.';

    if (override === 'force_pause') {
      circuitBreakerActive = true;
      alertLevel = 'critical';
      alertMessage = 'La tienda se encuentra en pausa preventiva administrativa.';
    } else if (override === 'force_open') {
      circuitBreakerActive = false;
      alertLevel = 'normal';
      alertMessage = 'Freno de emergencia deshabilitado manualmente.';
    } else {
      // Modo automático
      if (balanceCents <= criticalCents) {
        circuitBreakerActive = true;
        alertLevel = 'critical';
        alertMessage =
          'Estamos reponiendo inventario de recargas. El servicio se reactivará automáticamente en unos momentos.';
      } else if (balanceCents <= warningCents) {
        circuitBreakerActive = false;
        alertLevel = 'warning';
        alertMessage = `Alerta preventiva: El saldo del proveedor principal ($${rawBalance.toFixed(2)} USD) está cerca del límite mínimo.`;
      }
    }

    return {
      ok: true,
      canjea_balance: rawBalance.toFixed(2),
      canjea_balance_cents: balanceCents,
      currency: balanceData?.currency || 'USD',
      circuit_breaker_active: circuitBreakerActive,
      alert_level: alertLevel,
      alert_message: alertMessage,
      settings: {
        warning_threshold_cents: warningCents,
        warning_threshold_usd: (warningCents / 100).toFixed(2),
        critical_threshold_cents: criticalCents,
        critical_threshold_usd: (criticalCents / 100).toFixed(2),
        circuit_breaker_override: override,
        rewards_enabled: settings.rewards_enabled,
        referral_commission_percent: settings.referral_commission_percent,
        notification_sender_email: settings.notification_sender_email || 'notificaciones@recargasjuegospro.cloud',
      },
      last_checked: new Date(this.lastCheckedAt || now).toISOString(),
    };
  }

  /**
   * Consulta rápida para validar si se permite procesar una orden
   */
  async checkOrderPermission() {
    const status = await this.getStatus(false);
    if (status.circuit_breaker_active) {
      const err = new Error(status.alert_message);
      err.status = 503;
      err.code = 'INVENTORY_RESTOCKING';
      err.detail = {
        circuit_breaker_active: true,
        reason: 'LOW_PROVIDER_BALANCE',
        customer_notice: status.alert_message,
      };
      throw err;
    }
    return true;
  }
}

export const balanceMonitorService = new BalanceMonitorService();

