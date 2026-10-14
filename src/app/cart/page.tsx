'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { formatInr } from '@/lib/utils';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Truck, RotateCcw, Sparkles } from 'lucide-react';

const FREE_SHIPPING_THRESHOLD_INR = 999;

export default function CartPage() {
  const { cart, isLoading, updateQuantity, removeItem, itemCount } = useCart();

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="animate-pulse space-y-8 max-w-4xl mx-auto">
          <div className="h-10 bg-stone-200/60 rounded-xs w-1/3" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-32 bg-stone-200/60 rounded-xs" />
              <div className="h-32 bg-stone-200/60 rounded-xs" />
            </div>
            <div className="h-64 bg-stone-200/60 rounded-xs" />
          </div>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-stone-100 border border-stone-200 text-muted-foreground flex items-center justify-center">
          <ShoppingBag className="w-9 h-9 stroke-[1.25]" />
        </div>
        <div className="space-y-2 max-w-md mx-auto">
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-foreground tracking-tight">
            Your Shopping Bag is Empty
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Discover exquisite handlooms, pure mulberry silks, pashminas, and handcrafted treasures from master Indian artisans.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/products"
            className="inline-block px-8 py-3.5 bg-primary hover:bg-charcoal text-primary-foreground text-xs uppercase tracking-widest font-medium transition shadow-xs"
          >
            Explore Catalog
          </Link>
        </div>

        {/* Quick Collection Links */}
        <div className="pt-10 border-t border-border/60 max-w-xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4 font-medium">
            Curated Atelier Departments
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { label: 'Artisanal Silks', href: '/products?category=artisanal-handlooms' },
              { label: 'Eco Cashmere', href: '/products?category=pashmina-shawls' },
              { label: 'Handcrafted Jewellery', href: '/products?category=handcrafted-jewellery' },
              { label: 'Organic Khadi', href: '/products?category=organic-khadi' },
            ].map((cat) => (
              <Link
                key={cat.label}
                href={cat.href}
                className="px-4 py-1.5 text-xs border border-border/80 rounded-full hover:border-primary hover:text-foreground text-muted-foreground transition"
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const subtotalInr = cart.pricing.subtotalAfterDiscountPaise / 100;
  const shippingFeeInr = cart.pricing.shippingFeePaise / 100;
  const gstInr = cart.pricing.tax.totalGstPaise / 100;
  const totalInr = cart.pricing.totalPayablePaise / 100;

  const freeShippingProgress = Math.min(
    100,
    Math.round((subtotalInr / FREE_SHIPPING_THRESHOLD_INR) * 100)
  );
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD_INR - subtotalInr);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-8 sm:space-y-10">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <h1 className="font-serif text-2xl sm:text-4xl font-normal text-foreground tracking-tight">
            Shopping Bag
          </h1>
          <span className="text-[11px] sm:text-xs uppercase tracking-widest text-muted-foreground font-medium">
            {itemCount} {itemCount === 1 ? 'Handcrafted Creation' : 'Handcrafted Creations'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Creations in your bag are protected by temporary stock holds during active checkout.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Cart Line Items Column (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Complimentary Shipping Progress Banner */}
          <div className="p-4 sm:p-5 bg-stone-50 border border-stone-200/80 rounded-xs space-y-2.5">
            <div className="flex justify-between items-center text-xs text-charcoal">
              {remainingForFreeShipping > 0 ? (
                <span className="text-muted-foreground text-[11px] sm:text-xs">
                  Add <strong className="font-semibold text-foreground">{formatInr(remainingForFreeShipping)}</strong> more to qualify for complimentary white-glove delivery across India.
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground text-[11px] sm:text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-champagne-dark" />
                  Your order qualifies for complimentary white-glove delivery.
                </span>
              )}
              <span className="text-[11px] font-mono font-medium text-muted-foreground">
                {freeShippingProgress}%
              </span>
            </div>
            <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>

          {/* Line Items List */}
          <div className="bg-card rounded-xs border border-border divide-y divide-border/60 overflow-hidden shadow-xs">
            {cart.items.map((item) => (
              <div key={item.id} className="p-4 sm:p-6 flex gap-3.5 sm:gap-6 items-start">
                {/* Product Thumbnail in Luxury Portrait */}
                <div className="relative w-20 sm:w-28 aspect-[3/4] rounded-xs bg-stone-100 border border-border/80 flex-shrink-0 overflow-hidden">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 96px, 112px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground uppercase tracking-wider">
                      Textile
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                    <div>
                      <Link
                        href={`/products/${item.productSlug}`}
                        className="font-serif text-base sm:text-lg font-normal text-foreground hover:text-champagne-dark transition line-clamp-1"
                      >
                        {item.productName}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground/70 font-mono mt-0.5">
                        SKU: {item.sku}
                      </p>
                    </div>

                    <div className="text-left sm:text-right pt-1 sm:pt-0">
                      <span className="font-serif text-base sm:text-lg font-bold text-foreground">
                        {formatInr(item.totalPriceInr)}
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        {formatInr(item.unitPriceInr)} each
                      </p>
                    </div>
                  </div>

                  {/* Quantity and Remove Controls */}
                  <div className="pt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center border border-border rounded-xs bg-background">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.quantity > 1) {
                            updateQuantity(item.id, item.quantity - 1);
                          } else {
                            removeItem(item.id);
                          }
                        }}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition"
                        aria-label={`Decrease quantity of ${item.productName}`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-xs font-semibold text-foreground font-mono">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.availableStock}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition"
                        aria-label={`Increase quantity of ${item.productName}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-xs text-muted-foreground hover:text-rose-700 font-medium flex items-center gap-1.5 transition"
                      aria-label={`Remove ${item.productName} from bag`}
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
                      <span>Remove</span>
                    </button>
                  </div>

                  {item.quantity >= item.availableStock && (
                    <p className="text-[11px] text-amber-700 pt-1">
                      Available atelier inventory limit reached ({item.availableStock} units).
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link
              href="/products"
              className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition font-medium flex items-center gap-1.5"
            >
              <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Continue Exploring
            </Link>
          </div>
        </div>

        {/* Order Summary Column (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-card p-4 sm:p-7 rounded-xs border border-border shadow-xs space-y-6 sticky top-28">
            <h2 className="font-serif text-xl font-normal text-foreground border-b border-border pb-4">
              Order Summary
            </h2>

            <div className="space-y-3 text-xs sm:text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Creations Subtotal</span>
                <span className="font-medium text-foreground">{formatInr(subtotalInr)}</span>
              </div>

              <div className="flex justify-between">
                <span>Shipping & Handling</span>
                <span className="font-medium">
                  {shippingFeeInr === 0 ? (
                    <span className="text-emerald-700 font-medium">Complimentary</span>
                  ) : (
                    formatInr(shippingFeeInr)
                  )}
                </span>
              </div>

              <div className="flex justify-between text-muted-foreground/80">
                <span>GST (18% inclusive breakdown)</span>
                <span>{formatInr(gstInr)}</span>
              </div>

              <div className="border-t border-border pt-4 flex justify-between items-baseline text-base font-semibold text-foreground">
                <span>Total Payable</span>
                <span className="font-serif text-xl font-bold text-foreground">
                  {formatInr(totalInr)}
                </span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="w-full py-4 bg-primary hover:bg-charcoal text-primary-foreground text-xs uppercase tracking-widest font-medium transition flex items-center justify-center gap-2 shadow-xs"
            >
              Proceed to Checkout <ArrowRight className="w-4 h-4" />
            </Link>

            {/* Trust Assurances */}
            <div className="pt-2 border-t border-border/60 space-y-2.5 text-[11px] text-muted-foreground">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-champagne-dark flex-shrink-0 mt-0.5" />
                <span>100% Certified Authentic Artisanal Handlooms</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Truck className="w-4 h-4 text-champagne-dark flex-shrink-0 mt-0.5" />
                <span>Insured Express Courier with Delhivery & Blue Dart</span>
              </div>
              <div className="flex items-start gap-2.5">
                <RotateCcw className="w-4 h-4 text-champagne-dark flex-shrink-0 mt-0.5" />
                <span>Complimentary 7-Day Hassle-Free Returns</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
