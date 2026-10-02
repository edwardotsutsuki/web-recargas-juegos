import { resellerRepository } from '../repositories/resellerRepository.js';
import { orderRepository } from '../repositories/orderRepository.js';
import { balanceMonitorService } from './balanceMonitorService.js';
import { supabaseAdmin, isSupabaseConfigured } from '../repositories/supabaseClient.js';

const SKU_NAMES = {
  fflatam100: 'Free Fire - 100 + 10 Diamantes (LATAM)',
  fflatam310: 'Free Fire - 310 + 31 Diamantes (LATAM)',
  fflatam520: 'Free Fire - 520 + 52 Diamantes (LATAM)',
  fflatam1060: 'Free Fire - 1060 + 106 Diamantes (LATAM)',
  fflatam2180: 'Free Fire - 2180 + 218 Diamantes (LATAM)',
  fflatam5600: 'Free Fire - 5600 + 560 Diamantes (LATAM)',
  fflatamw: 'Free Fire - Pase Semanal (LATAM)',
  fflatamm: 'Free Fire - Pase Mensual (LATAM)',
  ff100: 'Free Fire - 100 Diamantes',
  ff310: 'Free Fire - 310 Diamantes',
  ff520: 'Free Fire - 520 Diamantes',
  ff1060: 'Free Fire - 1060 Diamantes',
  rob100: 'Roblox - 100 Robux',
  rob500: 'Roblox - 500 Robux',
  blst320: 'Blood Strike - 320 Oro',
  blst1100: 'Blood Strike - 1100 Oro',
  abmbeg: 'Arena Breakout - Bono Novato',
  codm420: 'Call of Duty Mobile - 420 CP',
};

function formatProductName(sku) {
  if (!sku) return 'Recarga Digital';
  const cleanSku = String(sku).toLowerCase().trim();
  if (SKU_NAMES[cleanSku]) return SKU_NAMES[cleanSku];
  if (cleanSku.startsWith('fflatam')) {
    const qty = cleanSku.replace('fflatam', '');
    return `Free Fire - ${qty} Diamantes (LATAM)`;
  }
  if (cleanSku.startsWith('ffbr')) {
    const qty = cleanSku.replace('ffbr', '');
    return `Free Fire - ${qty} Diamantes (Brasil)`;
  }
  if (cleanSku.startsWith('rob')) {
    const qty = cleanSku.replace('rob', '');
    return `Roblox - ${qty} Robux`;
  }
  if (cleanSku.startsWith('blst')) {
    const qty = cleanSku.replace('blst', '');
    return `Blood Strike - ${qty} Oro`;
  }
  return sku.toUpperCase();
}

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
      // Costo mayorista real debitado al revendedor (lo que nosotros le cobramos a él, NO el proveedor)
      const costCents = Number(order.price_minor ?? order.amount_cents ?? 0);
      const sku = order.product_id || order.sku || 'SKU-UNKNOWN';
      const orderDate = new Date(order.created_at).getTime();

      // Si el revendedor definió un PVP personalizado, se usa ese.
      // Si no, sugerimos un PVP con margen estándar de 15% sobre el costo mayorista.
      let pvpCents = pvpMap.get(sku);
      if (pvpCents === undefined || pvpCents === null) {
        pvpCents = Math.round(costCents * 1.15);
      }

      // Estados de orden exitosa en Supabase ('succeeded', 'completed', 'success')
      const statusNormalized = String(order.status || '').toLowerCase();
      const isSuccess = ['succeeded', 'success', 'completed'].includes(statusNormalized);

      // La ganancia neta es la diferencia entre el PVP cobrado al cliente final y el costo mayorista debitado
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

      const isProcessing = ['processing', 'held'].includes(statusNormalized);
      const isFailed = !isSuccess && !isProcessing;

      return {
        id: order.id,
        order_id: order.order_id || order.id,
        date: order.created_at,
        sku,
        product_name: formatProductName(sku),
        player_id: order.player_payload?.id || 'N/A',
        player_name: order.player_payload?.name || 'Gamer',
        status: order.status,
        currency: order.currency || 'USD',
        wholesale_cost_cents: isSuccess ? costCents : 0,
        wholesale_cost_usd: isSuccess ? (costCents / 100).toFixed(2) : '0.00',
        original_cost_usd: (costCents / 100).toFixed(2),
        retail_pvp_cents: isSuccess ? pvpCents : 0,
        retail_pvp_usd: isSuccess ? (pvpCents / 100).toFixed(2) : '0.00',
        original_pvp_usd: (pvpCents / 100).toFixed(2),
        net_profit_cents: isSuccess ? netProfitCents : 0,
        net_profit_usd: isSuccess ? (netProfitCents / 100).toFixed(2) : '0.00',
        margin_percent: isSuccess ? marginPercent : 0,
        is_refunded: isFailed,
        is_processing: isProcessing,
      };
    });

    const isOrderSuccessful = (o) => ['succeeded', 'success', 'completed'].includes(String(o.status || '').toLowerCase());
    const isOrderProcessing = (o) => ['processing', 'held'].includes(String(o.status || '').toLowerCase());
    const successfulCount = orders.filter(isOrderSuccessful).length;
    const processingCount = orders.filter(isOrderProcessing).length;
    const failedCount = orders.length - successfulCount - processingCount;

    return {
      summary: {
        total_orders_count: orders.length,
        successful_orders_count: successfulCount,
        processing_orders_count: processingCount,
        failed_orders_count: failedCount,
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
        .select('amount_cents, price_minor, status')
        .eq('user_id', userId)
        .in('status', ['succeeded', 'success', 'completed']);

      if (data) {
        totalUserSalesCents = data.reduce((sum, o) => sum + Number(o.price_minor ?? o.amount_cents ?? 0), 0);
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

