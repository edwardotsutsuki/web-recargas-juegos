import { create } from 'zustand';
import { Product } from '../types';

export interface CartItem {
  id: string; // unique cart item id
  product: Product;
  quantity: number;
  playerId?: string;
  playerName?: string;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: Product, playerId?: string, playerName?: string) => void;
  removeItem: (cartItemId: string) => void;
  updateItemPlayer: (cartItemId: string, playerId: string, playerName: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  getTotalCents: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  isOpen: false,

  addItem: (product, playerId, playerName) => {
    set((state) => {
      // If product requires player id, each purchase can be distinct
      const existingIndex = state.items.findIndex(
        (i) => i.product.id === product.id && i.playerId === playerId
      );

      if (existingIndex > -1 && !product.requires_player_id) {
        const updated = [...state.items];
        updated[existingIndex].quantity += 1;
        return { items: updated, isOpen: true };
      }

      const newItem: CartItem = {
        id: `${product.id}_${Date.now()}`,
        product,
        quantity: 1,
        playerId,
        playerName,
      };

      return { items: [...state.items, newItem], isOpen: true };
    });
  },

  removeItem: (cartItemId) => {
    set((state) => ({
      items: state.items.filter((i) => i.id !== cartItemId),
    }));
  },

  updateItemPlayer: (cartItemId, playerId, playerName) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === cartItemId ? { ...item, playerId, playerName } : item
      ),
    }));
  },

  clearCart: () => set({ items: [] }),

  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

  getTotalCents: () => {
    return get().items.reduce(
      (acc, item) => acc + item.product.price_cents * item.quantity,
      0
    );
  },
}));

