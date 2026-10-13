'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { formatInr } from '@/lib/utils';
import { Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="animate-pulse space-y-4 max-w-md mx-auto">
          <div className="h-8 bg-zinc-200 rounded w-1/2 mx-auto" />
          <div className="h-4 bg-zinc-200 rounded w-3/4 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
          My Saved Wishlist ({count})
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          Items saved to your account for future purchases.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-zinc-200 p-8 space-y-4">
          <div className="w-16 h-16 mx-auto bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center">
            <Heart className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900">Your Wishlist is Empty</h2>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Save items you like by clicking the heart icon on product cards or detail pages.
          </p>
          <Link
            href="/products"
            className="inline-block px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between"
            >
              <Link
                href={`/products/${item.productSlug}`}
                className="block relative aspect-3/4 bg-zinc-100 overflow-hidden"
              >
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.productName}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-zinc-400">
                    No image
                  </div>
                )}
                {!item.isAvailable && (
                  <span className="absolute top-2.5 left-2.5 bg-zinc-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    Out of Stock
                  </span>
                )}
              </Link>

              <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <Link href={`/products/${item.productSlug}`}>
                    <h3 className="font-semibold text-zinc-900 text-sm line-clamp-1 hover:text-emerald-700 transition">
                      {item.productName}
                    </h3>
                  </Link>
                  <p className="text-xs text-zinc-500 truncate">{item.variantName}</p>
                  <p className="font-bold text-zinc-900 text-sm mt-1">
                    {formatInr(item.priceInr)}
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleMoveToCart(item.variantId)}
                    disabled={!item.isAvailable || movingId === item.variantId}
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center justify-center gap-1.5"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" /> Move to Cart
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleWishlist(item.variantId)}
                    className="w-full py-1.5 text-xs text-zinc-500 hover:text-rose-600 font-medium flex items-center justify-center gap-1 transition"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
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
