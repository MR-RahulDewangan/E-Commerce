'use client';

import React from 'react';
import { CreditCard, CheckCircle, Clock, Truck, XCircle, RotateCcw } from 'lucide-react';

interface OrderDistributionCardsProps {
  statusDistribution: { status: string; count: number; pct: number }[];
  paymentDistribution: { method: string; count: number; pct: number }[];
}

export function OrderDistributionCards({
  statusDistribution,
  paymentDistribution,
}: OrderDistributionCardsProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />;
      case 'SHIPPED':
        return <Truck className="w-3.5 h-3.5 text-blue-600" />;
      case 'PROCESSING':
      case 'PAID':
        return <Clock className="w-3.5 h-3.5 text-indigo-600" />;
      case 'CANCELLED':
        return <XCircle className="w-3.5 h-3.5 text-rose-600" />;
      case 'REFUNDED':
        return <RotateCcw className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Status Breakdown */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
        <h4 className="text-sm font-bold text-zinc-900 mb-1">Order Fulfillment Status</h4>
        <p className="text-xs text-zinc-500 mb-4">Lifecycle progress across customer orders</p>
        <div className="space-y-3">
          {statusDistribution.map((s) => (
            <div key={s.status} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {getStatusIcon(s.status)}
                <span className="font-semibold text-zinc-700">{s.status}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">{s.count} orders</span>
                <span className="font-bold text-zinc-900 w-12 text-right">{s.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Provider Breakdown */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
        <h4 className="text-sm font-bold text-zinc-900 mb-1">Payment Method Mix</h4>
        <p className="text-xs text-zinc-500 mb-4">Customer payment channel preferences</p>
        <div className="space-y-3">
          {paymentDistribution.map((p) => (
            <div key={p.method} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-semibold text-zinc-700">
                  {p.method === 'RAZORPAY' ? 'UPI, Cards & Netbanking' : (p.method === 'COD' ? 'Cash on Delivery (COD)' : 'Mock Gateway')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">{p.count} orders</span>
                <span className="font-bold text-zinc-900 w-12 text-right">{p.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
