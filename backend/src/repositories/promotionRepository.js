import { supabaseAdmin, isSupabaseConfigured } from './supabaseClient.js';

export const promotionRepository = {
  /**
   * Promociones activas para el panel de revendedores
   */
  async getActivePromotions() {
    if (!isSupabaseConfigured) {
      return [
        {
          id: 'mock-p1',
          title: '🔥 ¡Semana del Diamante Free Fire!',
          message: 'Disfruta de tarifas preferenciales en todos los paquetes de Free Fire LATAM con entrega automatizada en menos de 60 segundos.',
          badge_text: 'HOT PROMO',
          action_url: '/catalog',
          action_label: 'Ir a la Tienda',
          placement: 'top_banner',
          is_active: true,
        },
      ];
    }

    const { data, error } = await supabaseAdmin
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Todas las promociones para gestión administrativa
   */
  async getAllPromotions() {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabaseAdmin
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Crea una nueva promoción
   */
  async createPromotion(payload) {
    if (!isSupabaseConfigured) return { id: `mock-${Date.now()}`, ...payload };

    const { data, error } = await supabaseAdmin
      .from('promotions')
      .insert({
        title: payload.title,
        message: payload.message,
        badge_text: payload.badge_text || 'PROMO',
        banner_image_url: payload.banner_image_url || null,
        action_url: payload.action_url || '/catalog',
        action_label: payload.action_label || 'Ver Oferta',
        placement: payload.placement || 'top_banner',
        is_active: payload.is_active !== false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Actualiza una promoción existente
   */
  async updatePromotion(id, payload) {
    if (!isSupabaseConfigured) return { id, ...payload };

    const { data, error } = await supabaseAdmin
      .from('promotions')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Elimina una promoción
   */
  async deletePromotion(id) {
    if (!isSupabaseConfigured) return { success: true };

    const { error } = await supabaseAdmin
      .from('promotions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  },
};

