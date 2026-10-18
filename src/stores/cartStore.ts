import { create } from 'zustand';
import { MenuItem, PaymentMethod } from '@/types/database';

export interface CartItem {
  product: MenuItem;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  customerName: string;
  customerPhone: string;
  paymentMethod: PaymentMethod;
  receiptRequested: boolean;

  // Actions
  addItem: (product: MenuItem) => void;
  removeItem: (productId: string) => void;
  deleteItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;

  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setReceiptRequested: (requested: boolean) => void;

  // Computations
  getItemQuantity: (productId: string) => number;
  getTotalItems: () => number;
  getSubtotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerName: '',
  customerPhone: '',
  paymentMethod: 'cash',
  receiptRequested: false,

  addItem: (product: MenuItem) => {
    set((state) => {
      const existingIndex = state.items.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...state.items];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return { items: updated };
      }
      return { items: [...state.items, { product, quantity: 1 }] };
    });
  },

  removeItem: (productId: string) => {
    set((state) => {
      const existingIndex = state.items.findIndex((item) => item.product.id === productId);
      if (existingIndex === -1) return state;

      const currentItem = state.items[existingIndex];
      if (currentItem.quantity > 1) {
        const updated = [...state.items];
        updated[existingIndex] = {
          ...currentItem,
          quantity: currentItem.quantity - 1,
        };
        return { items: updated };
      }
      return { items: state.items.filter((item) => item.product.id !== productId) };
    });
  },

  deleteItem: (productId: string) => {
    set((state) => ({
      items: state.items.filter((item) => item.product.id !== productId),
    }));
  },

  updateQuantity: (productId: string, quantity: number) => {
    set((state) => {
      if (quantity <= 0) {
        return { items: state.items.filter((item) => item.product.id !== productId) };
      }
      return {
        items: state.items.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item
        ),
      };
    });
  },

  clearCart: () => {
    set({
      items: [],
      customerName: '',
      customerPhone: '',
      paymentMethod: 'cash',
      receiptRequested: false,
    });
  },

  setCustomerName: (name: string) => set({ customerName: name }),
  setCustomerPhone: (phone: string) => set({ customerPhone: phone }),
  setPaymentMethod: (method: PaymentMethod) => set({ paymentMethod: method }),
  setReceiptRequested: (requested: boolean) => set({ receiptRequested: requested }),

  getItemQuantity: (productId: string) => {
    const item = get().items.find((i) => i.product.id === productId);
    return item ? item.quantity : 0;
  },

  getTotalItems: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },

  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  },
}));
