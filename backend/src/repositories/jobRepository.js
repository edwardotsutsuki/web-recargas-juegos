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

  async postponeJob({ orderId, delaySeconds = 60, errorCode = 'INSUFFICIENT_PROVIDER_BALANCE' }) {
    if (!isSupabaseConfigured) return;
    const availableAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
    await supabaseAdmin
      .from('purchase_jobs')
      .update({
        state: 'ready',
        available_at: availableAt,
        lease_until: null,
        lease_token: null,
        last_error_code: errorCode,
      })
      .eq('order_id', orderId);
  },

  async triggerWaitingJobs() {
    if (!isSupabaseConfigured) return 0;
    const { data, error } = await supabaseAdmin
      .from('purchase_jobs')
      .update({
        state: 'ready',
        available_at: new Date().toISOString(),
        lease_until: null,
        lease_token: null,
      })
      .eq('last_error_code', 'INSUFFICIENT_PROVIDER_BALANCE')
      .select('order_id');

    if (error) {
      console.error('[jobRepository] Error al despertar trabajos en espera:', error);
      return 0;
    }
    return data?.length || 0;
  },
};


