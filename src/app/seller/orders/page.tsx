import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/modules/auth/session';
import { getSellerProfile, getSellerOrders } from '@/modules/seller/service';
import { ShoppingBag, Calendar, User, Package, Clock } from 'lucide-react';

export const revalidate = 0;

export default async function SellerOrdersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (!user) {
    redirect('/login?callbackUrl=/seller/orders');
  }

  const profile = await getSellerProfile(user.id);
  if (!profile) {
    redirect('/seller/profile');
  }

  const orders = await getSellerOrders(profile.id);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Marketplace Orders</h1>
        <p className="text-sm text-zinc-500">
          Customer orders containing products dispatched and fulfilled by your store.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center text-zinc-500 shadow-sm space-y-3">
          <ShoppingBag className="w-12 h-12 text-zinc-300 mx-auto" />
          <p className="font-semibold text-zinc-800">No marketplace orders yet</p>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            When customers place orders containing your products, they will appear here with fulfillment and payment status.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const sellerSubtotal = order.items.reduce(
              (acc, item) => acc + Number(item.unitPrice) * item.quantity,
              0
            );

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-4"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-base text-zinc-900 font-mono">
                        #{order.orderNumber}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          order.status === 'DELIVERED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : order.status === 'SHIPPED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : order.status === 'PAID'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {order.customerName} ({order.customerEmail})
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-zinc-500 block">Your Store Total</span>
                    <span className="text-lg font-extrabold text-zinc-900">
                      ₹{sellerSubtotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Items from this seller */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-zinc-600 uppercase tracking-wider block">
                    Your Items in This Order:
                  </span>
                  <div className="divide-y divide-zinc-100 rounded-xl bg-zinc-50/70 border border-zinc-200/80 px-4">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="py-3 flex items-center justify-between text-sm"
                      >
                        <div className="space-y-0.5">
                          <p className="font-medium text-zinc-900">{item.nameSnapshot}</p>
                          <p className="text-xs text-zinc-500 font-mono">
                            SKU: {item.skuSnapshot}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-zinc-900">
                            {item.quantity} &times; ₹{Number(item.unitPrice).toLocaleString('en-IN')}
                          </p>
                          <p className="text-xs text-zinc-500">
                            Line Total: ₹{(Number(item.unitPrice) * item.quantity).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
