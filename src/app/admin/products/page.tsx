import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/db';
import {
  Package,
  Plus,
  Search,
  ExternalLink,
  Edit,
  Tag,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';

export const revalidate = 0; // Dynamic server component

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.search?.trim();
  const categoryFilter = params.category;
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  const pageSize = 15;
  const skip = (currentPage - 1) * pageSize;

  const whereClause: any = {};
  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
      { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } },
    ];
  }
  if (categoryFilter) {
    whereClause.categoryId = categoryFilter;
  }

  const [products, totalCount, categories] = await Promise.all([
    db.product.findMany({
      where: whereClause,
      include: {
        category: { select: { id: true, name: true } },
        variants: { select: { id: true, sku: true, name: true, stockQuantity: true, priceOverride: true } },
        images: { take: 1, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    db.product.count({ where: whereClause }),
    db.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
            Product Catalog
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage your store&apos;s inventory, SKUs, pricing in INR (₹), and catalog visibility.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <form method="GET" action="/admin/products" className="flex-1 w-full flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              name="search"
              defaultValue={search || ''}
              placeholder="Search by title, slug, or SKU..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <select
            name="category"
            defaultValue={categoryFilter || ''}
            className="px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-900 text-white rounded-lg text-sm font-semibold transition"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {products.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-zinc-800">No products found</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                No catalog items matched your query. Try clearing filters or create a new product.
              </p>
              <Link
                href="/admin/products/new"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Product</span>
              </Link>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500 text-xs font-semibold uppercase border-b border-zinc-100">
                <tr>
                  <th className="px-6 py-3.5">Product</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Base Price</th>
                  <th className="px-6 py-3.5">Variants & Stock</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {products.map((p) => {
                  const totalStock = p.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
                  const primaryImg = p.images[0]?.url;

                  return (
                    <tr key={p.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {primaryImg ? (
                              <Image
                                src={primaryImg}
                                alt={p.name}
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-zinc-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900 text-sm line-clamp-1">
                              {p.name}
                            </div>
                            <div className="text-xs text-zinc-400 font-mono">
                              /{p.slug}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-zinc-700">
                        {p.category.name}
                      </td>
                      <td className="px-6 py-4 font-bold text-zinc-900 text-sm">
                        ₹{Number(p.basePrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-medium text-zinc-800">
                          {p.variants.length} variant{p.variants.length !== 1 ? 's' : ''}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {totalStock} in stock
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${
                            p.isPublished
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                          }`}
                        >
                          {p.isPublished ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Published
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                              Draft
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/products/${p.slug}`}
                            target="_blank"
                            title="View on storefront"
                            className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-md hover:bg-zinc-100"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/admin/products/${p.id}/edit`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-md text-xs font-semibold transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </Link>
                        </div>
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
              Showing {skip + 1} to {Math.min(skip + pageSize, totalCount)} of {totalCount} products
            </div>
            <div className="flex items-center gap-2">
              {currentPage > 1 && (
                <Link
                  href={`/admin/products?page=${currentPage - 1}${search ? `&search=${search}` : ''}${
                    categoryFilter ? `&category=${categoryFilter}` : ''
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
                  href={`/admin/products?page=${currentPage + 1}${search ? `&search=${search}` : ''}${
                    categoryFilter ? `&category=${categoryFilter}` : ''
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
