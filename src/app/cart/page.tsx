'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { formatInr } from '@/lib/utils';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Truck } from 'lucide-react';

const FREE_SHIPPING_THRESHOLD_INR = 999;

export default function CartPage() {
  const { cart, isLoading, updateQuantity, removeItem, itemCount } = useCart();

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

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-4">
        <div className="w-20 h-20 mx-auto bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">Your Shopping Cart is Empty</h1>
        <p className="text-sm text-zinc-500 max-w-sm mx-auto">
          Explore handcrafted handloom fabrics, silk sarees, kurtas, and artisanal treasures from across India.
        </p>
        <Link
          href="/products"
          className="inline-block mt-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition text-sm"
        >
          Explore Catalog
        </Link>
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
          Shopping Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          Items in your cart are subject to live stock reservation during checkout.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Line Items Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Free Shipping Alert Bar */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-emerald-950">
              {remainingForFreeShipping > 0 ? (
                <span>
                  Add <strong className="text-emerald-700">{formatInr(remainingForFreeShipping)}</strong> more to get Free Delivery!
                </span>
              ) : (
                <span className="text-emerald-700 font-bold">
                  🎉 Congratulations! Your order qualifies for Free Delivery.
                </span>
              )}
              <span>{freeShippingProgress}%</span>
            </div>
            <div className="w-full bg-emerald-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>

          {/* Line Items List */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs divide-y divide-zinc-100 overflow-hidden">
            {cart.items.map((item) => (
              <div key={item.id} className="p-4 sm:p-6 flex gap-4 sm:gap-6 items-start">
                {/* Product Thumbnail */}
                <div className="relative w-20 h-28 sm:w-24 sm:h-32 rounded-lg bg-zinc-100 border border-zinc-200 flex-shrink-0 overflow-hidden">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-zinc-400">
                      No Image
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <Link
                    href={`/products/${item.productSlug}`}
                    className="font-bold text-sm sm:text-base text-zinc-900 hover:text-emerald-700 transition line-clamp-1"
                  >
                    {item.productName}
                  </Link>
                  <p className="text-xs text-zinc-500">{item.name}</p>
                  <p className="text-xs text-zinc-400 font-mono">SKU: {item.sku}</p>

                  <div className="pt-2 flex items-baseline gap-2">
                    <span className="font-extrabold text-sm sm:text-base text-zinc-900">
                      {formatInr(item.totalPriceInr)}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      ({formatInr(item.unitPriceInr)} each)
                    </span>
                  </div>

                  {/* Quantity and Remove Controls */}
                  <div className="pt-3 flex items-center gap-4">
                    <div className="flex items-center border border-zinc-300 rounded-lg bg-white">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.quantity > 1) {
                            updateQuantity(item.id, item.quantity - 1);
                          } else {
                            removeItem(item.id);
                          }
                        }}
                        className="p-1.5 text-zinc-600 hover:text-zinc-900"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-xs font-bold text-zinc-900">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.availableStock}
                        className="p-1.5 text-zinc-600 hover:text-zinc-900 disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary Card */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <h2 className="text-base font-extrabold text-zinc-900 border-b border-zinc-100 pb-3">
              Order Summary
            </h2>

            <div className="space-y-2.5 text-xs sm:text-sm text-zinc-600">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-semibold text-zinc-900">{formatInr(subtotalInr)}</span>
              </div>

              <div className="flex justify-between">
                <span>Estimated Delivery</span>
                <span className="font-semibold">
                  {shippingFeeInr === 0 ? (
                    <span className="text-emerald-700 font-bold">FREE</span>
                  ) : (
                    formatInr(shippingFeeInr)
                  )}
                </span>
              </div>

              <div className="flex justify-between text-zinc-500">
                <span>Inclusive GST (18%)</span>
                <span>{formatInr(gstInr)}</span>
              </div>

              <div className="border-t border-zinc-200 pt-3 flex justify-between text-base font-extrabold text-zinc-900">
                <span>Total Amount</span>
                <span className="text-emerald-700">{formatInr(totalInr)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm"
            >
              Proceed to Checkout <ArrowRight className="w-4 h-4" />
            </Link>

            <div className="pt-2 space-y-2 text-[11px] text-zinc-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Safe & Secure Checkout</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>Dispatched through Delhivery & Blue Dart</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
