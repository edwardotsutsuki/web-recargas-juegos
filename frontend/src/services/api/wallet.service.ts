import { apiClient } from './client';
import { WalletState } from '../../types';

export const walletService = {
  async getWallet(): Promise<WalletState> {
    try {
      return await apiClient<WalletState>('/wallet');
    } catch {
      // Local development fallback: load simulated wallet or default to 5000 cents ($50.00 USD)
      const cached = localStorage.getItem('nexuspay_simulated_wallet');
      if (cached) {
        return JSON.parse(cached);
      }
      const initialWallet: WalletState = {
        currency: 'USD',
        total_balance_cents: 5000, // $50.00 USD
        held_balance_cents: 0,
        available_balance_cents: 5000,
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem('nexuspay_simulated_wallet', JSON.stringify(initialWallet));
      return initialWallet;
    }
  },

  /**
   * Helper to deduct balance locally for instant UI responsiveness in dev mode
   */
  deductLocalBalance(amountCents: number): WalletState {
    const current: WalletState = JSON.parse(
      localStorage.getItem('nexuspay_simulated_wallet') ||
        '{"currency":"USD","total_balance_cents":5000,"held_balance_cents":0,"available_balance_cents":5000}'
    );
    const newAvailable = Math.max(0, current.available_balance_cents - amountCents);
    const newTotal = Math.max(0, current.total_balance_cents - amountCents);
    const updated: WalletState = {
      ...current,
      total_balance_cents: newTotal,
      available_balance_cents: newAvailable,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem('nexuspay_simulated_wallet', JSON.stringify(updated));
    return updated;
  },
};

