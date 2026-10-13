'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { CartResponse } from '@/modules/cart/service';

interface CartContextType {
  cart: CartResponse | null;
  isLoading: boolean;
  isCartDrawerOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  addToCart: (variantId: string, quantity?: number) => Promise<{ success: boolean; error?: string }>;
  updateQuantity: (itemId: string, quantity: number) => Promise<{ success: boolean; error?: string }>;
  removeItem: (itemId: string) => Promise<{ success: boolean; error?: string }>;
  refreshCart: () => Promise<void>;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  const refreshCart = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/cart', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setCart(json.data.cart);
      }
    } catch (err) {
      console.error('Failed to fetch cart:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCart();

    const handleAuthChange = () => {
      refreshCart();
    };

    window.addEventListener('auth:changed', handleAuthChange);
    return () => window.removeEventListener('auth:changed', handleAuthChange);
  }, [refreshCart]);

  const openCartDrawer = () => setIsCartDrawerOpen(true);
  const closeCartDrawer = () => setIsCartDrawerOpen(false);

  const addToCart = async (variantId: string, quantity = 1) => {
    try {
      const res = await fetch('/api/v1/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ variantId, quantity }),
      });
      const json = await res.json();
      if (!res.ok) {
        return { success: false, error: json.error?.message || 'Failed to add item to cart.' };
      }
      setCart(json.data.cart);
      setIsCartDrawerOpen(true);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error while adding to cart.' };
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      const res = await fetch(`/api/v1/cart/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ quantity }),
      });
      const json = await res.json();
      if (!res.ok) {
        return { success: false, error: json.error?.message || 'Failed to update quantity.' };
      }
      setCart(json.data.cart);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error while updating quantity.' };
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/v1/cart/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        return { success: false, error: json.error?.message || 'Failed to remove item.' };
      }
      setCart(json.data.cart);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error while removing item.' };
    }
  };

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        isCartDrawerOpen,
        openCartDrawer,
        closeCartDrawer,
        addToCart,
        updateQuantity,
        removeItem,
        refreshCart,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
