import { create } from 'zustand';
import { Cart } from '../types';

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  setCart: (cart: Cart) => void;
  setLoading: (loading: boolean) => void;
  clearCartState: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  cart: null,
  isLoading: true,
  setCart: (cart) =>
    set({
      cart,
      isLoading: false,
    }),
  setLoading: (loading) => set({ isLoading: loading }),
  clearCartState: () =>
    set({
      cart: null,
      isLoading: false,
    }),
}));