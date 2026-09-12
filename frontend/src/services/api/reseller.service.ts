import { apiClient } from './client';
import {
  PaymentMethod,
  DepositRequest,
  SystemStatus,
  AccountingBook,
  CustomPrice,
  RewardsResponse,
  ReferralInfo,
} from '../../types';

export const resellerService = {
  /**
   * Obtiene la salud del sistema y estado de reposición de inventario
   */
  async getSystemStatus(): Promise<SystemStatus> {
    return apiClient<SystemStatus>('/system/status');
  },

  /**
   * Obtiene las cuentas bancarias y cripto autorizadas
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return apiClient<PaymentMethod[]>('/payment-methods');
  },

  /**
   * Envía una solicitud de depósito con voucher comprobante
   */
  async submitDeposit(payload: {
    paymentMethodId?: string;
    bankName: string;
    amount: number; // en dólares, ej 25.50
    referenceNumber: string;
    voucherUrl: string; // Data URL WebP comprimido
  }): Promise<{ success: boolean; message: string; data: DepositRequest }> {
    return apiClient<{ success: boolean; message: string; data: DepositRequest }>('/wallet/deposits', {
      method: 'POST',
      body: JSON.stringify({
        paymentMethodId: payload.paymentMethodId,
        bankName: payload.bankName,
        amount: payload.amount,
        referenceNumber: payload.referenceNumber,
        voucherUrl: payload.voucherUrl,
      }),
    });
  },

  /**
   * Historial de depósitos del revendedor
   */
  async getMyDeposits(): Promise<DepositRequest[]> {
    return apiClient<DepositRequest[]>('/wallet/deposits');
  },

  /**
   * Lista de precios de venta personalizados (PVP)
   */
  async getCustomPrices(): Promise<CustomPrice[]> {
    return apiClient<CustomPrice[]>('/reseller/prices');
  },

  /**
   * Actualiza el PVP de un producto
   */
  async setCustomPrice(sku: string, pvpUsd: number): Promise<{ success: boolean; data: any }> {
    return apiClient<{ success: boolean; data: any }>('/reseller/prices', {
      method: 'POST',
      body: JSON.stringify({
        sku,
        pvp_usd: pvpUsd,
      }),
    });
  },

  /**
   * Mi Libro Contable (Métricas de ventas, costos mayoristas y ganancia neta)
   */
  async getAccountingBook(): Promise<AccountingBook> {
    return apiClient<AccountingBook>('/reseller/accounting');
  },

  /**
   * Progreso de metas y recompensas modulares
   */
  async getRewards(): Promise<RewardsResponse> {
    return apiClient<RewardsResponse>('/reseller/rewards');
  },

  /**
   * Información del programa de referidos y enlace de invitación
   */
  async getReferralInfo(): Promise<ReferralInfo> {
    return apiClient<ReferralInfo>('/reseller/referrals');
  },

  /**
   * Promociones activas para la barra y catálogo
   */
  async getPromotions(): Promise<any[]> {
    return apiClient<any[]>('/promotions');
  },
};

