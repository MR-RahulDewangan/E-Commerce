import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/modules/auth/session';
import { getSellerProfile, getSellerProducts } from '@/modules/seller/service';
import { Plus, Package, Search, ExternalLink } from 'lucide-react';

export const revalidate = 0;

export default async function SellerProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; categoryId?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (!user) {
    redirect('/login?callbackUrl=/seller/products');
  }

  const profile = await getSellerProfile(user.id);
  if (!profile) {
    redirect('/seller/profile');
  }

  const resolvedParams = await searchParams;
  const products = await getSellerProducts(profile.id, {
    search: resolvedParams.search,
    categoryId: resolvedParams.categoryId,
  });

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Catalog Management</h1>
          <p className="text-sm text-zinc-500">
            Manage your store&apos;s product listings, pricing, and variants.
          </p>
        </div>
        <Link
          href="/seller/products/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add New Product
        </Link>
      </div>

      {/* Product List Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        {products.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 space-y-3">
            <Package className="w-12 h-12 text-zinc-300 mx-auto" />
            <p className="text-base font-semibold text-zinc-800">No products found</p>
            <p className="text-sm text-zinc-500 max-w-sm mx-auto">
              You haven&apos;t added any products to your catalog yet. Click below to add your first product.
            </p>
            <Link
              href="/seller/products/new"
              className="inline-block mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
            >
              Add Your First Product
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Product</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Base Price</th>
                  <th className="py-3.5 px-4">Variants</th>
                  <th className="py-3.5 px-4">Total Stock</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-sm">
                {products.map((p) => {
                  const totalStock = p.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
                  const imageUrl = p.images[0]?.url || '/placeholder.png';

                  return (
                    <tr key={p.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-zinc-100 overflow-hidden shrink-0 relative border border-zinc-200">
                            <Image
                              src={imageUrl}
                              alt={p.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-900 truncate max-w-xs">{p.name}</p>
                            <p className="text-xs text-zinc-400 font-mono">/{p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-zinc-600 font-medium">
                        {p.category.name}
                      </td>
                      <td className="py-4 px-4 font-bold text-zinc-900">
                        ₹{Number(p.basePrice).toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-4 text-zinc-600">
                        {p.variants.length} variant{p.variants.length === 1 ? '' : 's'}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`font-semibold ${
                            totalStock === 0
                              ? 'text-rose-600'
                              : totalStock <= 10
                              ? 'text-amber-600'
                              : 'text-zinc-900'
                          }`}
                        >
                          {totalStock} units
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {p.isPublished ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/products/${p.slug}`}
                            target="_blank"
                            className="p-1.5 text-zinc-400 hover:text-indigo-600 rounded-md hover:bg-zinc-100 transition"
                            title="View on storefront"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <Link
                            href="/seller/inventory"
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            Manage Stock
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
