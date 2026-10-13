'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { formatInr } from '@/lib/utils';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';

const FREE_SHIPPING_THRESHOLD_INR = 999;

export function CartDrawer() {
  const { cart, isCartDrawerOpen, closeCartDrawer, updateQuantity, removeItem, itemCount } =
    useCart();

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
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={closeCartDrawer}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-zinc-900 text-lg">Your Cart ({itemCount})</h2>
            </div>
            <button
              type="button"
              onClick={closeCartDrawer}
              className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition"
              aria-label="Close cart drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress Indicator */}
          {cart && cart.items.length > 0 && (
            <div className="bg-emerald-50 p-3 border-b border-emerald-100 text-xs">
              <div className="flex justify-between font-medium text-emerald-900 mb-1.5">
                {remainingForFreeShipping > 0 ? (
                  <span>
                    Add <strong className="text-emerald-700">{formatInr(remainingForFreeShipping)}</strong> more for Free Delivery!
                  </span>
                ) : (
                  <span className="font-bold text-emerald-700">🎉 You have unlocked Free Delivery!</span>
                )}
                <span>{freeShippingProgress}%</span>
              </div>
              <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${freeShippingProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Items Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!cart || cart.items.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 mx-auto bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-800 text-base">Your cart is empty</p>
                  <p className="text-zinc-500 text-xs mt-1">Discover handcrafted Indian apparel & textiles.</p>
                </div>
                <Link
                  href="/products"
                  onClick={closeCartDrawer}
                  className="inline-block px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition"
                >
                  Start Shopping
                </Link>
              </div>
            ) : (
              cart.items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-lg relative"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-20 rounded bg-zinc-200 flex-shrink-0 relative overflow-hidden">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-zinc-400">
                        No image
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-900 truncate">{item.productName}</p>
                    <p className="text-xs text-zinc-500 truncate">{item.name}</p>
                    <p className="text-xs font-bold text-zinc-900 mt-1">
                      {formatInr(item.unitPriceInr)}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center border border-zinc-300 rounded bg-white">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.quantity > 1) {
                              updateQuantity(item.id, item.quantity - 1);
                            } else {
                              removeItem(item.id);
                            }
                          }}
                          className="p-1 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 text-xs font-semibold text-zinc-800">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.availableStock}
                          className="p-1 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-40"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-zinc-400 hover:text-rose-600 transition"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Summary & Checkout CTA */}
          {cart && cart.items.length > 0 && (
            <div className="p-4 border-t border-zinc-200 bg-zinc-50 space-y-3">
              <div className="space-y-1.5 text-xs text-zinc-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-zinc-900">{formatInr(subtotalInr)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Delivery</span>
                  <span className="font-semibold text-zinc-900">
                    {cart.pricing.shippingFeePaise === 0 ? (
                      <span className="text-emerald-600 font-bold">FREE</span>
                    ) : (
                      formatInr(cart.pricing.shippingFeePaise / 100)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>GST (18% inclusive)</span>
                  <span>{formatInr(cart.pricing.tax.totalGstPaise / 100)}</span>
                </div>
                <div className="border-t border-zinc-200 pt-2 flex justify-between text-sm font-bold text-zinc-900">
                  <span>Total Payable</span>
                  <span>{formatInr(cart.pricing.totalPayablePaise / 100)}</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <Link
                  href="/checkout"
                  onClick={closeCartDrawer}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm shadow-md transition"
                >
                  Proceed to Checkout <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/cart"
                  onClick={closeCartDrawer}
                  className="block text-center py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition"
                >
                  View Full Cart & Summary
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
