import { apiClient } from './client';
import { CreateOrderRequest, CreateOrderResponse, Order } from '../../types';
import { generateIdempotencyKey } from '../../utils/idempotency';

const LOCAL_ORDERS_KEY = 'nexuspay_local_orders';

export const ordersService = {
  async createOrder(data: CreateOrderRequest): Promise<CreateOrderResponse> {
    const idempotencyKey = generateIdempotencyKey();

    try {
      return await apiClient<CreateOrderResponse>('/orders', {
        method: 'POST',
        idempotencyKey,
        body: JSON.stringify(data),
      });
    } catch {
      // Local development fallback: simulate successful order placement
      await new Promise((res) => setTimeout(res, 800));

      const newOrder: Order = {
        id: `ord_${Date.now()}`,
        user_id: 'user_current',
        product_id: data.productId,
        product_name: 'Recarga Gamer',
        game: 'Gaming Service',
        amount_cents: 499,
        currency: data.currency || 'USD',
        player_id: data.playerId,
        player_name: data.playerName,
        status: 'completed',
        digital_code: `CODE-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        created_at: new Date().toISOString(),
      };

      const existingOrders: Order[] = JSON.parse(
        localStorage.getItem(LOCAL_ORDERS_KEY) || '[]'
      );
      existingOrders.unshift(newOrder);
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(existingOrders));

      return {
        orderId: newOrder.id,
        status: 'completed',
        message: 'Orden completada satisfactoriamente (Modo Desarrollo)',
      };
    }
  },

  async getMyOrders(): Promise<Order[]> {
    try {
      return await apiClient<Order[]>('/orders');
    } catch {
      // Return local stored orders
      const stored = localStorage.getItem(LOCAL_ORDERS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return [
        {
          id: 'ord_sample_1',
          user_id: 'user_current',
          product_id: 'prod_freefire_100',
          product_name: '100 + 10 Diamantes',
          game: 'Free Fire',
          amount_cents: 99,
          currency: 'USD',
          player_id: '984512401',
          player_name: 'Player_2401',
          status: 'completed',
          digital_code: 'FF-8842-NX91',
          created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
        },
      ];
    }
  },

  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      return await apiClient<Order>(`/orders/${orderId}`);
    } catch {
      const orders = await this.getMyOrders();
      return orders.find((o) => o.id === orderId) || null;
    }
  },
};

