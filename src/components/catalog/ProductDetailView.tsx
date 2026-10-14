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
  Sparkles,
  FileText,
  Clock,
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
  const [activeTab, setActiveTab] = useState<'details' | 'shipping' | 'taxes'>('details');

  const selectedVariant =
    product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];

  const currentPrice = selectedVariant
    ? selectedVariant.priceOverride !== null
      ? Number(selectedVariant.priceOverride)
      : Number(product.basePrice)
    : Number(product.basePrice);

  const isAvailable = selectedVariant ? selectedVariant.stockQuantity > 0 : false;
  const isFavorited = selectedVariant ? isInWishlist(selectedVariant.id) : false;

  const images =
    product.images.length > 0
      ? product.images
      : [{ id: '1', url: null, altText: null, sortOrder: 0 }];

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
    <div className="space-y-8 sm:space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 bg-card p-4 sm:p-8 lg:p-12 border border-border">
        {/* Gallery Section (5 Columns on Large Desktop) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Main Visual Frame */}
          <div className="relative aspect-[3/4] bg-muted border border-border overflow-hidden">
            {images[selectedImageIndex]?.url ? (
              <Image
                src={images[selectedImageIndex].url!}
                alt={product.name}
                fill
                priority
                className="object-cover transition-transform duration-700 ease-out hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-xs uppercase tracking-widest text-muted-foreground font-sans">
                <span>Artisan Curation</span>
              </div>
            )}

            {/* Wishlist Button */}
            {selectedVariant && (
              <button
                type="button"
                onClick={() => toggleWishlist(selectedVariant.id)}
                className={`absolute top-4 right-4 p-3 rounded-full backdrop-blur-md shadow-xs transition cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                  isFavorited
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-white/85 text-stone-700 hover:text-rose-700 hover:bg-white'
                }`}
                aria-label={isFavorited ? 'Remove from wishlist' : 'Save to wishlist'}
                aria-pressed={isFavorited}
              >
                <Heart
                  className={`w-5 h-5 transition-colors ${
                    isFavorited ? 'fill-rose-700 text-rose-700' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>
            )}
          </div>

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1" role="tablist" aria-label="Product thumbnails">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedImageIndex === idx}
                  aria-label={`View image ${idx + 1}`}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative w-20 h-24 flex-shrink-0 border transition-all cursor-pointer ${
                    selectedImageIndex === idx
                      ? 'border-primary ring-1 ring-ring'
                      : 'border-border opacity-70 hover:opacity-100 hover:border-foreground'
                  }`}
                >
                  {img.url ? (
                    <Image src={img.url} alt="" fill className="object-cover" sizes="80px" />
                  ) : (
                    <div className="w-full h-full bg-muted" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details Section (6 Columns on Large Desktop) */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-8">
          <div className="space-y-6">
            {/* Category, Seller & Title */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap text-[10px] font-sans uppercase tracking-[0.2em]">
                <span className="text-muted-foreground font-medium">
                  {product.category.name}
                </span>
                {product.seller && (
                  <>
                    <span className="text-luxury-champagne">•</span>
                    <span className="inline-flex items-center gap-1 text-foreground border border-border px-2 py-0.5 bg-muted">
                      <Store className="w-3 h-3 text-luxury-champagne" aria-hidden="true" />
                      <span>Atelier: {product.seller.storeName}</span>
                    </span>
                  </>
                )}
              </div>

              <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-normal text-foreground tracking-tight leading-tight">
                {product.name}
              </h1>

              <p className="font-mono text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-widest">
                Identifier: {selectedVariant?.sku || 'N/A'}
              </p>
            </div>

            {/* Pricing Display */}
            <div className="p-4 sm:p-5 bg-background border border-border space-y-2">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="font-sans text-3xl sm:text-4xl font-medium text-foreground tracking-tight">
                  {formatInr(currentPrice)}
                </span>
                <span className="text-[11px] font-sans uppercase tracking-widest px-2.5 py-1 bg-muted border border-border text-foreground font-medium">
                  18% Inclusive GST
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Maximum Retail Price (MRP) inclusive of all applicable taxes. Official tax invoice generated with legal GSTIN upon checkout.
              </p>
            </div>

            {/* Variant Selector */}
            {product.variants.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-xs font-sans uppercase tracking-editorial">
                  <span className="font-medium text-foreground">Select Option / Specification:</span>
                  <span className="text-muted-foreground">
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
                        className={`py-2.5 px-4 text-xs font-sans uppercase tracking-editorial transition flex items-center gap-2 border cursor-pointer ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary font-medium'
                            : 'bg-card text-foreground border-border hover:border-foreground'
                        } ${!hasStock ? 'opacity-40 line-through border-dashed' : ''}`}
                      >
                        <span>{v.name}</span>
                        {v.priceOverride !== null && (
                          <span className={`text-[10px] ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
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
            <div>
              {isAvailable ? (
                selectedVariant && selectedVariant.stockQuantity <= 5 ? (
                  <div className="inline-flex items-center gap-2 text-xs font-sans uppercase tracking-wider text-amber-900 bg-amber-50 border border-amber-200 px-3.5 py-1.5">
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Rare Creation &bull; Only {selectedVariant.stockQuantity} remaining</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 text-xs font-sans uppercase tracking-wider text-stone-800 bg-muted border border-border px-3.5 py-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                    <span>In Stock &bull; Prepared for Immediate All-India Dispatch</span>
                  </div>
                )
              ) : (
                <div className="inline-flex items-center gap-2 text-xs font-sans uppercase tracking-wider text-destructive bg-red-50 border border-red-200 px-3.5 py-1.5">
                  <span>Sold Out &bull; Currently Unavailable</span>
                </div>
              )}
            </div>

            {/* Quantity Stepper & Actions */}
            <div className="space-y-4 pt-4 border-t border-border">
              {isAvailable && (
                <div className="flex items-center gap-4">
                  <span className="text-xs font-sans uppercase tracking-editorial font-medium text-foreground">
                    Quantity:
                  </span>
                  <div className="flex items-center border border-border bg-card">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="p-2.5 text-foreground hover:bg-muted disabled:opacity-30 cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <span className="px-4 text-xs font-sans font-medium text-foreground">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity(
                          Math.min(selectedVariant?.stockQuantity || 10, quantity + 1)
                        )
                      }
                      disabled={quantity >= (selectedVariant?.stockQuantity || 1)}
                      className="p-2.5 text-foreground hover:bg-muted disabled:opacity-30 cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!isAvailable || isAdding}
                  className="py-3.5 sm:py-4 px-4 sm:px-6 bg-primary text-primary-foreground hover:bg-primary-hover disabled:bg-muted disabled:text-muted-foreground text-[11px] sm:text-xs font-sans uppercase tracking-wider sm:tracking-[0.18em] font-medium transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:cursor-not-allowed"
                >
                  {justAdded ? (
                    <>
                      <Check className="w-4 h-4 text-luxury-champagne" aria-hidden="true" />
                      <span>Added to Bag</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                      <span>Add to Bag</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={!isAvailable || isBuyingNow}
                  className="py-3.5 sm:py-4 px-4 sm:px-6 bg-transparent border border-foreground text-foreground hover:bg-foreground hover:text-background disabled:border-border disabled:text-muted-foreground text-[11px] sm:text-xs font-sans uppercase tracking-wider sm:tracking-[0.18em] font-medium transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Zap className="w-4 h-4 text-luxury-champagne fill-luxury-champagne" aria-hidden="true" />
                  <span>Instant Checkout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tabbed Product Dossier */}
          <div className="border-t border-border pt-6 space-y-4">
            <div className="flex border-b border-border text-[11px] sm:text-xs uppercase tracking-editorial font-medium overflow-x-auto no-scrollbar whitespace-nowrap">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`py-2.5 px-3 sm:px-4 border-b-2 cursor-pointer transition flex-shrink-0 ${
                  activeTab === 'details'
                    ? 'border-foreground text-foreground font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Artisan Story
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('shipping')}
                className={`py-2.5 px-3 sm:px-4 border-b-2 cursor-pointer transition flex-shrink-0 ${
                  activeTab === 'shipping'
                    ? 'border-foreground text-foreground font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Pan-India Dispatch
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('taxes')}
                className={`py-2.5 px-3 sm:px-4 border-b-2 cursor-pointer transition flex-shrink-0 ${
                  activeTab === 'taxes'
                    ? 'border-foreground text-foreground font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                GST & Compliance
              </button>
            </div>

            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {activeTab === 'details' && (
                <div className="space-y-3">
                  <p className="whitespace-pre-line">
                    {product.description ||
                      'Handcrafted with meticulous regional care. Each piece preserves ancestral weaving techniques while offering contemporary durability and wearability.'}
                  </p>
                  <div className="pt-2 flex items-center gap-2 text-[11px] text-stone-500 uppercase tracking-widest font-sans">
                    <Sparkles className="w-3.5 h-3.5 text-luxury-champagne" aria-hidden="true" />
                    <span>Certified Genuine Artisan Quality</span>
                  </div>
                </div>
              )}

              {activeTab === 'shipping' && (
                <div className="space-y-2">
                  <p>
                    Complimentary all-India delivery on orders above ₹999. Consignments are insured and handled via trusted Indian carriers including Delhivery, Blue Dart, and Speed Post.
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Typical transit: 2&ndash;5 business days depending on delivery PIN code.
                  </p>
                </div>
              )}

              {activeTab === 'taxes' && (
                <div className="space-y-2">
                  <p>
                    All displayed prices are MRP and inclusive of 18% GST (CGST 9% + SGST 9% for intra-state Karnataka; IGST 18% for inter-state deliveries).
                  </p>
                  <p className="text-[11px] text-stone-500">
                    HSN/SAC codes and immutable address snapshots are printed directly on your downloadable tax invoice.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
