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
};

