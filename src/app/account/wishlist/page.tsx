'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { formatInr } from '@/lib/utils';
import { Heart, ShoppingBag, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { AccountNav } from '@/components/account/AccountNav';

export default function WishlistPage() {
  const { items, isLoading, toggleWishlist, count } = useWishlist();
  const { addToCart } = useCart();
  const [movingId, setMovingId] = React.useState<string | null>(null);

  const handleMoveToCart = async (variantId: string) => {
    setMovingId(variantId);
    const addRes = await addToCart(variantId, 1);
    if (addRes.success) {
      await toggleWishlist(variantId);
    }
    setMovingId(null);
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      <AccountNav />

      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-4">
        <div>
          <h2 className="font-serif text-2xl font-normal text-foreground tracking-tight">
            Saved Creations Wishlist
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Artisanal creations saved to your account for future contemplation and acquisition.
          </p>
        </div>
        <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
          {count} {count === 1 ? 'Creation' : 'Creations'}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xs border border-border p-8 space-y-5 text-card-foreground">
          <div className="w-16 h-16 mx-auto rounded-full bg-stone-100 border border-border text-muted-foreground flex items-center justify-center">
            <Heart className="w-7 h-7 stroke-[1.25]" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="font-serif text-xl font-normal text-foreground">Your Wishlist is Empty</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Save artisanal handlooms and jewelry to your personal curation by clicking the heart emblem on product cards.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-block px-6 py-3 bg-primary hover:bg-charcoal text-primary-foreground text-xs uppercase tracking-widest font-medium transition shadow-xs"
          >
            Explore Collections
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-card border border-border rounded-xs overflow-hidden shadow-xs flex flex-col justify-between text-card-foreground group"
            >
              <Link
                href={`/products/${item.productSlug}`}
                className="block relative aspect-[3/4] bg-stone-100 overflow-hidden"
              >
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.productName}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground uppercase tracking-wider">
                    Textile
                  </div>
                )}
                {!item.isAvailable && (
                  <span className="absolute top-2.5 left-2.5 bg-charcoal/90 text-white text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-2xs">
                    Atelier Reserved
                  </span>
                )}
              </Link>

              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <Link href={`/products/${item.productSlug}`}>
                    <h3 className="font-serif text-sm font-normal text-foreground line-clamp-1 hover:text-champagne-dark transition">
                      {item.productName}
                    </h3>
                  </Link>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{item.variantName}</p>
                  <p className="font-sans font-semibold text-foreground text-sm mt-1.5">
                    {formatInr(item.priceInr)}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => handleMoveToCart(item.variantId)}
                    disabled={!item.isAvailable || movingId === item.variantId}
                    className="w-full py-2.5 px-3 bg-primary hover:bg-charcoal disabled:bg-stone-200 disabled:text-stone-400 text-primary-foreground text-xs uppercase tracking-wider font-medium rounded-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {movingId === item.variantId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShoppingBag className="w-3.5 h-3.5" />
                    )}
                    <span>Move to Bag</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleWishlist(item.variantId)}
                    className="w-full py-1 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-rose-700 font-medium flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3 stroke-[1.5]" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

