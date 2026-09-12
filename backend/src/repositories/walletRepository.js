import { supabaseAdmin, isSupabaseConfigured } from './supabaseClient.js';

export const walletRepository = {
  async getWallet(userId, currency = 'USD') {
    if (!isSupabaseConfigured) {
      // Retorno para desarrollo local simulado
      return {
        id: 'mock-wallet-uuid',
        user_id: userId,
        currency,
        balance_minor: 5000,
        held_minor: 0,
        available_minor: 5000,
      };
    }

    // Asegura que la billetera exista
    const { data: wallet, error } = await supabaseAdmin.rpc('create_wallet_if_not_exists', {
      p_user_id: userId,
      p_currency: currency,
    });

    if (error) throw error;
    return wallet;
  },

  async creditWallet({
    userId,
    amountMinor,
    currency = 'USD',
    idempotencyKey,
    reason,
    actorId = null,
    source = 'manual',
    externalReference = null,
  }) {
    if (!isSupabaseConfigured) {
      return {
        success: true,
        idempotent_replay: false,
        credited_minor: amountMinor,
        new_balance_minor: 10000,
        available_minor: 10000,
      };
    }

    const { data, error } = await supabaseAdmin.rpc('credit_wallet', {
      p_user_id: userId,
      p_amount_minor: amountMinor,
      p_currency: currency,
      p_idempotency_key: idempotencyKey,
      p_reason: reason,
      p_actor_id: actorId,
      p_source: source,
      p_external_reference: externalReference,
    });

    if (error) throw error;
    return data;
  },
};

