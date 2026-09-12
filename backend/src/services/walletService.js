import { walletRepository } from '../repositories/walletRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';

export const walletService = {
  async getWallet(userId, currency = 'USD') {
    const wallet = await walletRepository.getWallet(userId, currency);
    return {
      currency: wallet.currency,
      total_balance_cents: Number(wallet.balance_minor || 0),
      held_balance_cents: Number(wallet.held_minor || 0),
      available_balance_cents: Number(wallet.available_minor || 0),
      updated_at: wallet.updated_at,
    };
  },

  async creditWallet({
    userId,
    amountMinor,
    currency = 'USD',
    idempotencyKey,
    reason,
    actorId = null,
  }) {
    if (!idempotencyKey) {
      const err = new Error('La cabecera Idempotency-Key es obligatoria para acreditar saldo.');
      err.status = 400;
      err.code = 'IDEMPOTENCY_KEY_REQUIRED';
      throw err;
    }

    if (!reason || reason.trim().length === 0) {
      const err = new Error('El motivo de la acreditación es obligatorio.');
      err.status = 400;
      err.code = 'REASON_REQUIRED';
      throw err;
    }

    const result = await walletRepository.creditWallet({
      userId,
      amountMinor,
      currency,
      idempotencyKey,
      reason,
      actorId,
      source: 'manual',
    });

    if (actorId) {
      await auditRepository.logAction({
        adminId: actorId,
        action: 'manual_credit',
        targetId: userId,
        details: {
          amount_cents: amountMinor,
          currency,
          reason,
          idempotencyKey,
        },
      });
    }

    return result;
  },
};

