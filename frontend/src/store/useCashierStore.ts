import { create } from 'zustand';

interface CashierState {
  isCashierMode: boolean;
  cashierPin: string;
  isPinModalOpen: boolean;
  pinModalPurpose: 'enable' | 'disable' | 'change_pin' | 'access_restricted';
  pendingRedirect: string | null;
  errorMessage: string | null;

  setCashierMode: (enabled: boolean) => void;
  setPin: (newPin: string) => void;
  openPinModal: (
    purpose?: 'enable' | 'disable' | 'change_pin' | 'access_restricted',
    redirect?: string
  ) => void;
  closePinModal: () => void;
  verifyAndExecutePin: (enteredPin: string, onSuccess?: () => void) => boolean;
}

const STORAGE_KEY_MODE = 'recargas_cashier_mode';
const STORAGE_KEY_PIN = 'recargas_cashier_pin';

export const useCashierStore = create<CashierState>((set, get) => ({
  isCashierMode: localStorage.getItem(STORAGE_KEY_MODE) === 'true',
  cashierPin: localStorage.getItem(STORAGE_KEY_PIN) || '1234',
  isPinModalOpen: false,
  pinModalPurpose: 'enable',
  pendingRedirect: null,
  errorMessage: null,

  setCashierMode: (enabled: boolean) => {
    localStorage.setItem(STORAGE_KEY_MODE, enabled ? 'true' : 'false');
    set({ isCashierMode: enabled });
  },

  setPin: (newPin: string) => {
    const clean = newPin.replace(/\D/g, '').slice(0, 6);
    localStorage.setItem(STORAGE_KEY_PIN, clean);
    set({ cashierPin: clean });
  },

  openPinModal: (purpose = 'enable', redirect) => {
    set({
      isPinModalOpen: true,
      pinModalPurpose: purpose,
      pendingRedirect: redirect || null,
      errorMessage: null,
    });
  },

  closePinModal: () => {
    set({
      isPinModalOpen: false,
      pendingRedirect: null,
      errorMessage: null,
    });
  },

  verifyAndExecutePin: (enteredPin: string, onSuccess?: () => void) => {
    const { cashierPin, pinModalPurpose } = get();
    if (enteredPin === cashierPin) {
      set({ errorMessage: null });
      if (pinModalPurpose === 'enable') {
        get().setCashierMode(true);
      } else if (pinModalPurpose === 'disable' || pinModalPurpose === 'access_restricted') {
        get().setCashierMode(false);
      }
      if (onSuccess) onSuccess();
      get().closePinModal();
      return true;
    } else {
      set({ errorMessage: 'PIN incorrecto. Ingresa el código de 4 dígitos del propietario.' });
      return false;
    }
  },
}));
