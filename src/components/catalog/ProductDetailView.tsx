'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { formatInr } from '@/lib/utils';
import {
  Heart,
  ShoppingBag,
  Truck,
  ShieldCheck,
  RotateCcw,
  Plus,
  Minus,
  Check,
  Zap,
  Store,
} from 'lucide-react';
import type { CatalogProductDetail } from '@/modules/catalog/types';

export function ProductDetailView({ product }: { product: CatalogProductDetail }) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  // Selected variant state (defaults to first variant)
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    product.variants[0]?.id || ''
  );
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const selectedVariant =
    product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];

  const currentPrice = selectedVariant
    ? selectedVariant.priceOverride !== null
      ? Number(selectedVariant.priceOverride)
      : Number(product.basePrice)
    : Number(product.basePrice);

  const isAvailable = selectedVariant ? selectedVariant.stockQuantity > 0 : false;
  const isFavorited = selectedVariant ? isInWishlist(selectedVariant.id) : false;

  const images = product.images.length > 0 ? product.images : [{ id: '1', url: null, altText: null, sortOrder: 0 }];

  const handleAddToCart = async () => {
    if (!selectedVariant || !isAvailable) return;
    setIsAdding(true);
    const res = await addToCart(selectedVariant.id, quantity);
    setIsAdding(false);
    if (res.success) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2500);
    }
  };

  const handleBuyNow = async () => {
    if (!selectedVariant || !isAvailable) return;
    setIsBuyingNow(true);
    const res = await addToCart(selectedVariant.id, quantity);
    if (res.success) {
      router.push('/checkout');
    } else {
      setIsBuyingNow(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 bg-white p-6 sm:p-10 rounded-2xl border border-zinc-200 shadow-xs">
      {/* Gallery Section */}
      <div className="space-y-4">
        {/* Main image */}
        <div className="relative w-full aspect-[3/4] min-h-[380px] sm:min-h-[480px] rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200">
          {images[selectedImageIndex]?.url ? (
            <Image
              src={images[selectedImageIndex].url!}
              alt={product.name}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-zinc-400">
              No preview image available
            </div>
          )}

          {/* Wishlist Button */}
          {selectedVariant && (
            <button
              type="button"
              onClick={() => toggleWishlist(selectedVariant.id)}
              className={`absolute top-4 right-4 p-3 rounded-full backdrop-blur-md shadow-md transition ${
                isFavorited
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-white/80 text-zinc-600 hover:text-rose-600 hover:bg-white'
              }`}
              aria-label="Wishlist toggle"
            >
              <Heart className={`w-5 h-5 ${isFavorited ? 'fill-rose-600' : ''}`} />
            </button>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {images.map((img, idx) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setSelectedImageIndex(idx)}
                className={`relative w-20 h-24 rounded-lg overflow-hidden border-2 flex-shrink-0 transition ${
                  selectedImageIndex === idx
                    ? 'border-emerald-600 ring-2 ring-emerald-200'
                    : 'border-zinc-200 hover:border-zinc-400'
                }`}
              >
                {img.url ? (
                  <Image src={img.url} alt={product.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-zinc-100" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Details Section */}
      <div className="space-y-6 flex flex-col justify-between">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                {product.category.name}
              </span>
              {product.seller && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md">
                  <Store className="w-3.5 h-3.5 text-indigo-600" />
                  Sold by {product.seller.storeName}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 mt-2.5 tracking-tight">
              {product.name}
            </h1>
            <p className="text-xs text-zinc-400 mt-1">SKU: {selectedVariant?.sku || 'N/A'}</p>
          </div>

          {/* Pricing & GST Badge */}
          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-zinc-900">
                {formatInr(currentPrice)}
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                18% GST Inclusive
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              MRP inclusive of all Indian taxes. Tax invoice generated upon checkout.
            </p>
          </div>

          {/* Variant Selector */}
          {product.variants.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center text-xs font-bold text-zinc-800">
                <span>Select Option / Variant:</span>
                <span className="text-zinc-500 font-normal">
                  {selectedVariant?.name || ''}
                </span>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {product.variants.map((v) => {
                  const isSelected = v.id === selectedVariantId;
                  const hasStock = v.stockQuantity > 0;

                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setSelectedVariantId(v.id);
                        setQuantity(1);
                      }}
                      className={`py-2 px-3.5 text-xs font-semibold rounded-lg border transition flex items-center gap-2 ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                          : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400'
                      } ${!hasStock ? 'opacity-50 line-through' : ''}`}
                    >
                      <span>{v.name}</span>
                      {v.priceOverride !== null && (
                        <span className="text-[10px] text-zinc-500">
                          ({formatInr(Number(v.priceOverride))})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock Availability Indicator */}
          <div className="pt-2">
            {isAvailable ? (
              selectedVariant && selectedVariant.stockQuantity <= 5 ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg w-fit">
                  <span>⚠️ Only {selectedVariant.stockQuantity} items left in stock — order soon!</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg w-fit">
                  <Check className="w-3.5 h-3.5" />
                  <span>In Stock (Ready to dispatch via Delhivery / Blue Dart)</span>
                </div>
              )
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg w-fit">
                <span>Sold Out — Currently out of stock</span>
              </div>
            )}
          </div>

          {/* Quantity Controls & Purchase Buttons */}
          <div className="space-y-3 pt-4 border-t border-zinc-200">
            {isAvailable && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-zinc-700">Quantity:</span>
                <div className="flex items-center border border-zinc-300 rounded-lg bg-white">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="p-2 text-zinc-600 hover:text-zinc-900 disabled:opacity-40"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-3 text-xs font-bold text-zinc-900">{quantity}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity(
                        Math.min(selectedVariant?.stockQuantity || 10, quantity + 1)
                      )
                    }
                    disabled={quantity >= (selectedVariant?.stockQuantity || 1)}
                    className="p-2 text-zinc-600 hover:text-zinc-900 disabled:opacity-40"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!isAvailable || isAdding}
                className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm"
              >
                {justAdded ? (
                  <>
                    <Check className="w-4 h-4" /> Added to Cart!
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" /> Add to Cart
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleBuyNow}
                disabled={!isAvailable || isBuyingNow}
                className="py-3.5 px-4 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm"
              >
                <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" /> Buy Now
              </button>
            </div>
          </div>

          {/* Description & Specs */}
          {product.description && (
            <div className="pt-4 border-t border-zinc-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 mb-2">
                Product Description
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}
        </div>

        {/* Trust Badges Bar */}
        <div className="grid grid-cols-3 gap-2 pt-6 border-t border-zinc-200 text-center text-[11px] text-zinc-600">
          <div className="flex flex-col items-center gap-1 p-2 bg-zinc-50 rounded-lg">
            <Truck className="w-4 h-4 text-emerald-600" />
            <span>Fast All-India Shipping</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 bg-zinc-50 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>100% Genuine Artisan Produce</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 bg-zinc-50 rounded-lg">
            <RotateCcw className="w-4 h-4 text-emerald-600" />
            <span>Easy 7-Day Replacement</span>
          </div>
        </div>
      </div>
    </div>
  );
}
