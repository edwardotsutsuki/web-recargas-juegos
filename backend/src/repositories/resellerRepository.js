import { supabaseAdmin, isSupabaseConfigured } from './supabaseClient.js';

export const resellerRepository = {
  /**
   * Obtiene los precios de venta personalizados (PVP) fijados por el revendedor.
   */
  async getCustomPrices(userId) {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabaseAdmin
      .from('reseller_custom_prices')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  },

  /**
   * Guarda o actualiza un precio personalizado para un producto (SKU).
   */
  async upsertCustomPrice(userId, sku, customPvpCents) {
    if (!isSupabaseConfigured) return { user_id: userId, sku, custom_pvp_cents: customPvpCents };

    const { data, error } = await supabaseAdmin
      .from('reseller_custom_prices')
      .upsert(
        {
          user_id: userId,
          sku,
          custom_pvp_cents: customPvpCents,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,sku' }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Obtiene la lista de recompensas activas
   */
  async getRewards() {
    if (!isSupabaseConfigured) {
      return [
        {
          id: 'mock-1',
          title: 'Desafío de Bienvenida',
          description: 'Acumula tus primeros $25.00 en recargas y recibe un bono directo a tu saldo.',
          target_sales_cents: 2500,
          reward_bonus_cents: 100,
          badge_icon: 'sparkles',
          is_active: true,
        },
      ];
    }

    const { data, error } = await supabaseAdmin
      .from('rewards')
      .select('*')
      .eq('is_active', true)
      .order('target_sales_cents', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Obtiene el perfil de un socio revendedor (con código de referido)
   */
  async getProfile(userId) {
    if (!isSupabaseConfigured) {
      return { id: userId, referral_code: 'XP-XTREME', role: 'client' };
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },
};

