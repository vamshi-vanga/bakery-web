'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { MenuItem, CartItem } from '@/lib/types';

interface CartContextType {
  cart: CartItem[];
  isCartOpen: boolean;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (item: MenuItem, selectedSize?: string, customPrice?: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const toggleCart = useCallback(() => setIsCartOpen(prev => !prev), []);
  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const addToCart = useCallback((item: MenuItem, selectedSize?: string, customPrice?: number) => {
    // If item has size variants and no size was passed, choose default or first variant
    const size = selectedSize || (item.size_variants && item.size_variants.length > 0
      ? (item.size_variants.find(v => v.is_default)?.size || item.size_variants[0].size)
      : undefined);
    
    // Determine price for chosen size
    const finalPrice = customPrice !== undefined
      ? customPrice
      : (size && item.size_variants && item.size_variants.length > 0
          ? (item.size_variants.find(v => v.size === size)?.price ?? item.price)
          : item.price);

    const lineItemId = size ? `${item.id}__${size}` : item.id;

    setCart((prev) => {
      const existing = prev.find((ci) => ci.id === lineItemId);
      if (existing) {
        return prev.map((ci) =>
          ci.id === lineItemId ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [
        ...prev,
        {
          ...item,
          id: lineItemId,
          price: finalPrice,
          selected_size: size,
          quantity: 1,
        },
      ];
    });
    setIsCartOpen(true);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        isCartOpen,
        toggleCart,
        openCart,
        closeCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
