'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OrderStatus } from '@prisma/client';
import {
  Truck,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface OrderStatusManagerProps {
  orderId: string;
  orderNumber: string;
  currentStatus: OrderStatus;
  currentCarrier?: string | null;
  currentTrackingNumber?: string | null;
}

const CARRIER_OPTIONS = [
  'Delhivery',
  'Blue Dart',
  'DTDC Express',
  'India Post (Speed Post)',
  'Shadowfax',
  'Ekart Logistics',
  'Other Express Courier',
];

export function OrderStatusManager({
  orderId,
  orderNumber,
  currentStatus,
  currentCarrier,
  currentTrackingNumber,
}: OrderStatusManagerProps) {
  const router = useRouter();

  const [targetStatus, setTargetStatus] = useState<OrderStatus>(() => {
    if (currentStatus === 'PAID' || currentStatus === 'AWAITING_PAYMENT') return 'PROCESSING';
    if (currentStatus === 'PROCESSING') return 'SHIPPED';
    if (currentStatus === 'SHIPPED') return 'DELIVERED';
    return currentStatus;
  });

  const [carrier, setCarrier] = useState<string>(currentCarrier || CARRIER_OPTIONS[0]);
  const [trackingNumber, setTrackingNumber] = useState<string>(currentTrackingNumber || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isTerminal = ['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(currentStatus);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (targetStatus === 'SHIPPED' && !trackingNumber.trim()) {
      setErrorMessage('A tracking number is required when updating order status to SHIPPED.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          carrier: targetStatus === 'SHIPPED' ? carrier : undefined,
          trackingNumber: targetStatus === 'SHIPPED' ? trackingNumber.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to update order status.');
      }

      setSuccessMessage(
        `Order ${orderNumber} updated to ${targetStatus}${
          data.data.trackingNumber ? ` (${data.data.carrier}: ${data.data.trackingNumber})` : ''
        }`
      );
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isTerminal) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-3">
        <h3 className="font-bold text-zinc-900 text-sm">Fulfillment Status</h3>
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            This order is in a terminal state (<span className="font-bold">{currentStatus}</span>).
            No further lifecycle updates are permissible.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-5">
      <div>
        <h3 className="font-bold text-zinc-900 text-base">Order Fulfillment & Dispatch</h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          Progress lifecycle status and attach courier tracking manifests.
        </p>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* State transition selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
            Next Lifecycle State *
          </label>
          <select
            value={targetStatus}
            onChange={(e) => setTargetStatus(e.target.value as OrderStatus)}
            className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            {(currentStatus === 'PAID' || currentStatus === 'AWAITING_PAYMENT') && (
              <>
                <option value="PROCESSING">PROCESSING (Packing & Preparing)</option>
                <option value="CANCELLED">CANCELLED (Refund & Restock)</option>
              </>
            )}
            {currentStatus === 'PROCESSING' && (
              <>
                <option value="SHIPPED">SHIPPED (Handed to Courier)</option>
                <option value="CANCELLED">CANCELLED (Refund & Restock)</option>
              </>
            )}
            {currentStatus === 'SHIPPED' && (
              <>
                <option value="DELIVERED">DELIVERED (Customer Received)</option>
              </>
            )}
          </select>
        </div>

        {/* Courier Details (visible when target is SHIPPED) */}
        {targetStatus === 'SHIPPED' && (
          <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
              <Truck className="w-4 h-4 text-purple-700" />
              <span>Courier Tracking Attachment</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-purple-800 block mb-1">
                  Logistics Carrier *
                </label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  {CARRIER_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-purple-800 block mb-1">
                  Air Waybill (AWB) / Tracking # *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DELHIVERY-1294829104"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || targetStatus === currentStatus}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Updating Lifecycle Status...</span>
            </>
          ) : (
            <span>Update Order Status to {targetStatus}</span>
          )}
        </button>
      </form>
    </div>
  );
}
