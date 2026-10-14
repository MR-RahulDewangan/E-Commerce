'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { formatInr } from '@/lib/utils';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

const FREE_SHIPPING_THRESHOLD_INR = 999;

export function CartDrawer() {
  const { cart, isCartDrawerOpen, closeCartDrawer, updateQuantity, removeItem, itemCount } =
    useCart();

  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCartDrawerOpen) {
        closeCartDrawer();
      }
    };
    if (isCartDrawerOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCartDrawerOpen, closeCartDrawer]);

  if (!isCartDrawerOpen) return null;

  const subtotalInr = cart?.pricing.subtotalAfterDiscountPaise
    ? cart.pricing.subtotalAfterDiscountPaise / 100
    : 0;

  const freeShippingProgress = Math.min(
    100,
    Math.round((subtotalInr / FREE_SHIPPING_THRESHOLD_INR) * 100)
  );
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD_INR - subtotalInr);

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag Drawer"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-charcoal/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={closeCartDrawer}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-card border-l border-border shadow-2xl flex flex-col text-card-foreground animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border flex items-center justify-between bg-card">
            <div className="flex items-baseline gap-2 sm:gap-3">
              <h2 className="font-serif text-xl sm:text-2xl font-normal tracking-tight text-foreground">
                Shopping Bag
              </h2>
              <span className="text-[11px] sm:text-xs uppercase tracking-widest text-muted-foreground font-medium">
                {itemCount} {itemCount === 1 ? 'Creation' : 'Creations'}
              </span>
            </div>
            <button
              type="button"
              onClick={closeCartDrawer}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Close shopping bag drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Complimentary Delivery Progress Indicator */}
          {cart && cart.items.length > 0 && (
            <div className="bg-stone-50 border-b border-stone-200 px-4 sm:px-6 py-3 sm:py-3.5 text-xs text-charcoal">
              <div className="flex justify-between items-center mb-2">
                {remainingForFreeShipping > 0 ? (
                  <span className="text-muted-foreground text-[11px] sm:text-xs">
                    Add <strong className="font-semibold text-foreground">{formatInr(remainingForFreeShipping)}</strong> more for complimentary delivery.
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-medium text-foreground text-[11px] sm:text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-champagne-dark" />
                    Complimentary White-Glove Delivery Unlocked
                  </span>
                )}
                <span className="text-[10px] sm:text-[11px] font-mono font-medium text-muted-foreground">
                  {freeShippingProgress}%
                </span>
              </div>
              <div className="w-full bg-stone-200 h-1 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${freeShippingProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Items Container */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 divide-y divide-border/60">
            {!cart || cart.items.length === 0 ? (
              <div className="text-center py-20 space-y-5">
                <div className="w-16 h-16 mx-auto rounded-full bg-stone-100 border border-stone-200 text-muted-foreground flex items-center justify-center">
                  <ShoppingBag className="w-7 h-7 stroke-[1.25]" />
                </div>
                <div className="space-y-1.5 max-w-xs mx-auto">
                  <p className="font-serif text-xl font-normal text-foreground">
                    Your Shopping Bag is Empty
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Explore our curated treasury of handcrafted handlooms, heritage silks, and artisanal garments.
                  </p>
                </div>
                <Link
                  href="/products"
                  onClick={closeCartDrawer}
                  className="inline-block px-6 py-2.5 bg-primary text-primary-foreground text-xs uppercase tracking-widest font-medium hover:bg-charcoal transition shadow-xs"
                >
                  Explore Collections
                </Link>
              </div>
            ) : (
              cart.items.map((item) => (
                <div key={item.id} className="py-5 first:pt-0 last:pb-0 flex gap-4">
                  {/* Thumbnail */}
                  <div className="w-20 aspect-[3/4] bg-stone-100 border border-border/70 rounded-xs flex-shrink-0 relative overflow-hidden">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground uppercase tracking-wider">
                        Textile
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <Link
                        href={`/products/${item.productSlug}`}
                        onClick={closeCartDrawer}
                        className="font-serif text-sm font-normal text-foreground hover:text-champagne-dark transition line-clamp-1"
                      >
                        {item.productName}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{item.name}</p>
                      <p className="text-xs font-medium text-foreground mt-1.5">
                        {formatInr(item.unitPriceInr)}
                      </p>
                    </div>

                    {/* Quantity Controls & Remove */}
                    <div className="flex items-center justify-between pt-2">
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
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-medium text-foreground">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.availableStock}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition"
                          aria-label={`Increase quantity of ${item.productName}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-muted-foreground hover:text-rose-700 transition p-1.5"
                        aria-label={`Remove ${item.productName} from shopping bag`}
                      >
                        <Trash2 className="w-4 h-4 stroke-[1.5]" />
                      </button>
                    </div>

                    {item.quantity >= item.availableStock && (
                      <p className="text-[10px] text-amber-700 mt-1">
                        Maximum available atelier reserve ({item.availableStock}).
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Summary & Checkout CTA */}
          {cart && cart.items.length > 0 && (
            <div className="p-4 sm:p-6 border-t border-border bg-stone-50/70 space-y-4">
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Atelier Subtotal</span>
                  <span className="font-medium text-foreground">{formatInr(subtotalInr)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping & Handling</span>
                  <span className="font-medium text-foreground">
                    {cart.pricing.shippingFeePaise === 0 ? (
                      <span className="text-emerald-700 font-medium">Complimentary</span>
                    ) : (
                      formatInr(cart.pricing.shippingFeePaise / 100)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground/80">
                  <span>GST (18% inclusive breakdown)</span>
                  <span>{formatInr(cart.pricing.tax.totalGstPaise / 100)}</span>
                </div>
                <div className="border-t border-border pt-2.5 flex justify-between text-sm font-semibold text-foreground">
                  <span>Total Payable</span>
                  <span className="text-base font-serif font-bold">
                    {formatInr(cart.pricing.totalPayablePaise / 100)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <Link
                  href="/checkout"
                  onClick={closeCartDrawer}
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary hover:bg-charcoal text-primary-foreground text-xs uppercase tracking-widest font-medium transition shadow-xs"
                >
                  Proceed to Checkout <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/cart"
                  onClick={closeCartDrawer}
                  className="block text-center py-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition font-medium"
                >
                  View Detailed Bag & Summary
                </Link>
              </div>

              <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-champagne-dark" />
                <span>100% Authentic Handloom • Insured Express Transit</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
