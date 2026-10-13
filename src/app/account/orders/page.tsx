'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { formatInr } from '@/lib/utils';
import { Package, Clock, ArrowRight, XCircle, FileText, Loader2, AlertCircle } from 'lucide-react';
import { OrderStatus } from '@prisma/client';

interface CustomerOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: string;
  totalAmount: number;
  createdAt: string;
  items: Array<{
    id: string;
    nameSnapshot: string;
    skuSnapshot: string;
    unitPrice: number;
    quantity: number;
  }>;
}

export default function CustomerOrdersPage() {
  const { user, openAuthModal } = useAuth();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/orders', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setOrders(json.data.orders);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchOrders();
    } else {
      setIsLoading(false);
    }
  }, [user, fetchOrders]);

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order? Stock will be restocked immediately.')) {
      return;
    }
    setCancellingId(orderId);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/v1/orders/${orderId}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error?.message || 'Failed to cancel order.');
      } else {
        await fetchOrders();
      }
    } catch {
      setErrorMessage('Network error while cancelling order.');
    } finally {
      setCancellingId(null);
    }
  };

  if (!user && !isLoading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <Package className="w-12 h-12 mx-auto text-zinc-400" />
        <h2 className="text-xl font-bold text-zinc-900">Sign In Required</h2>
        <p className="text-xs text-zinc-500">Please sign in to your account to view your past orders.</p>
        <button
          type="button"
          onClick={() => openAuthModal('login')}
          className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-bold"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
          My Order History
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          Review recent purchases, download tax invoices, and track delivery status.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-zinc-200 p-8 space-y-4">
          <div className="w-16 h-16 mx-auto bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center">
            <Package className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900">No Orders Yet</h2>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            You haven&apos;t placed any orders yet. Discover handwoven apparel in our catalog.
          </p>
          <Link
            href="/products"
            className="inline-block px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isEligibleCancel = ['PENDING', 'AWAITING_PAYMENT', 'PAID'].includes(order.status);

            return (
              <div
                key={order.id}
                className="bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                  <div className="space-y-0.5">
                    <span className="text-xs text-zinc-400 font-mono">
                      Order #{order.orderNumber}
                    </span>
                    <p className="text-xs text-zinc-500">
                      Placed on{' '}
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        order.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.status === 'AWAITING_PAYMENT'
                          ? 'bg-amber-100 text-amber-800'
                          : order.status === 'CANCELLED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-zinc-100 text-zinc-800'
                      }`}
                    >
                      {order.status}
                    </span>

                    <span className="font-extrabold text-sm sm:text-base text-zinc-900">
                      {formatInr(Number(order.totalAmount))}
                    </span>
                  </div>
                </div>

                {/* Items preview */}
                <div className="space-y-2 text-xs">
                  {order.items.map((it) => (
                    <div key={it.id} className="flex justify-between text-zinc-700">
                      <span>
                        {it.quantity}x {it.nameSnapshot}
                      </span>
                      <span className="font-semibold">{formatInr(Number(it.unitPrice) * it.quantity)}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100">
                  <Link
                    href={`/checkout/success?orderNumber=${encodeURIComponent(order.orderNumber)}`}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 transition"
                  >
                    <FileText className="w-3.5 h-3.5" /> View GST Invoice & Details
                  </Link>

                  {isEligibleCancel && (
                    <button
                      type="button"
                      onClick={() => handleCancelOrder(order.id)}
                      disabled={cancellingId === order.id}
                      className="text-xs font-medium text-rose-600 hover:text-rose-700 flex items-center gap-1 disabled:opacity-50 transition"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Cancel Order
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
