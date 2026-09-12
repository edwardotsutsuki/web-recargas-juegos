import crypto from 'node:crypto';
import { depositRepository } from '../repositories/depositRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { emailService } from './emailService.js';
import { supabaseAdmin, isSupabaseConfigured } from '../repositories/supabaseClient.js';

export const depositService = {
  /**
   * Métodos de pago autorizados (clientes)
   */
  async getPaymentMethods() {
    return depositRepository.getPaymentMethods();
  },

  /**
   * Métodos de pago / cuentas bancarias completas (admin)
   */
  async getAllPaymentMethodsAdmin() {
    return depositRepository.getAllPaymentMethodsAdmin();
  },

  /**
   * Crear nueva cuenta bancaria (admin)
   */
  async createPaymentMethod(data) {
    if (!data.bank_name || !data.account_number || !data.account_holder) {
      const err = new Error('Banco, número de cuenta y titular son requeridos.');
      err.status = 400;
      throw err;
    }
    return depositRepository.createPaymentMethod(data);
  },

  /**
   * Actualizar cuenta bancaria (admin)
   */
  async updatePaymentMethod(id, updates) {
    return depositRepository.updatePaymentMethod(id, updates);
  },

  /**
   * Eliminar cuenta bancaria (admin)
   */
  async deletePaymentMethod(id) {
    return depositRepository.deletePaymentMethod(id);
  },

  /**
   * Conteo rápido de depósitos pendientes de aprobación
   */
  async getPendingDepositsCount() {
    const deposits = await depositRepository.getAllDeposits({ status: 'pending' });
    return deposits ? deposits.length : 0;
  },

  /**
   * Registra una nueva solicitud de depósito con auditoría criptográfica
   */
  async submitDepositRequest({
    userId,
    paymentMethodId,
    bankName,
    amountCents,
    currency = 'USD',
    referenceNumber,
    voucherUrl,
  }) {
    if (!bankName || !referenceNumber || !voucherUrl) {
      const err = new Error('Los campos banco, número de comprobante y foto del voucher son requeridos.');
      err.status = 400;
      err.code = 'INVALID_DEPOSIT_DATA';
      throw err;
    }

    const cents = Number(amountCents);
    if (!cents || cents <= 0) {
      const err = new Error('El monto a depositar debe ser mayor a $0.00 USD.');
      err.status = 400;
      err.code = 'INVALID_AMOUNT';
      throw err;
    }

    // Calcular Hash SHA-256 para auditoría antifraude
    const voucherHash = crypto
      .createHash('sha256')
      .update(typeof voucherUrl === 'string' ? voucherUrl : JSON.stringify(voucherUrl))
      .digest('hex');

    const created = await depositRepository.createDepositRequest({
      userId,
      paymentMethodId,
      bankName: bankName.trim().toUpperCase(),
      amountCents: cents,
      currency,
      referenceNumber: referenceNumber.trim(),
      voucherUrl,
      voucherHash,
    });

    // Despacho asíncrono de notificaciones por correo (Cliente + Super Admin)
    (async () => {
      try {
        if (isSupabaseConfigured) {
          const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
          const clientEmail = authUserData?.user?.email;

          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .single();

          const clientName = profile?.full_name || clientEmail || 'Socio Revendedor';
          const amountUsd = (cents / 100).toFixed(2);
          const cleanRef = referenceNumber.trim();
          const cleanBank = bankName.trim().toUpperCase();

          // 1. Notificar al socio revendedor que su comprobante fue recibido
          if (clientEmail) {
            await emailService.sendDepositReceivedNotification({
              toEmail: clientEmail,
              recipientName: clientName,
              amountUsd,
              currency,
              referenceNumber: cleanRef,
              bankName: cleanBank,
            });
            console.log(`[DEPOSIT_EMAIL] Confirmación de comprobante enviada a socio "${clientEmail}"`);
          }

          // 2. Alertar al Super Admin sobre el nuevo depósito en cola
          const adminEmail = 'b.edumalta@gmail.com';
          await emailService.sendNewDepositAlertToAdmin({
            adminEmail,
            clientName,
            clientEmail: clientEmail || 'No disponible',
            amountUsd,
            currency,
            referenceNumber: cleanRef,
            bankName: cleanBank,
            depositId: created.id,
          });
          console.log(`[DEPOSIT_EMAIL] Alerta de nuevo depósito enviada a Super Admin "${adminEmail}"`);
        }
      } catch (err) {
        console.error('[DEPOSIT_EMAIL_ERROR] Error despachando correos de solicitud de saldo:', err.message);
      }
    })();

    return created;
  },

  /**
   * Depósitos del usuario actual
   */
  async getMyDeposits(userId) {
    return depositRepository.getMyDeposits(userId);
  },

  /**
   * Listado para administradores
   */
  async getAllDeposits(filters = {}) {
    return depositRepository.getAllDeposits(filters);
  },

  /**
   * Aprobación con acreditación automática
   */
  async approveDeposit({ requestId, adminId, compressedVoucherUrl = null }) {
    const deposit = await depositRepository.getDepositById(requestId);
    if (!deposit) {
      const err = new Error('Solicitud de depósito no encontrada.');
      err.status = 404;
      err.code = 'DEPOSIT_NOT_FOUND';
      throw err;
    }

    if (deposit.status !== 'pending') {
      const err = new Error(`La solicitud ya fue procesada (estado actual: ${deposit.status}).`);
      err.status = 400;
      err.code = 'DEPOSIT_ALREADY_PROCESSED';
      throw err;
    }

    // Si se envía una versión comprimida, computar su hash para trazabilidad
    let voucherHash = deposit.voucher_hash;
    if (compressedVoucherUrl) {
      voucherHash = crypto
        .createHash('sha256')
        .update(compressedVoucherUrl)
        .digest('hex');
    }

    const approved = await depositRepository.approveDeposit({
      requestId,
      adminId,
      compressedVoucherUrl: compressedVoucherUrl || deposit.voucher_url,
      voucherHash,
    });

    await auditRepository.logAction({
      adminId,
      action: 'approve_deposit',
      targetId: requestId,
      details: {
        amount_cents: deposit.amount_cents,
        currency: deposit.currency,
        user_id: deposit.user_id,
        reference_number: deposit.reference_number,
        bank_name: deposit.bank_name,
      },
    });

    // Despacho asíncrono de notificación por correo al cliente
    (async () => {
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(deposit.user_id);
        const toEmail = authUser?.user?.email;
        if (toEmail) {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('id', deposit.user_id)
            .single();

          await emailService.sendDepositStatusNotification({
            toEmail,
            recipientName: profile?.full_name || toEmail.split('@')[0],
            amountUsd: (deposit.amount_cents / 100).toFixed(2),
            currency: deposit.currency || 'USD',
            status: 'approved',
            referenceNumber: deposit.reference_number,
            bankName: deposit.bank_name,
          });
        }
      } catch (e) {
        console.error('[EMAIL_NOTIF_ERROR] Error al notificar aprobación de depósito:', e.message);
      }
    })();

    return approved;
  },

  /**
   * Rechazo de depósito con motivo
   */
  async rejectDeposit({ requestId, adminId, reason }) {
    const deposit = await depositRepository.getDepositById(requestId);
    if (!deposit) {
      const err = new Error('Solicitud de depósito no encontrada.');
      err.status = 404;
      err.code = 'DEPOSIT_NOT_FOUND';
      throw err;
    }

    if (deposit.status !== 'pending') {
      const err = new Error(`La solicitud ya fue procesada (estado actual: ${deposit.status}).`);
      err.status = 400;
      err.code = 'DEPOSIT_ALREADY_PROCESSED';
      throw err;
    }

    const rejected = await depositRepository.rejectDeposit({
      requestId,
      adminId,
      reason: reason || 'Comprobante no coincide con extracto bancario.',
    });

    await auditRepository.logAction({
      adminId,
      action: 'reject_deposit',
      targetId: requestId,
      details: {
        reason: reason || 'Comprobante no coincide con extracto bancario.',
        user_id: deposit.user_id,
        reference_number: deposit.reference_number,
        bank_name: deposit.bank_name,
      },
    });

    // Despacho asíncrono de notificación de rechazo por correo
    (async () => {
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(deposit.user_id);
        const toEmail = authUser?.user?.email;
        if (toEmail) {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('id', deposit.user_id)
            .single();

          await emailService.sendDepositStatusNotification({
            toEmail,
            recipientName: profile?.full_name || toEmail.split('@')[0],
            amountUsd: (deposit.amount_cents / 100).toFixed(2),
            currency: deposit.currency || 'USD',
            status: 'rejected',
            referenceNumber: deposit.reference_number,
            bankName: deposit.bank_name,
            reason: reason || 'Comprobante no coincide con extracto bancario.',
          });
        }
      } catch (e) {
        console.error('[EMAIL_NOTIF_ERROR] Error al notificar rechazo de depósito:', e.message);
      }
    })();

    return rejected;
  },
};

