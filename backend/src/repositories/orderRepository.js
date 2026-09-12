import { supabaseAdmin, isSupabaseConfigured } from './supabaseClient.js';

export const orderRepository = {
  async reservePurchase({
    userId,
    currency,
    provider,
    productId,
    priceMinor,
    playerPayload,
    idempotencyKey,
    requestFingerprint,
  }) {
    if (!isSupabaseConfigured) {
      return {
        success: true,
        idempotent_replay: false,
        order_id: `ord_${Date.now()}`,
        status: 'held',
        price_minor: priceMinor,
      };
    }

    const { data, error } = await supabaseAdmin.rpc('reserve_purchase', {
      p_user_id: userId,
      p_currency: currency,
      p_provider: provider,
      p_product_id: productId,
      p_price_minor: priceMinor,
      p_player_payload: playerPayload,
      p_idempotency_key: idempotencyKey,
      p_request_fingerprint: requestFingerprint,
    });

    if (error) throw error;
    return data;
  },

  async settlePurchase({
    orderId,
    leaseToken,
    outcome,
    providerReference = null,
    failureCode = null,
    digitalCode = null,
  }) {
    if (!isSupabaseConfigured) {
      return {
        success: true,
        order_id: orderId,
        status: outcome,
      };
    }

    const { data, error } = await supabaseAdmin.rpc('settle_purchase', {
      p_order_id: orderId,
      p_lease_token: leaseToken,
      p_outcome: outcome,
      p_provider_reference: providerReference,
      p_failure_code: failureCode,
      p_digital_code: digitalCode,
    });

    if (error) throw error;
    return data;
  },

  async getUserOrders(userId, limit = 50) {
    if (!isSupabaseConfigured) {
      return [];
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getOrderById(orderId, userId = null) {
    if (!isSupabaseConfigured) {
      return null;
    }

    let query = supabaseAdmin.from('orders').select('*').eq('id', orderId);
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();
    if (error) return null;
    return data;
  },

  async getGlobalOrders(limit = 100) {
    if (!isSupabaseConfigured) {
      return [];
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*, profiles(email)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },
};

