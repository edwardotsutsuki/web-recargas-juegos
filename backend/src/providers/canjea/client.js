/**
 * Adaptador oficial para la API B2B de Canjea (https://docs.canjea.me/)
 * Versión de contrato: 2026-09-01
 * 
 * Reglas críticas:
 * - Autenticación: Bearer ck_live_...
 * - No existe sandbox en Canjea; las recargas son reales.
 * - POST /orders: Timeout >= 60s. Mirar external_id_reusable ante errores.
 * - POST /verify-player: Timeout >= 30s. Maneja 4 resultados en HTTP 200.
 */

export class CanjeaError extends Error {
  constructor(status, code, message, externalIdReusable = false, detail = null) {
    super(message);
    this.name = 'CanjeaError';
    this.status = status;
    this.code = code;
    this.externalIdReusable = externalIdReusable;
    this.detail = detail;
  }
}

export class CanjeaClient {
  constructor(config = {}) {
    this.baseUrl = (config.baseUrl || process.env.CANJEA_BASE_URL || 'https://api.canjea.me/api/v1').replace(/\/$/, '');
    this.apiKey = (config.apiKey || process.env.CANJEA_API_KEY || '').trim();
    this.timeoutCatalogMs = Number(config.timeoutCatalogMs || 10000);
    this.timeoutVerifyMs = Number(config.timeoutVerifyMs || 30000);
    this.timeoutOrderMs = Number(config.timeoutOrderMs || 65000);

    this.isConfigured = Boolean(
      this.apiKey &&
      this.apiKey !== 'replace-me-server-only' &&
      this.apiKey.startsWith('ck_live_')
    );
  }

  async _fetch(endpoint, options = {}, timeoutMs = 15000) {
    const url = `${this.baseUrl}/${endpoint.replace(/^\//, '')}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...(options.headers || {}),
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const code = data?.code || `HTTP_${response.status}`;
        const message = data?.message || `Error en proveedor Canjea (${response.status})`;
        const externalIdReusable = Boolean(data?.external_id_reusable);
        const detail = data?.detail || null;

        throw new CanjeaError(response.status, code, message, externalIdReusable, detail);
      }

      return data;
    } catch (err) {
      if (err.name === 'AbortError') {
        // En POST /orders un timeout no garantiza fallo: externalIdReusable = false
        throw new CanjeaError(
          504,
          'TIMEOUT',
          `Timeout de conexión con Canjea (${timeoutMs}ms agotados)`,
          false
        );
      }
      if (err instanceof CanjeaError) throw err;
      throw new CanjeaError(0, 'NETWORK_ERROR', err.message, false);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Consulta el saldo disponible de la cuenta en Canjea.
   * GET /balance
   */
  async getBalance() {
    if (!this.isConfigured) {
      return { ok: true, balance: '100.00', currency: 'USD', simulated: true };
    }
    return this._fetch('/balance', { method: 'GET' }, this.timeoutCatalogMs);
  }

  /**
   * Obtiene todo el catálogo de productos.
   * GET /catalog
   */
  async getCatalog() {
    if (!this.isConfigured) {
      return {
        ok: true,
        currency: 'USD',
        products: [
          {
            sku: 'ff100',
            name: '100 + 10 Diamantes',
            game: 'ff',
            game_name: 'Free Fire',
            price: '0.99',
            suggested_retail_price: '1.20',
            price_is_estimated: false,
            price_is_estimated_reason: null,
            currency: 'USD',
            requires_player_id: true,
            can_verify_player: true,
          },
          {
            sku: 'ff520',
            name: '520 Diamantes',
            game: 'ff',
            game_name: 'Free Fire',
            price: '4.95',
            suggested_retail_price: '5.90',
            price_is_estimated: false,
            price_is_estimated_reason: null,
            currency: 'USD',
            requires_player_id: true,
            can_verify_player: true,
          },
          {
            sku: 'codm420',
            name: '420 CP (COD Points)',
            game: 'codm',
            game_name: 'Call of Duty: Mobile',
            price: '5.40',
            suggested_retail_price: '6.50',
            price_is_estimated: true,
            price_is_estimated_reason: 'proveedor_sin_consulta_en_vivo',
            currency: 'USD',
            requires_player_id: true,
            can_verify_player: true,
          },
          {
            sku: 'stm10',
            name: 'Tarjeta de Regalo Steam $10 USD',
            game: 'steam',
            game_name: 'Steam',
            price: '10.20',
            suggested_retail_price: '11.50',
            price_is_estimated: false,
            price_is_estimated_reason: null,
            currency: 'USD',
            requires_player_id: false,
            can_verify_player: false,
          },
        ],
        simulated: true,
      };
    }
    return this._fetch('/catalog', { method: 'GET' }, this.timeoutCatalogMs);
  }

  /**
   * Obtiene un producto puntual con costo consultado en vivo.
   * GET /catalog/{sku}
   */
  async getCatalogSku(sku) {
    if (!this.isConfigured) {
      const cat = await this.getCatalog();
      const p = cat.products.find((prod) => prod.sku === sku);
      if (!p) throw new CanjeaError(404, 'SKU_NOT_FOUND', 'Producto no encontrado');
      return { ok: true, product: p, simulated: true };
    }
    return this._fetch(`/catalog/${encodeURIComponent(sku)}`, { method: 'GET' }, 8000);
  }

  /**
   * Verifica la cuenta de un jugador antes de cobrar.
   * POST /verify-player
   * Timeout alto (30s): IDs inexistentes pueden tardar hasta 20s.
   * Resultados en 200: 'VERIFIED' | 'INVALID_ID' | 'NAME_NOT_CONFIRMED' | 'SIN_VERIFIEDR'
   */
  async verifyPlayer({ sku, playerId, server = null, zoneId = null }) {
    if (!playerId) {
      throw new CanjeaError(400, 'PLAYER_ID_REQUIRED', 'Falta el id de jugador', true);
    }

    if (!this.isConfigured) {
      // Simulación local sin clave real
      await new Promise((r) => setTimeout(r, 800));
      if (playerId.length < 4) {
        return {
          ok: true,
          result: 'INVALID_ID',
          message: 'El ID de cuenta no existe en los servidores del juego.',
          player: { id: playerId },
          simulated: true,
        };
      }
      return {
        ok: true,
        result: 'VERIFIED',
        player: { id: playerId, name: `Gamer_${playerId.slice(-4).toUpperCase()}` },
        simulated: true,
      };
    }

    const payload = {
      sku,
      player: {
        id: String(playerId),
        ...(server ? { server } : {}),
        ...(zoneId ? { zone_id: zoneId } : {}),
      },
    };

    return this._fetch('/verify-player', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, this.timeoutVerifyMs);
  }

  /**
   * Ejecuta la compra de recarga o código digital.
   * POST /orders
   * Timeout crítico >= 60s.
   * 
   * @param {Object} params
   * @param {string} params.sku - SKU del catálogo
   * @param {string} params.externalId - Referencia única de la orden en nuestro sistema (1-80 chars)
   * @param {string} [params.expectedPrice] - Precio de protección en formato decimal "4.95"
   * @param {Object} [params.player] - { id, server } si requires_player_id
   */
  async createOrder({ sku, externalId, expectedPrice = null, player = null }) {
    if (!sku || !externalId) {
      throw new CanjeaError(400, 'INVALID_PARAMETER', 'sku y externalId son obligatorios', true);
    }

    if (!this.isConfigured) {
      // Simulación local
      await new Promise((r) => setTimeout(r, 1200));
      return {
        ok: true,
        order: {
          external_id: externalId,
          sku,
          status: 'COMPLETED',
          price: expectedPrice || '4.95',
          currency: 'USD',
          redeem_code: player ? null : `RA-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          remaining_balance: '95.05',
        },
        simulated: true,
      };
    }

    const payload = {
      sku,
      external_id: externalId,
      ...(expectedPrice ? { expected_price: String(expectedPrice) } : {}),
      ...(player ? { player } : {}),
    };

    return this._fetch('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, this.timeoutOrderMs);
  }

  /**
   * Consulta el estado de una orden ante timeout o incertidumbre.
   * GET /orders/{external_id}
   */
  async getOrder(externalId) {
    if (!this.isConfigured) {
      return {
        ok: true,
        order: {
          external_id: externalId,
          status: 'COMPLETED',
          simulated: true,
        },
      };
    }

    return this._fetch(`/orders/${encodeURIComponent(externalId)}`, {
      method: 'GET',
    }, 15000);
  }
}

export const canjeaClient = new CanjeaClient();

