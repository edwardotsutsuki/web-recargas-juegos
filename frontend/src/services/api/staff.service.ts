import { apiClient } from './client';

export interface StoreOperator {
  name: string;
  isMaster: boolean;
  role?: string;
}

export interface StoreOperatorsResponse {
  storeId?: string;
  storeName: string;
  storeSlug: string;
  operators: StoreOperator[];
}

export interface TerminalLoginResponse {
  token: string;
  isCashier: boolean;
  operatorName: string;
  storeSlug: string;
  storeName: string;
  user: {
    id: string;
    email: string;
    role: 'client' | 'admin';
    fullName: string;
  };
}

export interface ResellerStaffMember {
  id: string;
  reseller_id: string;
  operator_name: string;
  pin_code: string;
  role: 'cashier' | 'admin';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ResellerStaffSettingsResponse {
  storeSlug: string;
  masterPin: string;
  staff: ResellerStaffMember[];
}

export const staffService = {
  /**
   * Obtiene la lista pública de operadores disponibles para un local
   */
  async getStoreOperators(storeSlug: string): Promise<StoreOperatorsResponse> {
    return apiClient<StoreOperatorsResponse>('/auth/terminal-operators', {
      method: 'POST',
      body: JSON.stringify({ storeSlug }),
    });
  },

  /**
   * Autenticación rápida de terminal POS mediante PIN
   */
  async terminalLogin(params: {
    storeSlug: string;
    operatorName: string;
    pinCode: string;
  }): Promise<TerminalLoginResponse> {
    return apiClient<TerminalLoginResponse>('/auth/terminal-login', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /**
   * Obtiene el listado de personal y la configuración del local (Solo Dueño)
   */
  async getMyStaff(): Promise<ResellerStaffSettingsResponse> {
    return apiClient<ResellerStaffSettingsResponse>('/reseller/staff', {
      method: 'GET',
    });
  },

  /**
   * Guarda o actualiza un operador / cajero
   */
  async saveStaff(data: {
    id?: string;
    operatorName: string;
    pinCode: string;
    role?: string;
    isActive?: boolean;
  }): Promise<ResellerStaffMember> {
    return apiClient<ResellerStaffMember>('/reseller/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Elimina un operador / cajero
   */
  async deleteStaff(staffId: string): Promise<{ success: boolean }> {
    return apiClient<{ success: boolean }>(`/reseller/staff/${staffId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Actualiza el identificador de tienda (storeSlug) y PIN maestro del dueño
   */
  async updateStoreSettings(data: {
    storeSlug: string;
    masterPin: string;
  }): Promise<{ success: boolean; storeSlug: string; masterPin: string }> {
    return apiClient<{ success: boolean; storeSlug: string; masterPin: string }>('/reseller/store-settings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Valida el PIN maestro del dueño en el servidor
   */
  async verifyMasterPin(pin: string): Promise<{ success: boolean }> {
    return apiClient<{ success: boolean }>('/auth/verify-master-pin', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  },
};
