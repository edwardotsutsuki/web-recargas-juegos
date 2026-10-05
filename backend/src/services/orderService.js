import { createHash } from 'node:crypto';
import { orderRepository } from '../repositories/orderRepository.js';
import { catalogService } from './catalogService.js';
import { supabaseAdmin, isSupabaseConfigured } from '../repositories/supabaseClient.js';

export const orderService = {
  async createOrder({
    userId,
    sku,
    playerPayload = {},
    currency = 'USD',
    idempotencyKey,
    operatorName = null,
  }) {
    if (!idempotencyKey) {
      const err = new Error('La cabecera Idempotency-Key es obligatoria.');
      err.status = 400;
      err.code = 'IDEMPOTENCY_KEY_REQUIRED';
      throw err;
    }

    let userTier = 1;
    if (isSupabaseConfigured && userId) {
      try {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('price_tier')
          .eq('id', userId)
          .single();
        if (profile?.price_tier) {
          userTier = Number(profile.price_tier) === 2 ? 2 : 1;
        }
      } catch (err) {
        console.warn('[orderService] Error consultando price_tier de usuario:', err.message);
      }
    }

    // 1. Obtener precio confiable del catálogo según el nivel tarifario del usuario
    const product = await catalogService.getProductBySku(sku, userTier);
    if (!product) {
      const err = new Error(`El producto con SKU "${sku}" no existe o fue descontinuado.`);
      err.status = 404;
      err.code = 'SKU_NOT_FOUND';
      throw err;
    }

    if (product.requires_player_id && !playerPayload?.id) {
      const err = new Error('Este producto requiere el ID de jugador.');
      err.status = 400;
      err.code = 'PLAYER_ID_REQUIRED';
      throw err;
    }

    if (product.required_fields && product.required_fields.length > 0) {
      const fields = playerPayload?.fields || {};
      for (const field of product.required_fields) {
        if (field.required && !fields[field.key]) {
          const err = new Error(`El campo "${field.label || field.key}" es obligatorio.`);
          err.status = 400;
          err.code = 'REQUIRED_FIELD_MISSING';
          throw err;
        }
      }
    }

    const priceMinor = product.price_cents;

    // 2. Calcular fingerprint SHA-256 canónico del payload
    const canonicalPayload = JSON.stringify({
      userId,
      sku,
      playerPayload: playerPayload || {},
      currency,
      priceMinor,
    });
    const requestFingerprint = createHash('sha256').update(canonicalPayload).digest('hex');

    // 3. Ejecutar retención atómica en Supabase vía RPC
    try {
      const reservation = await orderRepository.reservePurchase({
        userId,
        currency,
        provider: 'canjea',
        productId: sku,
        priceMinor,
        playerPayload: playerPayload || {},
        idempotencyKey,
        requestFingerprint,
        operatorName,
      });

      return reservation;
    } catch (err) {
      if (err.code === 'P0001') {
        const customErr = new Error('Saldo virtual disponible insuficiente.');
        customErr.status = 422;
        customErr.code = 'INSUFFICIENT_FUNDS';
        throw customErr;
      }
      if (err.code === '23505') {
        const customErr = new Error('Conflicto: Clave de idempotencia ya usada con otro payload.');
        customErr.status = 409;
        customErr.code = 'IDEMPOTENCY_CONFLICT';
        throw customErr;
      }
      throw err;
    }
  },

  async getMyOrders(userId) {
    const rawOrders = await orderRepository.getUserOrders(userId);
    let catalog = [];
    try {
      catalog = await catalogService.getCatalog();
    } catch {
      catalog = [];
    }
    const productBySku = new Map(catalog.map((p) => [p.sku, p]));

    return rawOrders.map((o) => {
      const prod = productBySku.get(o.product_id);
      let playerPayload = {};
      try {
        playerPayload = typeof o.player_payload === 'string' ? JSON.parse(o.player_payload) : (o.player_payload || {});
      } catch {
        playerPayload = {};
      }

      let status = 'processing';
      if (o.status === 'succeeded' || o.status === 'completed') status = 'completed';
      else if (o.status === 'failed') {
        status = o.failure_code === 'REFUNDED_BY_PROVIDER' ? 'refunded' : 'failed';
      }
      else if (o.status === 'cancelled') status = 'cancelled';
      else if (o.status === 'held' || o.status === 'processing') {
        status = o.failure_code === 'ORPHANED' ? 'orphaned' : 'processing';
      }

      return {
        id: o.id,
        user_id: o.user_id,
        product_id: o.product_id,
        product_name: prod ? prod.name : (o.product_id || 'Recarga Gamer'),
        game: prod ? prod.game : 'Juegos Online',
        amount_cents: Number(o.price_minor || 0),
        custom_pvp_cents: playerPayload.custom_pvp_cents ? Number(playerPayload.custom_pvp_cents) : null,
        currency: o.currency || 'USD',
        player_id: playerPayload.id || null,
        player_name: playerPayload.name || null,
        player_server: playerPayload.server || playerPayload.zoneId || null,
        status,
        operator_name: o.operator_name || null,
        failure_code: status === 'completed' ? null : (o.failure_code || null),
        last_error_message: o.last_error_message || null,
        digital_code: o.digital_code || null,
        redeem_instructions: o.redeem_instructions || prod?.redeem_instructions || null,
        created_at: o.created_at,
      };
    });
  },

  async getOrderById(orderId, userId) {
    const o = await orderRepository.getOrderById(orderId, userId);
    if (!o) return null;
    let catalog = [];
    try {
      catalog = await catalogService.getCatalog();
    } catch {
      catalog = [];
    }
    const prod = catalog.find((p) => p.sku === o.product_id);
    let playerPayload = {};
    try {
      playerPayload = typeof o.player_payload === 'string' ? JSON.parse(o.player_payload) : (o.player_payload || {});
    } catch {
      playerPayload = {};
    }

    let status = 'processing';
    if (o.status === 'succeeded' || o.status === 'completed') status = 'completed';
    else if (o.status === 'failed') {
      status = o.failure_code === 'REFUNDED_BY_PROVIDER' ? 'refunded' : 'failed';
    }
    else if (o.status === 'cancelled') status = 'cancelled';
    else if (o.status === 'held' || o.status === 'processing') {
      status = o.failure_code === 'ORPHANED' ? 'orphaned' : 'processing';
    }

    return {
      id: o.id,
      user_id: o.user_id,
      product_id: o.product_id,
      product_name: prod ? prod.name : (o.product_id || 'Recarga Gamer'),
      game: prod ? prod.game : 'Juegos Online',
      amount_cents: Number(o.price_minor || 0),
      custom_pvp_cents: playerPayload.custom_pvp_cents ? Number(playerPayload.custom_pvp_cents) : null,
      currency: o.currency || 'USD',
      player_id: playerPayload.id || null,
      player_name: playerPayload.name || null,
      player_server: playerPayload.server || playerPayload.zoneId || null,
      status,
      operator_name: o.operator_name || null,
      failure_code: status === 'completed' ? null : (o.failure_code || null),
      last_error_message: o.last_error_message || null,
      digital_code: o.digital_code || null,
      redeem_instructions: o.redeem_instructions || prod?.redeem_instructions || null,
      created_at: o.created_at,
    };
  },

  async getGlobalOrders() {
    const orders = await orderRepository.getGlobalOrders();
    let catalog = [];
    try {
      catalog = await catalogService.getCatalog();
    } catch {
      catalog = [];
    }

    const userIds = [...new Set(orders.map((o) => o.user_id).filter(Boolean))];
    const profilesMap = {};
    if (userIds.length > 0 && isSupabaseConfigured) {
      try {
        // profiles no contiene email — obtenemos full_name de profiles y email de auth.users
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        if (profiles) {
          for (const p of profiles) {
            profilesMap[p.id] = { ...p, email: null };
          }
        }
        // Enriquecer con email desde auth.users (listUsers devuelve hasta 1000 por llamada)
        try {
          const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
          if (authData?.users) {
            for (const u of authData.users) {
              if (profilesMap[u.id] !== undefined) {
                profilesMap[u.id].email = u.email || null;
              }
            }
          }
        } catch (authErr) {
          console.warn('[orderService] No se pudo obtener emails de auth.users:', authErr?.message);
        }
      } catch (profErr) {
        console.warn('[orderService] Error consultando perfiles para getGlobalOrders:', profErr?.message);
      }
    }

    return orders.map((o) => {
      const prod = catalog.find((p) => p.sku === o.product_id);
      let playerPayload = {};
      try {
        playerPayload = typeof o.player_payload === 'string' ? JSON.parse(o.player_payload) : (o.player_payload || {});
      } catch {
        playerPayload = {};
      }

      let status = 'processing';
      if (o.status === 'succeeded' || o.status === 'completed') status = 'completed';
      else if (o.status === 'failed') {
        status = o.failure_code === 'REFUNDED_BY_PROVIDER' ? 'refunded' : 'failed';
      }
      else if (o.status === 'cancelled') status = 'cancelled';
      else if (o.status === 'held' || o.status === 'processing') {
        status = o.failure_code === 'ORPHANED' ? 'orphaned' : 'processing';
      }

      const userProf = profilesMap[o.user_id] || {};

      return {
        id: o.id,
        user_id: o.user_id,
        user_email: userProf.email || 'Cliente Anónimo',
        user_name: userProf.full_name || null,
        product_id: o.product_id,
        product_name: prod ? prod.name : (o.product_id || 'Recarga Gamer'),
        game: prod ? prod.game : 'Juegos Online',
        amount_cents: Number(o.price_minor || o.amount_cents || 0),
        wholesale_cents: prod?.wholesale_cents || 0,
        currency: o.currency || 'USD',
        player_id: playerPayload.id || playerPayload.playerId || null,
        player_name: playerPayload.name || playerPayload.playerName || null,
        player_server: playerPayload.server || playerPayload.zoneId || null,
        status,
        operator_name: o.operator_name || null,
        failure_code: status === 'completed' ? null : (o.failure_code || null),
        last_error_message: o.last_error_message || null,
        digital_code: o.digital_code || null,
        redeem_instructions: o.redeem_instructions || prod?.redeem_instructions || null,
        created_at: o.created_at,
      };
    });
  },

  /**
   * Reintenta el despacho de una orden fallida o en espera de saldo
   */
  async retryOrder(orderId) {
    if (!isSupabaseConfigured) {
      return { success: false, message: 'Supabase no configurado' };
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      const err = new Error('Orden no encontrada');
      err.status = 404;
      throw err;
    }

    // Protección crucial: Si ya fue completada exitosamente, no reintentar
    if (order.status === 'succeeded' || order.status === 'completed') {
      return {
        success: true,
        message: 'Esta orden ya fue completada y entregada con éxito.',
        order,
      };
    }

    // Resetear orden a estado de retención lista para despachar
    await supabaseAdmin
      .from('orders')
      .update({
        status: 'held',
        failure_code: null,
        last_error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    // Reactivar o insertar purchase_job
    const { data: existingJob } = await supabaseAdmin
      .from('purchase_jobs')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existingJob) {
      await supabaseAdmin
        .from('purchase_jobs')
        .update({
          state: 'ready',
          lease_token: null,
          lease_expires_at: null,
          attempts: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingJob.id);
    } else {
      await supabaseAdmin
        .from('purchase_jobs')
        .insert({
          order_id: orderId,
          state: 'ready',
          attempts: 0,
        });
    }

    return {
      success: true,
      message: 'Orden encolada para despacho inmediato.',
    };
  },
};


