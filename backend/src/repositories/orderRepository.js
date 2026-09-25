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
    operatorName = null,
  }) {
    if (!isSupabaseConfigured) {
      return {
        success: true,
        idempotent_replay: false,
        order_id: `ord_${Date.now()}`,
        status: 'held',
        price_minor: priceMinor,
        operator_name: operatorName,
      };
    }

    try {
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

      if (!error && data) {
        if (operatorName && data.order_id) {
          supabaseAdmin
            .from('orders')
            .update({ operator_name: operatorName })
            .eq('id', data.order_id)
            .then(() => {})
            .catch(() => {});
        }
        return data;
      }
      if (error && (error.code === 'P0001' || error.code === '23505')) {
        throw error;
      }
      console.warn('[orderRepository] RPC reserve_purchase falló, usando reserva atómica directa:', error?.message);
    } catch (rpcErr) {
      if (rpcErr.code === 'P0001' || rpcErr.code === '23505') throw rpcErr;
      console.warn('[orderRepository] Error RPC reserve_purchase:', rpcErr.message);
    }

    // --- Reserva atómica directa en Node contra Supabase ---
    // 1. Idempotencia
    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existingOrder) {
      if (existingOrder.request_fingerprint !== requestFingerprint) {
        const err = new Error('Conflicto: Clave de idempotencia ya usada con otro payload.');
        err.code = '23505';
        err.status = 409;
        throw err;
      }
      return {
        success: true,
        idempotent_replay: true,
        order_id: existingOrder.id,
        status: existingOrder.status,
        price_minor: existingOrder.price_minor,
      };
    }

    // 2. Validar billetera y saldo disponible
    const { data: wallet, error: wErr } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('currency', currency)
      .single();

    if (wErr || !wallet) {
      const err = new Error(`El usuario no tiene una billetera en moneda ${currency}`);
      err.code = 'P0002';
      err.status = 404;
      throw err;
    }

    const available = Number(wallet.available_minor ?? (Number(wallet.balance_minor) - Number(wallet.held_minor || 0)));
    if (available < Number(priceMinor)) {
      const err = new Error('Saldo virtual disponible insuficiente.');
      err.code = 'P0001';
      err.status = 422;
      throw err;
    }

    // 3. Crear orden en estado 'held'
    const { data: newOrder, error: orderInsertErr } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId,
        wallet_id: wallet.id,
        currency,
        provider,
        product_id: productId,
        player_payload: playerPayload || {},
        price_minor: priceMinor,
        idempotency_key: idempotencyKey,
        request_fingerprint: requestFingerprint,
        status: 'held',
        operator_name: operatorName || null,
      })
      .select()
      .single();

    if (orderInsertErr) throw orderInsertErr;

    // 4. Retener fondos en la billetera
    const newHeld = Number(wallet.held_minor || 0) + Number(priceMinor);
    const { error: wUpdErr } = await supabaseAdmin
      .from('wallets')
      .update({
        held_minor: newHeld,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id);

    if (wUpdErr) throw wUpdErr;

    // 5. Registrar transacción inmutable con todas las columnas requeridas
    try {
      await supabaseAdmin.from('transactions').insert({
        wallet_id: wallet.id,
        user_id: userId,
        currency,
        order_id: newOrder.id,
        kind: 'hold',
        amount_minor: priceMinor,
        balance_before_minor: wallet.balance_minor,
        balance_after_minor: wallet.balance_minor,
        held_before_minor: wallet.held_minor || 0,
        held_after_minor: newHeld,
        balance_delta_minor: 0,
        held_delta_minor: priceMinor,
        idempotency_key: `${idempotencyKey}_hold`,
        source: 'purchase_flow',
        reason: `Retención preventiva por orden ${newOrder.id}`,
      });
    } catch (txErr) {
      console.warn('[orderRepository] Transacción hold insert:', txErr.message);
    }

    // 6. Despachar a la cola purchase_jobs
    try {
      await supabaseAdmin.from('purchase_jobs').insert({
        order_id: newOrder.id,
        state: 'ready',
        attempts: 0,
      });
    } catch (jobErr) {
      console.warn('[orderRepository] purchase_jobs insert:', jobErr.message);
    }

    return {
      success: true,
      idempotent_replay: false,
      order_id: newOrder.id,
      status: 'held',
      price_minor: priceMinor,
      wallet_available_minor: Number(wallet.balance_minor) - newHeld,
    };
  },

  async settlePurchase({
    orderId,
    leaseToken,
    outcome,
    providerReference = null,
    failureCode = null,
    digitalCode = null,
    redeemInstructions = null,
  }) {
    if (!isSupabaseConfigured) {
      return {
        success: true,
        order_id: orderId,
        status: outcome,
      };
    }

    try {
      const { data, error } = await supabaseAdmin.rpc('settle_purchase', {
        p_order_id: orderId,
        p_lease_token: leaseToken,
        p_outcome: outcome,
        p_provider_reference: providerReference,
        p_failure_code: failureCode,
        p_digital_code: digitalCode,
      });

      if (!error && data) {
        if (digitalCode || redeemInstructions) {
          await supabaseAdmin.from('orders').update({
            ...(digitalCode ? { digital_code: digitalCode } : {}),
            ...(redeemInstructions ? { redeem_instructions: redeemInstructions } : {}),
          }).eq('id', orderId);
        }
        return data;
      }
      console.warn('[orderRepository] RPC settle_purchase falló, usando liquidación directa:', error?.message);
    } catch (rpcErr) {
      console.warn('[orderRepository] Error RPC settle_purchase:', rpcErr.message);
    }

    // Fallback de liquidación directa
    const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', orderId).single();
    if (!order) return { success: false, message: 'Orden no encontrada' };

    const { data: wallet } = await supabaseAdmin.from('wallets').select('*').eq('id', order.wallet_id).single();
    if (!wallet) return { success: false, message: 'Billetera no encontrada' };

    if (outcome === 'succeeded') {
      const newBalance = Math.max(0, Number(wallet.balance_minor) - Number(order.price_minor));
      const newHeld = Math.max(0, Number(wallet.held_minor || 0) - Number(order.price_minor));

      await supabaseAdmin.from('wallets').update({
        balance_minor: newBalance,
        held_minor: newHeld,
        updated_at: new Date().toISOString(),
      }).eq('id', wallet.id);

      await supabaseAdmin.from('orders').update({
        status: 'succeeded',
        provider_reference: providerReference || orderId,
        digital_code: digitalCode || null,
        redeem_instructions: redeemInstructions || null,
        finalized_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', orderId);

      await supabaseAdmin.from('purchase_jobs').update({
        state: 'done',
        lease_token: null,
      }).eq('order_id', orderId);

      try {
        await supabaseAdmin.from('transactions').insert({
          wallet_id: wallet.id,
          user_id: order.user_id,
          currency: order.currency,
          order_id: orderId,
          kind: 'capture',
          amount_minor: order.price_minor,
          balance_before_minor: wallet.balance_minor,
          balance_after_minor: newBalance,
          held_before_minor: wallet.held_minor || 0,
          held_after_minor: newHeld,
          balance_delta_minor: -Number(order.price_minor),
          held_delta_minor: -Number(order.price_minor),
          idempotency_key: `${order.idempotency_key}_capture`,
          source: 'purchase_settlement',
          external_reference: providerReference || orderId,
          reason: digitalCode || 'Compra exitosa acreditada al jugador',
        });
      } catch {}
    } else if (outcome === 'failed') {
      const newHeld = Math.max(0, Number(wallet.held_minor || 0) - Number(order.price_minor));

      await supabaseAdmin.from('wallets').update({
        held_minor: newHeld,
        updated_at: new Date().toISOString(),
      }).eq('id', wallet.id);

      await supabaseAdmin.from('orders').update({
        status: 'failed',
        failure_code: failureCode,
        finalized_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', orderId);

      await supabaseAdmin.from('purchase_jobs').update({
        state: 'done',
        last_error_code: failureCode,
        lease_token: null,
      }).eq('order_id', orderId);

      try {
        await supabaseAdmin.from('transactions').insert({
          wallet_id: wallet.id,
          user_id: order.user_id,
          currency: order.currency,
          order_id: orderId,
          kind: 'release',
          amount_minor: order.price_minor,
          balance_before_minor: wallet.balance_minor,
          balance_after_minor: wallet.balance_minor,
          held_before_minor: wallet.held_minor || 0,
          held_after_minor: newHeld,
          balance_delta_minor: 0,
          held_delta_minor: -Number(order.price_minor),
          idempotency_key: `${order.idempotency_key}_release`,
          source: 'purchase_settlement',
          external_reference: providerReference || orderId,
          reason: `Liberación por compra rechazada: ${failureCode || 'Rechazo'}`,
        });
      } catch {}
    }

    return { success: true, order_id: orderId, status: outcome };
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
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },
};

