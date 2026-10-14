import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { formatInr } from '@/lib/utils';
import { CheckCircle2, Clock, Package, ArrowRight, ShieldCheck, Truck, Sparkles } from 'lucide-react';
import { OrderStatus } from '@prisma/client';
import { PrintInvoiceButton } from '@/components/checkout/PrintInvoiceButton';

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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Confirmation Hero Banner */}
      <div className="text-center space-y-4 bg-card p-8 sm:p-10 rounded-xs border border-border shadow-xs">
        <div className="w-16 h-16 mx-auto rounded-full bg-stone-100 border border-border text-foreground flex items-center justify-center">
          {isPaid ? (
            <CheckCircle2 className="w-8 h-8 text-champagne-dark stroke-[1.5]" />
          ) : (
            <Clock className="w-8 h-8 text-amber-700 stroke-[1.5]" />
          )}
        </div>

        <div className="space-y-1.5 max-w-lg mx-auto">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
            Atelier Confirmation Certificate
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-foreground tracking-tight">
            {isPaid ? 'Thank You for Your Order' : 'Order Placed — Cash on Delivery'}
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isPaid
              ? `Your payment has been successfully authorized. Your handcrafted creations are reserved in our atelier and scheduled for courier dispatch.`
              : `Your order is confirmed. Payment of ${formatInr(totalAmount)} is due upon white-glove courier delivery.`}
          </p>
        </div>

        <div className="pt-2 flex flex-wrap justify-center items-center gap-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-stone-100 border border-stone-200/80 rounded-full text-xs font-mono text-foreground">
            <span className="text-muted-foreground">Order Ref:</span>
            <strong>{order.orderNumber}</strong>
          </div>
          <PrintInvoiceButton />
        </div>
      </div>

      {/* Official Printable GST Tax Invoice Document */}
      <div className="bg-card p-6 sm:p-10 rounded-xs border border-border shadow-xs space-y-8">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-border pb-6 gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-serif text-2xl font-light tracking-widest text-foreground uppercase">
                BharatStore
              </span>
              <span className="text-[10px] tracking-widest uppercase font-serif text-champagne-dark border-l border-border pl-2.5">
                Maison
              </span>
            </div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1.5 font-medium">
              Tax Invoice / Delivery Bill of Supply
            </p>
            <p className="text-[11px] font-mono text-muted-foreground/80 mt-0.5">
              GSTIN: 29AABCB1234F1Z6 (Karnataka, India)
            </p>
          </div>

          <div className="sm:text-right space-y-1 text-xs text-muted-foreground">
            <p>
              <span className="text-muted-foreground/70">Invoice Date:</span>{' '}
              <span className="text-foreground font-medium">
                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground/70">Payment Atelier:</span>{' '}
              <strong className="text-foreground">{order.paymentMethod}</strong>
            </p>
            <p className="pt-1">
              <span
                className={`inline-block font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-2xs font-semibold ${
                  isPaid
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : isAwaitingPayment
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-stone-100 text-stone-800 border border-stone-200'
                }`}
              >
                Status: {order.status}
              </span>
            </p>
          </div>
        </div>

        {/* Customer & Delivery Address Snapshot (Preserving Rule 2.3) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs border-b border-border pb-6">
          <div className="space-y-1 text-muted-foreground">
            <h3 className="font-serif text-sm font-semibold text-foreground uppercase tracking-wider mb-2">
              Billed To
            </h3>
            <p className="font-medium text-foreground">{order.customerName}</p>
            <p>{order.customerEmail}</p>
            <p className="font-mono text-[11px]">Phone: +91 {order.customerPhone}</p>
          </div>

          <div className="space-y-1 text-muted-foreground">
            <h3 className="font-serif text-sm font-semibold text-foreground uppercase tracking-wider mb-2">
              Immutable Delivery Address Snapshot
            </h3>
            <p className="font-medium text-foreground">{address.recipientName}</p>
            <p>{address.streetLine1}</p>
            {address.streetLine2 && <p>{address.streetLine2}</p>}
            <p>
              {address.city}, {address.stateProvince} — <span className="font-mono">{address.postalCode}</span>
            </p>
            <p className="font-mono text-[11px]">Country: {address.countryCode} (India)</p>
          </div>
        </div>

        {/* Itemized Snapshot Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-medium">
                <th className="py-3">Creation Description</th>
                <th className="py-3">SKU Snapshot</th>
                <th className="py-3 text-right">Unit Price</th>
                <th className="py-3 text-center">Qty</th>
                <th className="py-3 text-right">Total (incl. GST)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {order.items.map((item) => (
                <tr key={item.id} className="text-muted-foreground">
                  <td className="py-3.5 font-serif text-sm text-foreground">{item.nameSnapshot}</td>
                  <td className="py-3.5 font-mono text-[11px] text-muted-foreground/80">{item.skuSnapshot}</td>
                  <td className="py-3.5 text-right font-mono">{formatInr(Number(item.unitPrice))}</td>
                  <td className="py-3.5 text-center font-mono font-medium text-foreground">{item.quantity}</td>
                  <td className="py-3.5 text-right font-serif text-sm font-bold text-foreground">
                    {formatInr(Number(item.unitPrice) * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Tax Calculation Breakdown */}
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row justify-between items-start gap-6">
          <div className="text-xs text-muted-foreground space-y-1.5 max-w-sm">
            <p className="font-medium text-foreground uppercase tracking-wider text-[11px]">
              GST Statutory Compliance Note:
            </p>
            <p className="leading-relaxed">
              All items are billed inclusive of 18% GST (CGST 9% + SGST 9% for intra-state, or IGST 18% for inter-state supply).
            </p>
            <p className="text-[11px] text-muted-foreground/70">
              Permanent snapshot captured at order creation time pursuant to Indian tax regulations.
            </p>
          </div>

          <div className="w-full sm:w-72 space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Creations Subtotal:</span>
              <span className="font-medium text-foreground">{formatInr(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee:</span>
              <span className="font-medium">
                {shippingCost === 0 ? (
                  <span className="text-emerald-700 font-medium">Complimentary</span>
                ) : (
                  formatInr(shippingCost)
                )}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground/80">
              <span>Included 18% GST:</span>
              <span>{formatInr(taxAmount)}</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between items-baseline text-sm font-semibold text-foreground">
              <span>Total Paid / Due:</span>
              <span className="font-serif text-xl font-bold text-foreground">
                {formatInr(totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <Link
          href="/products"
          className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-1.5 font-medium transition"
        >
          <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Continue Exploring Collections
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/account/orders"
            className="px-5 py-2.5 border border-border rounded-xs text-xs uppercase tracking-wider font-medium text-foreground hover:bg-muted transition flex items-center gap-2"
          >
            <Package className="w-4 h-4 stroke-[1.5]" /> View Order History
          </Link>
        </div>
      </div>
    </div>
  );
}
