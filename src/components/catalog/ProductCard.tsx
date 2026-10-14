'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { formatInr } from '@/lib/utils';
import { Heart, ShoppingBag, Check } from 'lucide-react';

export interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  categoryName?: string;
  startingPrice: number;
  imageUrl?: string | null;
  variantsCount: number;
  firstVariantId?: string;
  inStock: boolean;
}

export function ProductCard({
  name,
  slug,
  categoryName,
  startingPrice,
  imageUrl,
  variantsCount,
  firstVariantId,
  inStock,
}: ProductCardProps) {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const isFavorited = firstVariantId ? isInWishlist(firstVariantId) : false;
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!firstVariantId || !inStock) return;

    setIsAdding(true);
    const res = await addToCart(firstVariantId, 1);
    setIsAdding(false);
    if (res.success) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    }
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!firstVariantId) return;
    await toggleWishlist(firstVariantId);
  };

  return (
    <article className="group relative bg-card border border-border transition-all duration-300 hover:border-luxury-champagne hover:shadow-sm flex flex-col h-full">
      {/* Thumbnail Container with Luxury Aspect Ratio */}
      <div className="relative aspect-[3/4] bg-muted overflow-hidden">
        <Link href={`/products/${slug}`} className="block w-full h-full" tabIndex={-1}>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground uppercase tracking-widest font-sans">
              Artisan Piece
            </div>
          )}
        </Link>

        {/* Status Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10 pointer-events-none">
          {!inStock ? (
            <span className="bg-luxury-obsidian/90 backdrop-blur-xs text-luxury-ivory text-[9px] font-sans uppercase tracking-widest px-2 py-0.5 border border-stone-700">
              Sold Out
            </span>
          ) : (
            <span className="bg-background/90 backdrop-blur-xs text-foreground text-[9px] font-sans uppercase tracking-widest px-2 py-0.5 border border-border">
              In Stock
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        {firstVariantId && (
          <button
            type="button"
            onClick={handleToggleWishlist}
            className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-xs transition z-10 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
              isFavorited
                ? 'bg-rose-50 text-rose-700'
                : 'bg-white/85 text-stone-700 hover:text-rose-700 hover:bg-white'
            }`}
            aria-label={isFavorited ? 'Remove from wishlist' : 'Save to wishlist'}
            aria-pressed={isFavorited}
          >
            <Heart
              className={`w-3.5 h-3.5 transition-colors ${
                isFavorited ? 'fill-rose-700 text-rose-700' : ''
              }`}
              aria-hidden="true"
            />
          </button>
        )}
      </div>

      {/* Product Information */}
      <div className="p-3 sm:p-5 flex flex-col flex-1 justify-between gap-2.5 sm:gap-3 bg-card">
        <div className="space-y-0.5 sm:space-y-1">
          {categoryName && (
            <p className="text-[9px] sm:text-[10px] font-sans uppercase tracking-wider sm:tracking-widest text-muted-foreground truncate">
              {categoryName}
            </p>
          )}
          <h3 className="font-serif text-xs sm:text-base font-medium text-foreground line-clamp-2 leading-snug group-hover:text-luxury-charcoal transition-colors">
            <Link href={`/products/${slug}`} className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              {name}
            </Link>
          </h3>
        </div>

        <div className="space-y-2.5 sm:space-y-3 pt-1 border-t border-border/50">
          <div className="flex items-baseline justify-between gap-1 flex-wrap">
            <span className="font-sans text-xs sm:text-base font-medium text-foreground tracking-tight">
              {formatInr(startingPrice)}
            </span>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider font-sans">
              Incl. 18% GST
            </span>
          </div>

          <div>
            {variantsCount > 1 ? (
              <Link
                href={`/products/${slug}`}
                className="block text-center w-full py-2 sm:py-2.5 px-2 sm:px-3 bg-secondary text-secondary-foreground hover:bg-secondary-hover text-[10px] sm:text-[11px] font-sans uppercase tracking-wider sm:tracking-widest font-medium transition cursor-pointer border border-border"
              >
                Select Options ({variantsCount})
              </Link>
            ) : inStock && firstVariantId ? (
              <button
                type="button"
                onClick={handleQuickAdd}
                disabled={isAdding}
                className="flex items-center justify-center gap-1.5 w-full py-2 sm:py-2.5 px-2 sm:px-3 bg-primary text-primary-foreground hover:bg-primary-hover text-[10px] sm:text-[11px] font-sans uppercase tracking-wider sm:tracking-widest font-medium transition cursor-pointer disabled:opacity-50"
              >
                {justAdded ? (
                  <>
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Added to Bag</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Add to Bag</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="w-full py-2 sm:py-2.5 px-2 sm:px-3 bg-muted text-muted-foreground text-[10px] sm:text-[11px] font-sans uppercase tracking-wider sm:tracking-widest font-medium cursor-not-allowed border border-border/60"
              >
                Sold Out
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
