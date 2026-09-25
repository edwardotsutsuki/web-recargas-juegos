import { create } from 'zustand';
import { staffService } from '../services/api/staff.service';

interface CashierState {
  isCashierMode: boolean;
  isPinModalOpen: boolean;
  pinModalPurpose: 'enable' | 'disable' | 'access_restricted';
  pendingRedirect: string | null;
  errorMessage: string | null;
  isVerifying: boolean;

  setCashierMode: (enabled: boolean) => void;
  openPinModal: (
    purpose?: 'enable' | 'disable' | 'access_restricted',
    redirect?: string
  ) => void;
  closePinModal: () => void;
  verifyAndExecutePin: (enteredPin: string, onSuccess?: () => void) => Promise<boolean>;
}

const STORAGE_KEY_MODE = 'recargas_cashier_mode';

export const useCashierStore = create<CashierState>((set, get) => ({
  isCashierMode: typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_MODE) === 'true' : false,
  isPinModalOpen: false,
  pinModalPurpose: 'enable',
  pendingRedirect: null,
  errorMessage: null,
  isVerifying: false,

  setCashierMode: (enabled: boolean) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_MODE, enabled ? 'true' : 'false');
    }
    set({ isCashierMode: enabled });
  },

  openPinModal: (purpose = 'enable', redirect) => {
    set({
      isPinModalOpen: true,
      pinModalPurpose: purpose,
      pendingRedirect: redirect || null,
      errorMessage: null,
      isVerifying: false,
    });
  },

  closePinModal: () => {
    set({
      isPinModalOpen: false,
      pendingRedirect: null,
      errorMessage: null,
      isVerifying: false,
    });
  },

  verifyAndExecutePin: async (enteredPin: string, onSuccess?: () => void) => {
    const { pinModalPurpose } = get();
    if (!enteredPin || enteredPin.length < 4) {
      set({ errorMessage: 'Ingresa un PIN de al menos 4 dígitos.' });
      return false;
    }

    try {
      set({ isVerifying: true, errorMessage: null });
      // Verificación segura contra la base de datos de Supabase en el backend
      await staffService.verifyMasterPin(enteredPin);

      if (pinModalPurpose === 'enable') {
        get().setCashierMode(true);
      } else {
        get().setCashierMode(false);
      }

      if (onSuccess) onSuccess();
      get().closePinModal();
      return true;
    } catch (err: any) {
      set({
        errorMessage: err.message || 'PIN de propietario incorrecto. Verifica con el administrador.',
        isVerifying: false,
      });
      return false;
    }
  },
}));
