import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/modules/auth/session';
import { getSellerProfile, getSellerDashboardMetrics } from '@/modules/seller/service';
import {
  Package,
  Boxes,
  ShoppingBag,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Store,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Truck,
} from 'lucide-react';

export const revalidate = 0; // Dynamic server component

export default async function SellerDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (!user) {
    redirect('/login?callbackUrl=/seller');
  }

  const profile = await getSellerProfile(user.id);
  if (!profile) {
    redirect('/seller/profile');
  }

  const metrics = await getSellerDashboardMetrics(profile.id);

  return (
    <div className="space-y-8">
      {/* Merchant Header Banner */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
              {profile.storeName}
            </h1>
            {profile.isVerified ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Verified Merchant
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                Pending Verification
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-medium">
              Commission Rate: {Number(profile.commissionRate)}%
            </span>
          </div>
          <p className="text-sm text-zinc-500 max-w-2xl">
            {profile.description || 'Welcome to your multi-vendor marketplace control panel. Monitor inventory, manage products, and track customer fulfillments.'}
          </p>
          <div className="flex items-center gap-4 text-xs text-zinc-500 pt-1">
            {profile.gstin && <span><strong>GSTIN:</strong> {profile.gstin}</span>}
            {profile.pan && <span><strong>PAN:</strong> {profile.pan}</span>}
            <span><strong>Store Slug:</strong> /{profile.storeSlug}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/seller/products/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Product
          </Link>
          <Link
            href="/seller/inventory"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-100 text-zinc-800 rounded-xl text-sm font-semibold hover:bg-zinc-200 transition"
          >
            <Boxes className="w-4 h-4" />
            Adjust Stock
          </Link>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Products */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              My Products
            </p>
            <p className="text-3xl font-bold text-zinc-900">{metrics.totalProducts}</p>
            <Link
              href="/seller/products"
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 pt-1"
            >
              View catalog <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Units in Stock */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Units In Stock
            </p>
            <p className="text-3xl font-bold text-zinc-900">{metrics.totalStockUnits}</p>
            <Link
              href="/seller/inventory"
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 pt-1"
            >
              Inventory health <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Low Stock Alerts */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Low Stock Variants
            </p>
            <p className="text-3xl font-bold text-amber-600">{metrics.lowStockCount}</p>
            <p className="text-xs text-zinc-400 pt-1">Threshold: ≤ 5 units</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Orders Received */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Orders Fulfilled
            </p>
            <p className="text-3xl font-bold text-zinc-900">{metrics.totalOrders}</p>
            <Link
              href="/seller/orders"
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 pt-1"
            >
              View customer orders <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Low Stock Alert & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Low Stock Warning Box */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-bold text-zinc-900">Low Stock Notice</h2>
            </div>
            <Link
              href="/seller/inventory"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Restock All
            </Link>
          </div>

          {metrics.lowStockVariants.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              All product variants currently have healthy inventory levels (&gt; 5 units).
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {metrics.lowStockVariants.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{item.productName}</p>
                    <p className="text-xs text-zinc-500">
                      {item.name} &bull; <span className="font-mono">{item.sku}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        item.stockQuantity === 0
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {item.stockQuantity} left
                    </span>
                    <Link
                      href="/seller/inventory"
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Restock
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders Involving Seller Products */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-zinc-900">Recent Customer Orders</h2>
            </div>
            <Link
              href="/seller/orders"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              View All
            </Link>
          </div>

          {metrics.recentOrders.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-sm">
              <Clock className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
              No customer orders received for your store items yet.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {metrics.recentOrders.map((order) => (
                <div key={order.id} className="py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-zinc-900">
                      #{order.orderNumber}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {order.customerName} &bull; {order.itemCount} item(s)
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm font-bold text-zinc-900">
                      ₹{order.sellerTotal.toLocaleString('en-IN')}
                    </p>
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        order.status === 'DELIVERED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.status === 'SHIPPED'
                          ? 'bg-blue-100 text-blue-800'
                          : order.status === 'PAID'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
