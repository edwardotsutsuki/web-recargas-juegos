import { createHash } from 'node:crypto';
import { orderRepository } from '../repositories/orderRepository.js';
import { catalogService } from './catalogService.js';

export const orderService = {
  async createOrder({
    userId,
    sku,
    playerPayload = {},
    currency = 'USD',
    idempotencyKey,
  }) {
    if (!idempotencyKey) {
      const err = new Error('La cabecera Idempotency-Key es obligatoria.');
      err.status = 400;
      err.code = 'IDEMPOTENCY_KEY_REQUIRED';
      throw err;
    }

    // 1. Obtener precio confiable del catálogo (nunca del cliente)
    const product = await catalogService.getProductBySku(sku);
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
    return orderRepository.getUserOrders(userId);
  },

  async getOrderById(orderId, userId) {
    return orderRepository.getOrderById(orderId, userId);
  },

  async getGlobalOrders() {
    return orderRepository.getGlobalOrders();
  },
};

