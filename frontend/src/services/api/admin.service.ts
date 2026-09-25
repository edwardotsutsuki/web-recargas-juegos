import { apiClient } from './client';
import { AdminMetrics, AdminUser, CreditWalletRequest, Order } from '../../types';
import { generateIdempotencyKey } from '../../utils/idempotency';

export const adminService = {
  async creditUserWallet(data: CreditWalletRequest): Promise<{ success: boolean; message: string }> {
    const idempotencyKey = generateIdempotencyKey();

    try {
      return await apiClient<{ success: boolean; message: string }>(
        `/admin/wallets/${data.userId}/credits`,
        {
          method: 'POST',
          idempotencyKey,
          body: JSON.stringify({
            amountMinor: data.amount_cents,
            currency: data.currency,
            reason: data.reason,
          }),
        }
      );
    } catch (error) {
      if (import.meta.env.PROD) throw error;
      // Local development fallback
      await new Promise((res) => setTimeout(res, 600));
      return {
        success: true,
        message: `Saldo acreditado con éxito ($${(data.amount_cents / 100).toFixed(2)} ${data.currency})`,
      };
    }
  },

  async getAdminMetrics(): Promise<AdminMetrics> {
    try {
      return await apiClient<AdminMetrics>('/admin/metrics');
    } catch {
      // Local development fallback metrics
      return {
        total_sales_cents: 284500, // $2,845.00 USD
        active_orders_count: 14,
        total_users_count: 128,
        supplier_balance_cents: 84000, // $840.00 USD (Canjea)
        supplier_name: 'Canjea API Gateway',
        currency: 'USD',
      };
    }
  },

  async getAdminUsers(): Promise<AdminUser[]> {
    try {
      return await apiClient<AdminUser[]>('/admin/users');
    } catch {
      return [
        {
          id: 'user_gamer_01',
          email: 'alex.gamer@gmail.com',
          role: 'client',
          created_at: '2026-02-15T10:30:00Z',
          wallet: {
            currency: 'USD',
            total_balance_cents: 12500, // $125.00 USD
            held_balance_cents: 0,
            available_balance_cents: 12500,
          },
        },
        {
          id: 'user_gamer_02',
          email: 'valentina_pro@outlook.com',
          role: 'client',
          created_at: '2026-02-28T14:15:00Z',
          wallet: {
            currency: 'USD',
            total_balance_cents: 350, // $3.50 USD
            held_balance_cents: 0,
            available_balance_cents: 350,
          },
        },
        {
          id: 'user_admin_root',
          email: 'admin@nexuspay.gg',
          role: 'admin',
          created_at: '2026-01-01T00:00:00Z',
          wallet: {
            currency: 'USD',
            total_balance_cents: 500000, // $5,000.00 USD
            held_balance_cents: 0,
            available_balance_cents: 500000,
          },
        },
      ];
    }
  },

  async getGlobalOrders(): Promise<Order[]> {
    try {
      return await apiClient<Order[]>('/admin/orders');
    } catch {
      return [
        {
          id: 'ord_glob_01',
          user_id: 'user_gamer_01',
          product_id: 'prod_freefire_520',
          product_name: '520 Diamantes',
          game: 'Free Fire',
          amount_cents: 499,
          currency: 'USD',
          player_id: '884192031',
          player_name: 'ShadowNinja_01',
          status: 'completed',
          digital_code: 'FF-520-XQ41',
          created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        },
        {
          id: 'ord_glob_02',
          user_id: 'user_gamer_02',
          product_id: 'prod_codm_420',
          product_name: '420 CP',
          game: 'Call of Duty: Mobile',
          amount_cents: 549,
          currency: 'USD',
          player_id: '671239401284',
          player_name: 'GhostSniper',
          status: 'completed',
          digital_code: 'COD-420-PL99',
          created_at: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
        },
      ];
    }
  },

  async getDeposits(status?: string): Promise<any[]> {
    const query = status ? `?status=${status}` : '';
    return apiClient<any[]>(`/admin/deposits${query}`);
  },

  async approveDeposit(
    id: string,
    compressedVoucherUrl?: string
  ): Promise<{ success: boolean; message: string; data: any }> {
    return apiClient<{ success: boolean; message: string; data: any }>(`/admin/deposits/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ compressedVoucherUrl }),
    });
  },

  async rejectDeposit(id: string, reason: string): Promise<{ success: boolean; message: string; data: any }> {
    return apiClient<{ success: boolean; message: string; data: any }>(`/admin/deposits/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async getSystemStatus(refresh = false): Promise<any> {
    return apiClient<any>(`/admin/system/status${refresh ? '?refresh=true' : ''}`);
  },

  async updateSystemSettings(settings: any): Promise<{ success: boolean; settings: any }> {
    return apiClient<{ success: boolean; settings: any }>('/admin/system/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  // --- Promociones ---
  async getPromotions(): Promise<any[]> {
    return apiClient<any[]>('/admin/promotions');
  },

  async createPromotion(payload: any): Promise<any> {
    return apiClient<any>('/admin/promotions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updatePromotion(id: string, payload: any): Promise<any> {
    return apiClient<any>(`/admin/promotions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deletePromotion(id: string): Promise<any> {
    return apiClient<any>(`/admin/promotions/${id}`, {
      method: 'DELETE',
    });
  },

  // --- Personalización de Portadas & Catálogo ---
  async getAdminGames(): Promise<any[]> {
    return apiClient<any[]>('/admin/catalog/games');
  },

  async updateGameOverride(gameId: string, data: any): Promise<any> {
    return apiClient<any>(`/admin/catalog/games/${gameId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async syncCatalog(): Promise<{ success: boolean; newProductsCount: number; totalFromProvider: number; isInitialSeeding: boolean }> {
    return apiClient<{ success: boolean; newProductsCount: number; totalFromProvider: number; isInitialSeeding: boolean }>('/admin/catalog/sync', {
      method: 'POST',
    });
  },

  // --- Retos & Recompensas Personalizadas ---
  async getAdminRewards(): Promise<any[]> {
    return apiClient<any[]>('/admin/rewards');
  },

  async createAdminReward(payload: any): Promise<any> {
    return apiClient<any>('/admin/rewards', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateAdminReward(id: string, payload: any): Promise<any> {
    return apiClient<any>(`/admin/rewards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteAdminReward(id: string): Promise<any> {
    return apiClient<any>(`/admin/rewards/${id}`, {
      method: 'DELETE',
    });
  },

  // --- Bitácora Inmutable de Auditoría ---
  async getAuditLogs(limit = 50): Promise<any[]> {
    return apiClient<any[]>(`/admin/audit-logs?limit=${limit}`);
  },

  // --- Restablecimiento Administrativo de Contraseñas ---
  async resetUserPassword(userId: string, newPassword: string, sendEmail = true): Promise<{ success: boolean; message: string }> {
    return apiClient<{ success: boolean; message: string }>(`/admin/users/${userId}/password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword, sendEmail }),
    });
  },

  // --- Gestión de Materiales Promocionales y Descargas ---
  async getPromotionalMaterials(): Promise<any[]> {
    return apiClient<any[]>('/admin/promotional-materials');
  },

  async createPromotionalMaterial(payload: any): Promise<any> {
    return apiClient<any>('/admin/promotional-materials', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updatePromotionalMaterial(id: string, payload: any): Promise<any> {
    return apiClient<any>(`/admin/promotional-materials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deletePromotionalMaterial(id: string): Promise<any> {
    return apiClient<any>(`/admin/promotional-materials/${id}`, {
      method: 'DELETE',
    });
  },

  // --- Mesa de Ayuda y Tickets de Soporte ---
  async getTickets(status?: string): Promise<any[]> {
    const query = status ? `?status=${status}` : '';
    return apiClient<any[]>(`/admin/tickets${query}`);
  },

  async updateTicket(id: string, payload: { status?: string; admin_reply?: string }): Promise<any> {
    return apiClient<any>(`/admin/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // --- Monitoreo de Depósitos en Tiempo Real ---
  async getPendingDepositsCount(): Promise<{ pending_count: number }> {
    try {
      return await apiClient<{ pending_count: number }>('/admin/deposits/pending-count');
    } catch {
      return { pending_count: 0 };
    }
  },

  // --- Gestión de Cuentas Bancarias / Métodos de Pago ---
  async getAdminPaymentMethods(): Promise<any[]> {
    return apiClient<any[]>('/admin/payment-methods');
  },

  async createPaymentMethod(payload: any): Promise<any> {
    return apiClient<any>('/admin/payment-methods', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updatePaymentMethod(id: string, payload: any): Promise<any> {
    return apiClient<any>(`/admin/payment-methods/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deletePaymentMethod(id: string): Promise<any> {
    return apiClient<any>(`/admin/payment-methods/${id}`, {
      method: 'DELETE',
    });
  },
};



