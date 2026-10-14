'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { formatInr } from '@/lib/utils';
import { Package, XCircle, FileText, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { OrderStatus } from '@prisma/client';
import { AccountNav } from '@/components/account/AccountNav';

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
    if (!confirm('Are you sure you wish to cancel this order? Stock will be immediately restored to the atelier.')) {
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
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-full bg-stone-100 border border-border text-muted-foreground flex items-center justify-center">
          <Package className="w-7 h-7 stroke-[1.25]" />
        </div>
        <h2 className="font-serif text-2xl font-normal text-foreground">Sign In Required</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Please sign in to access your order history and printable tax invoices.
        </p>
        <button
          type="button"
          onClick={() => openAuthModal('login')}
          className="inline-block px-6 py-3 bg-primary hover:bg-charcoal text-primary-foreground text-xs uppercase tracking-widest font-medium transition shadow-xs cursor-pointer"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      <AccountNav />

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xs text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-700 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xs border border-border p-8 space-y-5 text-card-foreground">
          <div className="w-16 h-16 mx-auto rounded-full bg-stone-100 border border-border text-muted-foreground flex items-center justify-center">
            <Package className="w-7 h-7 stroke-[1.25]" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h2 className="font-serif text-xl font-normal text-foreground">No Orders Recorded</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You haven&apos;t placed any orders yet. Discover exquisite handloom sarees, kurtas, and artisanal jewelry in our catalog.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-block px-6 py-3 bg-primary hover:bg-charcoal text-primary-foreground text-xs uppercase tracking-widest font-medium transition shadow-xs"
          >
            Explore Collections
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => {
            const isEligibleCancel = ['PENDING', 'AWAITING_PAYMENT', 'PAID'].includes(order.status);

            return (
              <div
                key={order.id}
                className="bg-card border border-border rounded-xs p-6 sm:p-7 shadow-xs space-y-5 text-card-foreground"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                  <div className="space-y-1">
                    <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                      Order: <strong className="text-foreground">{order.orderNumber}</strong>
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Placed on{' '}
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}{' '}
                      • Payment: <strong className="text-foreground">{order.paymentMethod}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span
                      className={`text-[10px] uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-2xs border ${
                        order.status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : order.status === 'AWAITING_PAYMENT'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : order.status === 'CANCELLED'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-stone-100 text-stone-800 border-stone-200'
                      }`}
                    >
                      {order.status}
                    </span>

                    <span className="font-serif text-lg font-bold text-foreground">
                      {formatInr(Number(order.totalAmount))}
                    </span>
                  </div>
                </div>

                {/* Items preview */}
                <div className="space-y-2 text-xs divide-y divide-border/40">
                  {order.items.map((it) => (
                    <div key={it.id} className="pt-2 first:pt-0 flex justify-between items-baseline text-muted-foreground">
                      <div>
                        <span className="font-serif text-foreground font-normal text-sm">{it.nameSnapshot}</span>
                        <span className="text-[11px] text-muted-foreground font-mono ml-2">({it.skuSnapshot})</span>
                        <span className="text-xs text-muted-foreground ml-2">× {it.quantity}</span>
                      </div>
                      <span className="font-medium text-foreground">
                        {formatInr(Number(it.unitPrice) * it.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Actions Footer */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border">
                  <Link
                    href={`/checkout/success?orderNumber=${encodeURIComponent(order.orderNumber)}`}
                    className="text-xs uppercase tracking-wider text-foreground hover:text-champagne-dark font-medium flex items-center gap-1.5 transition"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Official Tax Invoice & Certificate</span>
                  </Link>

                  {isEligibleCancel && (
                    <button
                      type="button"
                      onClick={() => handleCancelOrder(order.id)}
                      disabled={cancellingId === order.id}
                      className="text-xs uppercase tracking-wider text-muted-foreground hover:text-rose-700 font-medium flex items-center gap-1.5 disabled:opacity-50 transition cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{cancellingId === order.id ? 'Cancelling...' : 'Cancel Order'}</span>
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

