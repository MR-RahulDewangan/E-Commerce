import React from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import {
  DollarSign,
  ShoppingBag,
  Package,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Boxes,
  Truck,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export const revalidate = 0; // Dynamic server component

export default async function AdminDashboardPage() {
  // Query aggregated metrics concurrently
  const [
    totalOrdersCount,
    revenueResult,
    totalProductsCount,
    lowStockVariants,
    recentOrders,
    ordersByStatus,
  ] = await Promise.all([
    db.order.count(),
    db.order.aggregate({
      where: {
        status: {
          in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'],
        },
      },
      _sum: {
        totalAmount: true,
      },
    }),
    db.product.count(),
    db.productVariant.findMany({
      where: {
        stockQuantity: { lte: 5 },
      },
      include: {
        product: { select: { name: true, slug: true } },
      },
      take: 5,
      orderBy: { stockQuantity: 'asc' },
    }),
    db.order.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerEmail: true,
        totalAmount: true,
        status: true,
        paymentMethod: true,
        createdAt: true,
      },
    }),
    db.order.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  const totalRevenue = Number(revenueResult._sum.totalAmount || 0);

  const statusCounts = ordersByStatus.reduce((acc, curr) => {
    acc[curr.status] = curr._count._all;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-8">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Real-time business performance, order status, and inventory tracking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </Link>
          <Link
            href="/admin/inventory"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-300 rounded-lg text-sm font-semibold transition shadow-xs"
          >
            <Boxes className="w-4 h-4" />
            <span>Adjust Stock</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Revenue */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <span className="font-bold text-sm">₹</span>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900">
            ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <span>Inclusive of 18% GST</span>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Orders</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900">
            {totalOrdersCount}
          </div>
          <div className="text-xs text-zinc-500 flex items-center gap-2">
            <span>{statusCounts['PROCESSING'] || 0} Processing</span>
            <span>•</span>
            <span>{statusCounts['SHIPPED'] || 0} Shipped</span>
          </div>
        </div>

        {/* Total Products */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Catalog Products</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900">
            {totalProductsCount}
          </div>
          <Link
            href="/admin/products"
            className="text-xs text-purple-600 hover:text-purple-700 font-medium inline-flex items-center gap-1"
          >
            <span>Manage Catalog</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Low Stock Alerts</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900">
            {lowStockVariants.length}
          </div>
          <Link
            href="/admin/inventory"
            className="text-xs text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-1"
          >
            <span>Inspect Inventory</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Main Grid: Recent Orders & Inventory Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders Table (2 cols on desktop) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-zinc-900 text-base">Recent Customer Orders</h2>
              <p className="text-xs text-zinc-500">Latest orders placed on the platform.</p>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">
                No orders recorded yet.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-zinc-500 text-xs font-semibold uppercase border-b border-zinc-100">
                  <tr>
                    <th className="px-6 py-3">Order Number</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Total</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Payment</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {recentOrders.map((order) => {
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
                      <tr key={order.id} className="hover:bg-zinc-50/60 transition-colors">
                        <td className="px-6 py-4 font-mono font-medium text-xs text-zinc-900">
                          {order.orderNumber}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-zinc-900 text-xs">{order.customerName}</div>
                          <div className="text-[11px] text-zinc-400">{order.customerEmail}</div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-zinc-900 text-xs">
                          ₹{Number(order.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusColor}`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-zinc-600 font-medium">
                          {order.paymentMethod}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
                          >
                            Details
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Low Stock Alerts Card (1 col on desktop) */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs flex flex-col">
          <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-zinc-900 text-base">Low Stock Warnings</h2>
              <p className="text-xs text-zinc-500">Items with 5 or fewer units left.</p>
            </div>
            <Link
              href="/admin/inventory"
              className="text-xs font-semibold text-amber-600 hover:text-amber-700"
            >
              Restock
            </Link>
          </div>

          <div className="p-6 flex-1 divide-y divide-zinc-100">
            {lowStockVariants.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-zinc-800">Inventory Healthy</p>
                <p className="text-xs text-zinc-500 mt-1">
                  All active variants have comfortable stock levels.
                </p>
              </div>
            ) : (
              lowStockVariants.map((v) => (
                <div key={v.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-zinc-900 line-clamp-1">
                      {v.product.name}
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono">
                      SKU: {v.sku} ({v.name})
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-bold shrink-0 ${
                      v.stockQuantity === 0
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {v.stockQuantity} left
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
