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

    // Si el payload contiene personalizaciones de paquetes (precios de venta o estado activo)
    if (Array.isArray(payload.packages_override) && payload.packages_override.length > 0) {
      await this.upsertPackageOverrides(payload.packages_override);
    }

    return data;
  },

  /**
   * Actualiza los precios minoristas de venta y el estado activo configurados por el Administrador
   */
  async upsertPackageOverrides(packagesOverride = []) {
    if (!isSupabaseConfigured || packagesOverride.length === 0) return;

    for (const pkg of packagesOverride) {
      if (!pkg.sku) continue;
      const updateFields = {
        last_seen_at: new Date().toISOString(),
      };
      if (pkg.price_decimal !== undefined) {
        updateFields.suggested_price = String(pkg.price_decimal);
      } else if (pkg.price_cents !== undefined) {
        updateFields.suggested_price = (Number(pkg.price_cents) / 100).toFixed(2);
      }
      if (pkg.is_active !== undefined) {
        updateFields.is_active = Boolean(pkg.is_active);
      }

      await supabaseAdmin
        .from('provider_synced_products')
        .update(updateFields)
        .eq('sku', pkg.sku);
    }
  },

  /**
   * Obtiene todos los productos con precios personalizados o estados desde la BD
   */
  async getPackageOverrides() {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabaseAdmin
      .from('provider_synced_products')
      .select('sku, game_id, suggested_price, wholesale_price, is_active');

    if (error) {
      console.warn('[catalogOverrideRepository] Error obteniendo package overrides:', error.message);
      return [];
    }
    return data || [];
  },
};

