import { supabaseAdmin, isSupabaseConfigured } from './supabaseClient.js';

export const materialsRepository = {
  async getActiveMaterials() {
    if (!isSupabaseConfigured) {
      return [
        {
          id: 'mat-1',
          title: 'Kit de Banners Redes Sociales',
          description: 'Pack de imágenes en alta definición listas para historias de WhatsApp e Instagram.',
          category: 'banner',
          file_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1000',
          format: 'ZIP',
          file_size_mb: 12.5,
          is_active: true,
          sort_order: 1,
        },
      ];
    }

    const { data, error } = await supabaseAdmin
      .from('promotional_materials')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getAllMaterialsAdmin() {
    if (!isSupabaseConfigured) {
      return this.getActiveMaterials();
    }

    const { data, error } = await supabaseAdmin
      .from('promotional_materials')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createMaterial(payload) {
    const { data, error } = await supabaseAdmin
      .from('promotional_materials')
      .insert({
        title: payload.title,
        description: payload.description || null,
        category: payload.category || 'banner',
        file_url: payload.file_url,
        format: payload.format || 'ZIP',
        file_size_mb: payload.file_size_mb || 5.0,
        is_active: payload.is_active ?? true,
        sort_order: payload.sort_order || 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateMaterial(id, payload) {
    const { data, error } = await supabaseAdmin
      .from('promotional_materials')
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

  async deleteMaterial(id) {
    const { error } = await supabaseAdmin
      .from('promotional_materials')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },
};

