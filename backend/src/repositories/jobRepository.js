import { supabaseAdmin, isSupabaseConfigured } from './supabaseClient.js';

export const jobRepository = {
  async claimPurchaseJob(leaseSeconds = 60, leaseToken = null) {
    if (!isSupabaseConfigured) {
      return null;
    }

    const { data, error } = await supabaseAdmin.rpc('claim_purchase_job', {
      p_lease_seconds: leaseSeconds,
      ...(leaseToken ? { p_lease_token: leaseToken } : {}),
    });

    if (error) throw error;
    if (!data || data.length === 0) return null;
    return data[0];
  },

  /**
   * Pospone un trabajo de compra para ser reintentado o sondeado tras N segundos
   */
  async postponeJob({ orderId, delaySeconds = 30, errorCode = null }) {
    if (!isSupabaseConfigured) return;
    try {
      const availableAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
      await supabaseAdmin
        .from('purchase_jobs')
        .update({
          state: 'ready',
          available_at: availableAt,
          lease_token: null,
          lease_until: null,
          last_error_code: errorCode,
        })
        .eq('order_id', orderId);
    } catch (err) {
      console.warn('[jobRepository] Error en postponeJob:', err?.message);
    }
  },

  /**
   * Libera el lease de un trabajo sin posponerlo (para reintento inmediato)
   */
  async releaseLease(orderId) {
    if (!isSupabaseConfigured) return;
    try {
      await supabaseAdmin
        .from('purchase_jobs')
        .update({
          state: 'ready',
          available_at: new Date().toISOString(),
          lease_token: null,
          lease_until: null,
        })
        .eq('order_id', orderId);
    } catch (err) {
      console.warn('[jobRepository] Error en releaseLease:', err?.message);
    }
  },
};

