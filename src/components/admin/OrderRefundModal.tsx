'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  RotateCcw,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  Boxes,
} from 'lucide-react';

interface OrderRefundModalProps {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  isRefunded: boolean;
}

export function OrderRefundModal({
  orderId,
  orderNumber,
  totalAmount,
  isRefunded,
}: OrderRefundModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [amountRupees, setAmountRupees] = useState<string>(totalAmount.toFixed(2));
  const [reason, setReason] = useState('Customer cancellation / return request');
  const [restockInventory, setRestockInventory] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (isRefunded) {
    return null;
  }

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const parsedRupees = parseFloat(amountRupees);
    if (isNaN(parsedRupees) || parsedRupees <= 0) {
      setError('Please specify a valid refund amount in INR (₹).');
      return;
    }

    const amountPaise = Math.round(parsedRupees * 100);

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/admin/orders/${orderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountPaise,
          reason: reason.trim(),
          restockInventory,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Refund processing failed.');
      }

      setSuccess(data.message || 'Refund processed successfully.');
      setTimeout(() => {
        setIsOpen(false);
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during refund processing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setError(null);
          setSuccess(null);
        }}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition shadow-xs"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Initiate Gateway Refund</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-extrabold text-zinc-900 text-base">Process Order Refund</h3>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">{orderNumber}</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {success && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRefundSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Refund Amount (INR ₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={totalAmount}
                    required
                    value={amountRupees}
                    onChange={(e) => setAmountRupees(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <p className="text-[11px] text-zinc-400">
                  Maximum refundable value: ₹{totalAmount.toFixed(2)}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Reason for Refund *
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Defective fabric, return accepted..."
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restockInventory}
                    onChange={(e) => setRestockInventory(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-zinc-800 block">Restock Inventory</span>
                    <span className="text-zinc-500 text-[11px]">
                      Automatically return ordered items back to physical stock and record audit entry.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing Refund...</span>
                    </>
                  ) : (
                    <span>Confirm & Refund</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
