import { create } from 'zustand';
import { WalletState } from '../types';
import { walletService } from '../services/api/wallet.service';
import { subscribeToUserWallet } from '../services/supabase/realtime';
import { RealtimeChannel } from '@supabase/supabase-js';

interface WalletStore {
  wallet: WalletState;
  isLoading: boolean;
  channel: RealtimeChannel | null;
  fetchWallet: () => Promise<void>;
  updateBalances: (total: number, held: number) => void;
  hasSufficientBalance: (priceCents: number) => boolean;
  getMissingCents: (priceCents: number) => number;
  subscribeRealtime: (userId: string) => void;
  unsubscribeRealtime: () => void;
  setSimulatedBalance: (cents: number) => void;
}

export const useWalletStore = create<WalletStore>((set, get) => ({
  wallet: {
    currency: 'USD',
    total_balance_cents: 0,
    held_balance_cents: 0,
    available_balance_cents: 0,
  },
  isLoading: false,
  channel: null,

  fetchWallet: async () => {
    try {
      set({ isLoading: true });
      const wallet = await walletService.getWallet();
      set({ wallet, isLoading: false });
    } catch {
      get().updateBalances(0, 0);
      set({ isLoading: false });
    }
  },

  updateBalances: (total: number, held: number) => {
    const available = Math.max(0, total - held);
    set((state) => ({
      wallet: {
        ...state.wallet,
        total_balance_cents: total,
        held_balance_cents: held,
        available_balance_cents: available,
      },
    }));
  },

  hasSufficientBalance: (priceCents: number) => {
    const { available_balance_cents } = get().wallet;
    return available_balance_cents >= priceCents;
  },

  getMissingCents: (priceCents: number) => {
    const { available_balance_cents } = get().wallet;
    return Math.max(0, priceCents - available_balance_cents);
  },

  subscribeRealtime: (userId: string) => {
    if (get().channel) {
      get().channel?.unsubscribe();
    }

    const channel = subscribeToUserWallet(userId, (payload) => {
      if (payload.new) {
        const total = Number(payload.new.balance_minor ?? 0);
        const held = Number(payload.new.held_minor ?? 0);
        get().updateBalances(total, held);
      }
    });

    set({ channel });
  },

  unsubscribeRealtime: () => {
    const { channel } = get();
    if (channel) {
      channel.unsubscribe();
      set({ channel: null });
    }
  },

  // Helper for UI testing: allows quick adjustment of balance in development
  setSimulatedBalance: (cents: number) => {
    get().updateBalances(cents, 0);
  },
}));

