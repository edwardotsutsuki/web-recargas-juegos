import { create } from 'zustand';
import { Product } from '../types';

interface VerificationModalState {
  isOpen: boolean;
  product: Product | null;
  onSuccess?: (playerId: string, playerName: string) => void;
}

interface UIStore {
  verificationModal: VerificationModalState;
  openVerificationModal: (
    product: Product,
    onSuccess?: (playerId: string, playerName: string) => void
  ) => void;
  closeVerificationModal: () => void;
  toast: {
    message: string;
    type: 'success' | 'error' | 'info';
    isOpen: boolean;
  };
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  verificationModal: {
    isOpen: false,
    product: null,
  },
  openVerificationModal: (product, onSuccess) =>
    set({
      verificationModal: {
        isOpen: true,
        product,
        onSuccess,
      },
    }),
  closeVerificationModal: () =>
    set({
      verificationModal: {
        isOpen: false,
        product: null,
        onSuccess: undefined,
      },
    }),
  toast: {
    message: '',
    type: 'info',
    isOpen: false,
  },
  showToast: (message, type = 'info') => {
    set({ toast: { message, type, isOpen: true } });
    setTimeout(() => {
      set((state) => ({ toast: { ...state.toast, isOpen: false } }));
    }, 4000);
  },
  hideToast: () => set((state) => ({ toast: { ...state.toast, isOpen: false } })),
}));

