import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { OrderStatusManager } from '@/components/admin/OrderStatusManager';
import { OrderRefundModal } from '@/components/admin/OrderRefundModal';
import {
  ArrowLeft,
  ShoppingBag,
  MapPin,
  User,
  CreditCard,
  Truck,
  CheckCircle2,
  Calendar,
  Package,
} from 'lucide-react';

export const revalidate = 0; // Dynamic server component

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                include: {
                  images: { take: 1, orderBy: { sortOrder: 'asc' } },
                },
              },
            },
          },
        },
      },
      transactions: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const addr = (order.shippingAddressSnapshot as Record<string, any>) || {};

  const statusColor =
    order.status === 'PAID'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : order.status === 'PROCESSING'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : order.status === 'SHIPPED'
      ? 'bg-purple-50 text-purple-700 border-purple-200'
      : order.status === 'DELIVERED'
      ? 'bg-teal-50 text-teal-700 border-teal-200'
      : order.status === 'CANCELLED'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : 'bg-zinc-50 text-zinc-700 border-zinc-200';

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top back bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Orders</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Order Status:</span>
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${statusColor}`}
          >
            {order.status}
          </span>
        </div>
      </div>

      {/* Header Info */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-bold text-emerald-700 uppercase tracking-wider block">
            Tax Invoice Manifest
          </span>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight mt-0.5">
            {order.orderNumber}
          </h1>
          <p className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              Placed on{' '}
              {new Date(order.createdAt).toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </p>
        </div>
        <div className="text-left md:text-right">
          <span className="text-xs text-zinc-500 block">Total Order Value</span>
          <span className="text-2xl font-extrabold text-zinc-900">
            ₹{Number(order.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-zinc-400 block">Inclusive of 18% GST</span>
        </div>
      </div>

      {/* Grid: 2 columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 cols: Line items and Customer Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items Table */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="font-bold text-zinc-900 text-sm">Line Items ({order.items.length})</h2>
              <span className="text-xs text-zinc-400 font-mono">Currency: {order.currency}</span>
            </div>

            <div className="divide-y divide-zinc-100">
              {order.items.map((item) => {
                const img = item.variant?.product?.images[0]?.url;

                return (
                  <div key={item.id} className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {img ? (
                          <img src={img} alt={item.nameSnapshot} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-zinc-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-900 text-xs">
                          {item.nameSnapshot}
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono">
                          SKU: {item.skuSnapshot}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          Qty: <span className="font-bold">{item.quantity}</span> × ₹
                          {Number(item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-bold text-zinc-900 text-xs">
                      ₹
                      {(Number(item.unitPrice) * item.quantity).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Financial Totals Breakdown */}
            <div className="p-6 bg-zinc-50 border-t border-zinc-100 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal (Net of Tax)</span>
                <span>₹{Number(order.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Estimated 18% GST (CGST/SGST/IGST)</span>
                <span>₹{Number(order.taxAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Shipping / Courier Fee</span>
                <span>
                  {Number(order.shippingCost) === 0 ? (
                    <span className="text-emerald-600 font-bold">FREE</span>
                  ) : (
                    `₹${Number(order.shippingCost).toFixed(2)}`
                  )}
                </span>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount Applied</span>
                  <span>-₹{Number(order.discountAmount).toFixed(2)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-zinc-200 flex justify-between text-sm font-extrabold text-zinc-900">
                <span>Grand Total</span>
                <span>₹{Number(order.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Customer & Address Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Customer Contact */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-zinc-900 border-b border-zinc-100 pb-2">
                <User className="w-4 h-4 text-emerald-600" />
                <span>Customer Contact</span>
              </div>
              <div className="font-semibold text-zinc-900">{order.customerName}</div>
              <div className="text-zinc-500">{order.customerEmail}</div>
              <div className="text-zinc-600 font-mono">{order.customerPhone}</div>
            </div>

            {/* Immutable Shipping Address */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-zinc-900 border-b border-zinc-100 pb-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Delivery Address Snapshot</span>
              </div>
              <div className="font-semibold text-zinc-900">{addr.recipientName || order.customerName}</div>
              <div className="text-zinc-600">
                {addr.streetLine1}
                {addr.streetLine2 ? `, ${addr.streetLine2}` : ''}
              </div>
              <div className="text-zinc-600">
                {addr.city}, {addr.stateProvince} - <span className="font-bold">{addr.postalCode}</span>
              </div>
              <div className="text-zinc-400 font-medium">India (IN)</div>
            </div>
          </div>
        </div>

        {/* Right col: Fulfillment & Courier Dispatch */}
        <div className="space-y-6">
          <OrderStatusManager
            orderId={order.id}
            orderNumber={order.orderNumber}
            currentStatus={order.status}
            currentCarrier={addr.carrier}
            currentTrackingNumber={addr.trackingNumber}
          />

          {/* Payment Transaction Details */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-zinc-900 border-b border-zinc-100 pb-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Payment Details</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Method</span>
              <span className="font-semibold text-zinc-900">{order.paymentMethod}</span>
            </div>
            {order.transactions[0] && (
              <>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Provider Order ID</span>
                  <span className="font-mono text-zinc-700">{order.transactions[0].gatewayOrderId}</span>
                </div>
                {order.transactions[0].gatewayPaymentId && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Payment ID</span>
                    <span className="font-mono text-zinc-700">{order.transactions[0].gatewayPaymentId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-500">Payment Status</span>
                  <span className="font-bold text-emerald-600">{order.transactions[0].status}</span>
                </div>
              </>
            )}

            <div className="pt-2 border-t border-zinc-100">
              <OrderRefundModal
                orderId={order.id}
                orderNumber={order.orderNumber}
                totalAmount={Number(order.totalAmount)}
                isRefunded={order.status === 'REFUNDED'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
