import { supabaseAdmin, isSupabaseConfigured } from './supabaseClient.js';

export const catalogOverrideRepository = {
  /**
   * Obtiene todas las personalizaciones de juegos
   */
  async getOverrides() {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabaseAdmin
      .from('catalog_game_overrides')
      .select('*');

    if (error) throw error;
    return data || [];
  },

  /**
   * Guarda o actualiza la personalización de un juego (Portada, Banner, Título, Badge, Visibilidad)
   */
  async upsertOverride(gameId, payload) {
    if (!isSupabaseConfigured) return { game_id: gameId, ...payload };

    const updateData = {
      game_id: gameId,
      updated_at: new Date().toISOString(),
    };

    if (payload.custom_name !== undefined) updateData.custom_name = payload.custom_name;
    if (payload.custom_image_url !== undefined) updateData.custom_image_url = payload.custom_image_url;
    if (payload.custom_banner_url !== undefined) updateData.custom_banner_url = payload.custom_banner_url;
    if (payload.custom_badge !== undefined) updateData.custom_badge = payload.custom_badge;
    if (payload.is_visible !== undefined) updateData.is_visible = Boolean(payload.is_visible);
    if (payload.sort_order !== undefined) updateData.sort_order = Number(payload.sort_order);

    const { data, error } = await supabaseAdmin
      .from('catalog_game_overrides')
      .upsert(updateData, { onConflict: 'game_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

