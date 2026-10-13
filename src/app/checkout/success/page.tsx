import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { formatInr } from '@/lib/utils';
import { CheckCircle2, Clock, Printer, Package, ArrowRight, ShieldCheck, Truck } from 'lucide-react';
import { OrderStatus } from '@prisma/client';

interface SuccessPageProps {
  searchParams: Promise<{ orderNumber?: string }>;
}

export default async function OrderSuccessPage({ searchParams }: SuccessPageProps) {
  const { orderNumber } = await searchParams;

  if (!orderNumber) {
    notFound();
  }

  const order = await db.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      transactions: true,
    },
  });

  if (!order) {
    notFound();
  }

  const address = order.shippingAddressSnapshot as {
    recipientName: string;
    phoneNumber: string;
    streetLine1: string;
    streetLine2?: string;
    city: string;
    stateProvince: string;
    postalCode: string;
    countryCode: string;
  };

  const isPaid = order.status === OrderStatus.PAID;
  const isAwaitingPayment = order.status === OrderStatus.AWAITING_PAYMENT;

  const subtotal = Number(order.subtotal);
  const taxAmount = Number(order.taxAmount);
  const shippingCost = Number(order.shippingCost);
  const totalAmount = Number(order.totalAmount);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Confirmation Banner */}
      <div className="text-center space-y-3 bg-white p-8 rounded-2xl border border-zinc-200 shadow-xs">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
          {isPaid ? (
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          ) : (
            <Clock className="w-10 h-10 text-amber-600" />
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
          {isPaid ? 'Thank You for Your Order!' : 'Order Placed — Cash on Delivery'}
        </h1>

        <p className="text-xs sm:text-sm text-zinc-500 max-w-md mx-auto">
          {isPaid
            ? `Your payment has been successfully authorized. Stock is reserved and dispatched.`
            : `Your order is confirmed. Payment of ${formatInr(totalAmount)} is due upon courier delivery.`}
        </p>

        <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 rounded-full text-xs font-mono text-zinc-800">
          Order Number: <strong>{order.orderNumber}</strong>
        </div>
      </div>

      {/* Printable GST Tax Invoice Document */}
      <div className="bg-white p-6 sm:p-10 rounded-2xl border border-zinc-200 shadow-xs space-y-8">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-zinc-200 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-base">
                B
              </div>
              <span className="font-extrabold text-xl text-zinc-900">BharatStore</span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">Tax Invoice / Delivery Bill of Supply</p>
            <p className="text-[11px] text-zinc-400">GSTIN: 29AABCB1234F1Z6 (Karnataka)</p>
          </div>

          <div className="text-right sm:text-right space-y-1 text-xs text-zinc-600">
            <p>
              <span className="text-zinc-400">Invoice Date:</span>{' '}
              {new Date(order.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
            <p>
              <span className="text-zinc-400">Payment Method:</span>{' '}
              <strong className="text-zinc-900">{order.paymentMethod}</strong>
            </p>
            <p>
              <span className="text-zinc-400">Order Status:</span>{' '}
              <span
                className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                  isPaid
                    ? 'bg-emerald-100 text-emerald-800'
                    : isAwaitingPayment
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-zinc-100 text-zinc-800'
                }`}
              >
                {order.status}
              </span>
            </p>
          </div>
        </div>

        {/* Customer & Delivery Address Snapshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-zinc-600 border-b border-zinc-200 pb-6">
          <div>
            <h3 className="font-bold text-zinc-900 text-xs uppercase tracking-wider mb-2">
              Customer Details
            </h3>
            <p className="font-semibold text-zinc-800">{order.customerName}</p>
            <p>{order.customerEmail}</p>
            <p>Phone: +91 {order.customerPhone}</p>
          </div>

          <div>
            <h3 className="font-bold text-zinc-900 text-xs uppercase tracking-wider mb-2">
              Delivery Address Snapshot
            </h3>
            <p className="font-semibold text-zinc-800">{address.recipientName}</p>
            <p>{address.streetLine1}</p>
            {address.streetLine2 && <p>{address.streetLine2}</p>}
            <p>
              {address.city}, {address.stateProvince} — {address.postalCode}
            </p>
            <p>India (IN)</p>
          </div>
        </div>

        {/* Itemized Snapshot Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-400 uppercase text-[10px] tracking-wider">
                <th className="py-2">Item Description</th>
                <th className="py-2">SKU</th>
                <th className="py-2 text-right">Unit Price</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Total (incl. GST)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {order.items.map((item) => (
                <tr key={item.id} className="text-zinc-700">
                  <td className="py-3 font-semibold text-zinc-900">{item.nameSnapshot}</td>
                  <td className="py-3 font-mono text-zinc-400">{item.skuSnapshot}</td>
                  <td className="py-3 text-right">{formatInr(Number(item.unitPrice))}</td>
                  <td className="py-3 text-center font-bold">{item.quantity}</td>
                  <td className="py-3 text-right font-extrabold text-zinc-900">
                    {formatInr(Number(item.unitPrice) * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Tax Calculation Breakdown */}
        <div className="border-t border-zinc-200 pt-4 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="text-xs text-zinc-500 space-y-1">
            <p className="font-semibold text-zinc-700">GST Compliance Note:</p>
            <p>All items billed with inclusive 18% GST (CGST 9% + SGST 9% / IGST 18%).</p>
            <p>Permanent address snapshot captured at order placement time.</p>
          </div>

          <div className="w-full sm:w-64 space-y-2 text-xs text-zinc-600">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-semibold text-zinc-900">{formatInr(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee:</span>
              <span className="font-semibold">
                {shippingCost === 0 ? (
                  <span className="text-emerald-700 font-bold">FREE</span>
                ) : (
                  formatInr(shippingCost)
                )}
              </span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>Included 18% GST:</span>
              <span>{formatInr(taxAmount)}</span>
            </div>
            <div className="border-t border-zinc-200 pt-2 flex justify-between text-sm font-extrabold text-zinc-900">
              <span>Total Amount:</span>
              <span className="text-emerald-700">{formatInr(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Links */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/products"
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
        >
          <ArrowRight className="w-4 h-4 rotate-180" /> Continue Shopping
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/account/orders"
            className="px-4 py-2 border border-zinc-300 rounded-lg text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition flex items-center gap-1.5"
          >
            <Package className="w-4 h-4" /> View My Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
