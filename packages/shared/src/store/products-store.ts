import { create } from 'zustand';
import { Product } from '../types';

interface ProductsState {
  products: Product[];
  isLoading: boolean;
  setProducts: (products: Product[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useProductsStore = create<ProductsState>((set) => ({
  products: [],
  isLoading: true,
  setProducts: (products) =>
    set({
      products,
      isLoading: false,
    }),
  setLoading: (loading) => set({ isLoading: loading }),
}));