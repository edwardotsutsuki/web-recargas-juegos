import { supabaseAdmin, isSupabaseConfigured } from './supabaseClient.js';

export const depositRepository = {
  /**
   * Obtiene todos los métodos de pago y cuentas bancarias activas.
   */
  async getPaymentMethods() {
    if (!isSupabaseConfigured) {
      return [
        {
          id: 'pm-pacifico',
          bank_name: 'BANCO DEL PACIFICO',
          account_type: 'Ahorros',
          account_number: '1060251921',
          account_holder: 'Kevin Guerrero',
          is_active: true,
          sort_order: 1,
        },
        {
          id: 'pm-guayaquil',
          bank_name: 'BANCO GUAYAQUIL',
          account_type: 'Ahorros',
          account_number: '47761641',
          account_holder: 'Kevin Guerrero',
          is_active: true,
          sort_order: 2,
        },
        {
          id: 'pm-pichincha',
          bank_name: 'BANCO PICHINCHA',
          account_type: 'Ahorros',
          account_number: '2200570913',
          account_holder: 'Kevin Guerrero',
          is_active: true,
          sort_order: 3,
        },
        {
          id: 'pm-binance',
          bank_name: 'BINANCE PAY (USDT)',
          account_type: 'Pay ID',
          account_number: '281449411',
          account_holder: 'XTREMEPLAY',
          is_active: true,
          sort_order: 4,
        },
        {
          id: 'pm-paypal',
          bank_name: 'PAYPAL',
          account_type: 'Transferencia USD',
          account_number: 'pagos@recargasjuegospro.cloud',
          account_holder: 'Recargas Juegos Online',
          is_active: true,
          sort_order: 5,
        },
      ];
    }

    const { data, error } = await supabaseAdmin
      .from('payment_methods')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Obtiene todas las cuentas bancarias (activas e inactivas) para administración.
   */
  async getAllPaymentMethodsAdmin() {
    if (!isSupabaseConfigured) {
      return this.getPaymentMethods();
    }

    const { data, error } = await supabaseAdmin
      .from('payment_methods')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Crea una nueva cuenta bancaria / método de pago.
   */
  async createPaymentMethod({ bank_name, account_type, account_number, account_holder, notes, is_active = true, sort_order = 0 }) {
    if (!isSupabaseConfigured) {
      return { id: 'pm-' + Date.now(), bank_name, account_type, account_number, account_holder, notes, is_active, sort_order };
    }

    const { data, error } = await supabaseAdmin
      .from('payment_methods')
      .insert({
        bank_name: bank_name.trim().toUpperCase(),
        account_type: account_type?.trim() || 'Ahorros',
        account_number: account_number.trim(),
        account_holder: account_holder.trim(),
        notes: notes?.trim() || null,
        is_active: Boolean(is_active),
        sort_order: Number(sort_order) || 0,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Actualiza una cuenta bancaria existente.
   */
  async updatePaymentMethod(id, updates) {
    if (!isSupabaseConfigured) {
      return { id, ...updates };
    }

    const payload = {
      updated_at: new Date().toISOString(),
    };

    if (updates.bank_name !== undefined) payload.bank_name = updates.bank_name.trim().toUpperCase();
    if (updates.account_type !== undefined) payload.account_type = updates.account_type.trim();
    if (updates.account_number !== undefined) payload.account_number = updates.account_number.trim();
    if (updates.account_holder !== undefined) payload.account_holder = updates.account_holder.trim();
    if (updates.notes !== undefined) payload.notes = updates.notes ? updates.notes.trim() : null;
    if (updates.is_active !== undefined) payload.is_active = Boolean(updates.is_active);
    if (updates.sort_order !== undefined) payload.sort_order = Number(updates.sort_order);

    const { data, error } = await supabaseAdmin
      .from('payment_methods')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Elimina una cuenta bancaria.
   */
  async deletePaymentMethod(id) {
    if (!isSupabaseConfigured) return { success: true };

    const { error } = await supabaseAdmin
      .from('payment_methods')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  },

  /**
   * Registra una nueva solicitud de depósito con comprobante (voucher).
   */
  async createDepositRequest({
    userId,
    paymentMethodId = null,
    bankName,
    amountCents,
    currency = 'USD',
    referenceNumber,
    voucherUrl,
    voucherHash = null,
  }) {
    if (!isSupabaseConfigured) {
      return {
        id: `mock-dep-${Date.now()}`,
        user_id: userId,
        bank_name: bankName,
        amount_cents: amountCents,
        currency,
        reference_number: referenceNumber,
        voucher_url: voucherUrl,
        voucher_hash: voucherHash,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
    }

    const { data, error } = await supabaseAdmin
      .from('deposit_requests')
      .insert({
        user_id: userId,
        payment_method_id: paymentMethodId,
        bank_name: bankName,
        amount_cents: amountCents,
        currency,
        reference_number: referenceNumber.trim(),
        voucher_url: voucherUrl,
        voucher_hash: voucherHash,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505' || error.message?.includes('unique_bank_reference')) {
        const err = new Error(
          `El número de comprobante o referencia "${referenceNumber}" ya fue registrado para ${bankName}. Verifica tus datos.`
        );
        err.status = 409;
        err.code = 'DUPLICATE_REFERENCE_NUMBER';
        throw err;
      }
      throw error;
    }

    return data;
  },

  /**
   * Obtiene el historial de depósitos de un revendedor específico.
   */
  async getMyDeposits(userId) {
    if (!isSupabaseConfigured) {
      return [];
    }

    const { data, error } = await supabaseAdmin
      .from('deposit_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Obtiene todas las solicitudes de depósito para el panel de administración.
   */
  async getAllDeposits({ status = null } = {}) {
    if (!isSupabaseConfigured) {
      return [];
    }

    let query = supabaseAdmin
      .from('deposit_requests')
      .select(`
        *,
        user:profiles!deposit_requests_user_id_fkey (
          id,
          role,
          full_name,
          phone,
          referral_code
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Obtiene una solicitud de depósito por ID.
   */
  async getDepositById(requestId) {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabaseAdmin
      .from('deposit_requests')
      .select(`
        *,
        user:profiles!deposit_requests_user_id_fkey (
          id,
          role,
          full_name,
          phone,
          referral_code
        )
      `)
      .eq('id', requestId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Aprueba una solicitud de depósito invocando el RPC atómico.
   */
  async approveDeposit({ requestId, adminId, compressedVoucherUrl = null, voucherHash = null }) {
    if (!isSupabaseConfigured) {
      return { success: true, request_id: requestId, status: 'approved' };
    }

    const { data, error } = await supabaseAdmin.rpc('approve_deposit_request', {
      p_request_id: requestId,
      p_admin_id: adminId,
      p_compressed_voucher_url: compressedVoucherUrl,
      p_voucher_hash: voucherHash,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Rechaza una solicitud de depósito invocando el RPC atómico.
   */
  async rejectDeposit({ requestId, adminId, reason }) {
    if (!isSupabaseConfigured) {
      return { success: true, request_id: requestId, status: 'rejected' };
    }

    const { data, error } = await supabaseAdmin.rpc('reject_deposit_request', {
      p_request_id: requestId,
      p_admin_id: adminId,
      p_reason: reason || 'Comprobante no válido o pago no reflejado en cuenta bancaria.',
    });

    if (error) throw error;
    return data;
  },
};

