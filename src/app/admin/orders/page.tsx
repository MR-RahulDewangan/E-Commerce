import React from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { OrderStatus } from '@prisma/client';
import {
  ShoppingBag,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

export const revalidate = 0; // Dynamic server component

const STATUS_TABS: { label: string; value?: OrderStatus }[] = [
  { label: 'All Orders' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Shipped', value: 'SHIPPED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status as OrderStatus | undefined;
  const search = params.search?.trim();
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  const pageSize = 15;
  const skip = (currentPage - 1) * pageSize;

  const whereClause: any = {};
  if (statusFilter && Object.values(OrderStatus).includes(statusFilter)) {
    whereClause.status = statusFilter;
  }
  if (search) {
    whereClause.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { customerEmail: { contains: search, mode: 'insensitive' } },
      { customerName: { contains: search, mode: 'insensitive' } },
      { customerPhone: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [orders, totalCount] = await Promise.all([
    db.order.findMany({
      where: whereClause,
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    db.order.count({ where: whereClause }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
          Order Fulfillment
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Review customer orders, transition lifecycle statuses, and dispatch shipments with courier tracking.
        </p>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => {
          const isActive = tab.value ? statusFilter === tab.value : !statusFilter;
          const href = tab.value
            ? `/admin/orders?status=${tab.value}${search ? `&search=${search}` : ''}`
            : `/admin/orders${search ? `?search=${search}` : ''}`;

          return (
            <Link
              key={tab.label}
              href={href}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-200'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs flex items-center justify-between gap-4">
        <form method="GET" action="/admin/orders" className="flex-1 flex items-center gap-3">
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              name="search"
              defaultValue={search || ''}
              placeholder="Search by order number (ORD-...), customer name, or phone..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-900 text-white rounded-lg text-sm font-semibold transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {orders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingBag className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-zinc-800">No orders found</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                No orders match your current filter parameters. Try clearing the search or status filter.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500 text-xs font-semibold uppercase border-b border-zinc-100">
                <tr>
                  <th className="px-6 py-3.5">Order Number</th>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Amount & Tax</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Courier & Tracking</th>
                  <th className="px-6 py-3.5 text-right">Fulfillment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {orders.map((o) => {
                  const addr = (o.shippingAddressSnapshot as Record<string, any>) || {};
                  const itemCount = o.items.reduce((acc, i) => acc + i.quantity, 0);

                  const statusColor =
                    o.status === 'PAID'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : o.status === 'PROCESSING'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : o.status === 'SHIPPED'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : o.status === 'DELIVERED'
                      ? 'bg-teal-50 text-teal-700 border-teal-200'
                      : o.status === 'CANCELLED'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200';

                  return (
                    <tr key={o.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="font-mono font-bold text-xs text-zinc-900 hover:text-emerald-600 block"
                        >
                          {o.orderNumber}
                        </Link>
                        <span className="text-[11px] text-zinc-400">
                          {new Date(o.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-zinc-900 text-xs">{o.customerName}</div>
                        <div className="text-[11px] text-zinc-400">{o.customerEmail}</div>
                        <div className="text-[11px] text-zinc-500 font-mono">{o.customerPhone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-zinc-900 text-sm">
                          ₹{Number(o.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {itemCount} item{itemCount !== 1 ? 's' : ''} • {o.paymentMethod}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${statusColor}`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {addr.trackingNumber ? (
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold text-zinc-900 flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5 text-purple-600" />
                              <span>{addr.carrier || 'Courier'}</span>
                            </div>
                            <div className="text-[11px] font-mono text-zinc-500">
                              {addr.trackingNumber}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-md text-xs font-semibold transition"
                        >
                          <span>Manage</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <div>
              Showing {skip + 1} to {Math.min(skip + pageSize, totalCount)} of {totalCount} orders
            </div>
            <div className="flex items-center gap-2">
              {currentPage > 1 && (
                <Link
                  href={`/admin/orders?page=${currentPage - 1}${statusFilter ? `&status=${statusFilter}` : ''}${
                    search ? `&search=${search}` : ''
                  }`}
                  className="px-3 py-1 bg-white border border-zinc-200 rounded-md hover:bg-zinc-50 font-medium"
                >
                  Previous
                </Link>
              )}
              <span className="font-semibold text-zinc-800">
                Page {currentPage} of {totalPages}
              </span>
              {currentPage < totalPages && (
                <Link
                  href={`/admin/orders?page=${currentPage + 1}${statusFilter ? `&status=${statusFilter}` : ''}${
                    search ? `&search=${search}` : ''
                  }`}
                  className="px-3 py-1 bg-white border border-zinc-200 rounded-md hover:bg-zinc-50 font-medium"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
