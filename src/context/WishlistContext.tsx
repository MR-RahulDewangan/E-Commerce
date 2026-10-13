'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import type { WishlistItemDetail } from '@/modules/wishlist/service';

interface WishlistContextType {
  items: WishlistItemDetail[];
  isLoading: boolean;
  isInWishlist: (variantId: string) => boolean;
  toggleWishlist: (variantId: string) => Promise<{ success: boolean; isAdded?: boolean; error?: string }>;
  refreshWishlist: () => Promise<void>;
  count: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, openAuthModal } = useAuth();
  const [items, setItems] = useState<WishlistItemDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshWishlist = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/wishlist', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setItems(json.data.items);
      }
    } catch (err) {
      console.error('Failed to fetch wishlist:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  const isInWishlist = (variantId: string) => {
    return items.some((item) => item.variantId === variantId);
  };

  const toggleWishlist = async (variantId: string) => {
    if (!user) {
      openAuthModal('login');
      return { success: false, error: 'Please log in to manage your wishlist.' };
    }

    const exists = isInWishlist(variantId);

    try {
      if (exists) {
        const res = await fetch(`/api/v1/wishlist/items/${variantId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (res.ok) {
          setItems((prev) => prev.filter((item) => item.variantId !== variantId));
          return { success: true, isAdded: false };
        }
      } else {
        const res = await fetch('/api/v1/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ variantId }),
        });
        if (res.ok) {
          await refreshWishlist();
          return { success: true, isAdded: true };
        }
      }
      return { success: false, error: 'Failed to update wishlist.' };
    } catch {
      return { success: false, error: 'Network error.' };
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        items,
        isLoading,
        isInWishlist,
        toggleWishlist,
        refreshWishlist,
        count: items.length,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
