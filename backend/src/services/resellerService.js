import { resellerRepository } from '../repositories/resellerRepository.js';
import { orderRepository } from '../repositories/orderRepository.js';
import { balanceMonitorService } from './balanceMonitorService.js';
import { supabaseAdmin, isSupabaseConfigured } from '../repositories/supabaseClient.js';

export const resellerService = {
  /**
   * Obtiene los precios personalizados (PVP) del revendedor
   */
  async getCustomPrices(userId) {
    return resellerRepository.getCustomPrices(userId);
  },

  /**
   * Actualiza el PVP de un producto para el revendedor
   */
  async setCustomPrice(userId, sku, customPvpCents) {
    if (!sku) {
      const err = new Error('El identificador de producto (sku) es requerido.');
      err.status = 400;
      throw err;
    }

    const pvp = Number(customPvpCents);
    if (isNaN(pvp) || pvp < 0) {
      const err = new Error('El PVP debe ser un número mayor o igual a 0.');
      err.status = 400;
      throw err;
    }

    return resellerRepository.upsertCustomPrice(userId, sku, pvp);
  },

  /**
   * Mi Libro Contable: Bitácora financiera con desglose de costos, PVP y ganancia neta
   */
  async getAccountingBook(userId) {
    // 1. Obtener órdenes del revendedor
    let orders = [];
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) orders = data;
    } else {
      orders = await orderRepository.findByUserId(userId);
    }

    // 2. Obtener precios personalizados fijados
    const customPrices = await resellerRepository.getCustomPrices(userId);
    const pvpMap = new Map();
    for (const cp of customPrices) {
      pvpMap.set(cp.sku, Number(cp.custom_pvp_cents));
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let totalWholesaleCostCents = 0;
    let totalClientChargedCents = 0;
    let totalNetProfitCents = 0;

    let todayProfitCents = 0;
    let monthProfitCents = 0;

    const entries = orders.map((order) => {
      const costCents = Number(order.amount_cents || 0);
      const sku = order.product_id || order.sku || 'SKU-UNKNOWN';
      const orderDate = new Date(order.created_at).getTime();

      // Si el revendedor definió un PVP personalizado, se usa ese.
      // Si no, sugerimos un PVP con margen estándar de 15% sobre el costo.
      let pvpCents = pvpMap.get(sku);
      if (pvpCents === undefined || pvpCents === null) {
        pvpCents = Math.round(costCents * 1.15);
      }

      // La ganancia neta es la diferencia entre el PVP cobrado al cliente final y el costo mayorista debitado
      const isSuccess = order.status === 'success' || order.status === 'completed';
      const netProfitCents = isSuccess ? Math.max(0, pvpCents - costCents) : 0;
      const marginPercent = costCents > 0 ? Number(((netProfitCents / costCents) * 100).toFixed(1)) : 0;

      if (isSuccess) {
        totalWholesaleCostCents += costCents;
        totalClientChargedCents += pvpCents;
        totalNetProfitCents += netProfitCents;

        if (orderDate >= startOfToday) {
          todayProfitCents += netProfitCents;
        }
        if (orderDate >= startOfMonth) {
          monthProfitCents += netProfitCents;
        }
      }

      return {
        id: order.id,
        order_id: order.order_id || order.id,
        date: order.created_at,
        sku,
        product_name: order.product_id || 'Recarga Digital',
        player_id: order.player_payload?.id || 'N/A',
        player_name: order.player_payload?.name || 'Gamer',
        status: order.status,
        currency: order.currency || 'USD',
        wholesale_cost_cents: costCents,
        wholesale_cost_usd: (costCents / 100).toFixed(2),
        retail_pvp_cents: pvpCents,
        retail_pvp_usd: (pvpCents / 100).toFixed(2),
        net_profit_cents: netProfitCents,
        net_profit_usd: (netProfitCents / 100).toFixed(2),
        margin_percent: marginPercent,
      };
    });

    return {
      summary: {
        total_orders_count: orders.length,
        successful_orders_count: orders.filter((o) => o.status === 'success' || o.status === 'completed').length,
        total_wholesale_cost_usd: (totalWholesaleCostCents / 100).toFixed(2),
        total_client_charged_usd: (totalClientChargedCents / 100).toFixed(2),
        total_net_profit_usd: (totalNetProfitCents / 100).toFixed(2),
        today_profit_usd: (todayProfitCents / 100).toFixed(2),
        month_profit_usd: (monthProfitCents / 100).toFixed(2),
      },
      entries,
    };
  },

  /**
   * Recompensas y barra de progreso personalizada del revendedor
   */
  async getRewardsProgress(userId) {
    const settings = await balanceMonitorService.getSystemSettings();
    if (!settings.rewards_enabled) {
      return {
        enabled: false,
        rewards: [],
      };
    }

    const rewards = await resellerRepository.getRewards();

    // Calcular volumen acumulado exitoso del usuario
    let totalUserSalesCents = 0;
    if (isSupabaseConfigured) {
      const { data } = await supabaseAdmin
        .from('orders')
        .select('amount_cents, status')
        .eq('user_id', userId)
        .in('status', ['success', 'completed']);

      if (data) {
        totalUserSalesCents = data.reduce((sum, o) => sum + Number(o.amount_cents || 0), 0);
      }
    }

    const rewardsWithProgress = rewards.map((r) => {
      const targetCents = Number(r.target_sales_cents);
      const currentCents = Math.min(totalUserSalesCents, targetCents);
      const percentage = Math.min(100, Math.round((currentCents / targetCents) * 100));
      const isCompleted = currentCents >= targetCents;

      return {
        ...r,
        target_sales_usd: (targetCents / 100).toFixed(2),
        reward_bonus_usd: (Number(r.reward_bonus_cents) / 100).toFixed(2),
        current_sales_usd: (currentCents / 100).toFixed(2),
        progress_percentage: percentage,
        is_completed: isCompleted,
      };
    });

    return {
      enabled: true,
      total_accumulated_usd: (totalUserSalesCents / 100).toFixed(2),
      rewards: rewardsWithProgress,
    };
  },

  /**
   * Panel de referidos y enlace de invitación
   */
  async getReferralInfo(userId) {
    const profile = await resellerRepository.getProfile(userId);
    const settings = await balanceMonitorService.getSystemSettings();

    const referralCode = profile.referral_code || 'XP-XTREME';

    return {
      referral_code: referralCode,
      commission_percent: settings.referral_commission_percent || 1.0,
      total_referred_users: 0,
      total_earned_usd: '0.00',
    };
  },

  /**
   * Administración de Recompensas: Listado completo
   */
  async getAllRewardsAdmin() {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabaseAdmin
      .from('rewards')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Administración de Recompensas: Crear nuevo reto
   */
  async createRewardAdmin(payload) {
    if (!isSupabaseConfigured) return { id: `mock-rew-${Date.now()}`, ...payload };

    const { data, error } = await supabaseAdmin
      .from('rewards')
      .insert({
        title: payload.title,
        description: payload.description,
        target_sales_cents: Math.round(Number(payload.target_sales_usd || 0) * 100),
        reward_bonus_cents: Math.round(Number(payload.reward_bonus_usd || 0) * 100),
        game_id: payload.game_id || null,
        badge_icon: payload.badge_icon || 'trophy',
        is_active: payload.is_active !== false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Administración de Recompensas: Actualizar reto
   */
  async updateRewardAdmin(id, payload) {
    if (!isSupabaseConfigured) return { id, ...payload };

    const updateData = { updated_at: new Date().toISOString() };
    if (payload.title !== undefined) updateData.title = payload.title;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.target_sales_usd !== undefined) {
      updateData.target_sales_cents = Math.round(Number(payload.target_sales_usd) * 100);
    }
    if (payload.reward_bonus_usd !== undefined) {
      updateData.reward_bonus_cents = Math.round(Number(payload.reward_bonus_usd) * 100);
    }
    if (payload.game_id !== undefined) updateData.game_id = payload.game_id || null;
    if (payload.badge_icon !== undefined) updateData.badge_icon = payload.badge_icon;
    if (payload.is_active !== undefined) updateData.is_active = Boolean(payload.is_active);

    const { data, error } = await supabaseAdmin
      .from('rewards')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Administración de Recompensas: Eliminar reto
   */
  async deleteRewardAdmin(id) {
    if (!isSupabaseConfigured) return { success: true };

    const { error } = await supabaseAdmin.from('rewards').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },
};

