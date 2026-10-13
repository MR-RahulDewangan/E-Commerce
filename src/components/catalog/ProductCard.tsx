'use client';

import React from 'react';
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
  const [isAdding, setIsAdding] = React.useState(false);
  const [justAdded, setJustAdded] = React.useState(false);

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
    <div className="group relative bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col">
      {/* Thumbnail Container */}
      <Link href={`/products/${slug}`} className="block relative w-full aspect-[3/4] bg-zinc-100 overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-zinc-400">
            No image available
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
          {!inStock ? (
            <span className="bg-zinc-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded">
              Out of Stock
            </span>
          ) : (
            <span className="bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded">
              In Stock
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        {firstVariantId && (
          <button
            type="button"
            onClick={handleToggleWishlist}
            className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-xs transition z-10 ${
              isFavorited
                ? 'bg-rose-50 text-rose-600'
                : 'bg-white/80 text-zinc-600 hover:text-rose-600 hover:bg-white'
            }`}
            aria-label="Wishlist toggle"
          >
            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-rose-600' : ''}`} />
          </button>
        )}
      </Link>

      {/* Details */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
        <div>
          {categoryName && (
            <p className="text-[11px] font-semibold tracking-wider text-emerald-700 uppercase mb-0.5">
              {categoryName}
            </p>
          )}
          <Link href={`/products/${slug}`}>
            <h3 className="font-semibold text-zinc-900 text-sm line-clamp-2 hover:text-emerald-700 transition">
              {name}
            </h3>
          </Link>
        </div>

        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-zinc-900 text-base">
              {formatInr(startingPrice)}
            </span>
            <span className="text-[10px] text-zinc-400">incl. GST</span>
          </div>

          <div className="mt-3">
            {variantsCount > 1 ? (
              <Link
                href={`/products/${slug}`}
                className="block text-center w-full py-2 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold rounded-lg transition"
              >
                Choose Options ({variantsCount})
              </Link>
            ) : inStock && firstVariantId ? (
              <button
                type="button"
                onClick={handleQuickAdd}
                disabled={isAdding}
                className="flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
              >
                {justAdded ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Added!
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-3.5 h-3.5" /> Add to Cart
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="w-full py-2 px-3 bg-zinc-100 text-zinc-400 text-xs font-semibold rounded-lg cursor-not-allowed"
              >
                Sold Out
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
