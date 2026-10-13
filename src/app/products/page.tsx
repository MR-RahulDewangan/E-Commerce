import React from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { queryProducts, ProductSortOption } from '@/modules/catalog/queries';
import { ProductCard } from '@/components/catalog/ProductCard';
import { SlidersHorizontal, Search, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string;
    search?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    page?: string;
  }>;
}

export const revalidate = 30;

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;

  const category = params.category || undefined;
  const search = params.search || undefined;
  const minPrice = params.minPrice ? Number(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;
  const sort = (params.sort as ProductSortOption) || 'newest';
  const page = params.page ? Math.max(1, parseInt(params.page, 10)) : 1;
  const limit = 12;

  const [productsData, categories] = await Promise.all([
    queryProducts({
      category,
      search,
      minPrice,
      maxPrice,
      sort,
      page,
      limit,
    }),
    db.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    }),
  ]);

  const { items: products, pagination } = productsData;
  const { totalItems: total, totalPages, hasNextPage: hasNext, hasPrevPage: hasPrev } = pagination;

  const hasActiveFilters = Boolean(category || search || minPrice || maxPrice);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
            {category
              ? categories.find((c) => c.slug === category)?.name || 'Catalog'
              : search
              ? `Search: "${search}"`
              : 'All Products'}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Showing {products.length} of {total} available products (18% inclusive GST)
          </p>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-3">
          <label htmlFor="sort-select" className="text-xs font-semibold text-zinc-600">
            Sort by:
          </label>
          <form method="GET" action="/products" className="inline-block">
            {category && <input type="hidden" name="category" value={category} />}
            {search && <input type="hidden" name="search" value={search} />}
            {minPrice !== undefined && <input type="hidden" name="minPrice" value={minPrice} />}
            {maxPrice !== undefined && <input type="hidden" name="maxPrice" value={maxPrice} />}
            <select
              id="sort-select"
              name="sort"
              defaultValue={sort}
              // In Next.js, a simple change submits the form
              className="text-xs font-medium border border-zinc-300 rounded-lg py-2 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="newest">Newest Arrivals</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <aside className="lg:col-span-1 space-y-6 bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs h-fit">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <span className="font-bold text-sm text-zinc-900 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" /> Filters
            </span>
            {hasActiveFilters && (
              <Link
                href="/products"
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </Link>
            )}
          </div>

          {/* Category Filter List */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2.5">
              Categories
            </h3>
            <div className="space-y-1 text-xs">
              <Link
                href={`/products${search ? `?search=${encodeURIComponent(search)}` : ''}`}
                className={`flex items-center justify-between py-1.5 px-2 rounded-lg transition ${
                  !category
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : 'text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                <span>All Categories</span>
                <span>{categories.reduce((s, c) => s + c._count.products, 0)}</span>
              </Link>

              {categories.map((cat) => {
                const isActive = category === cat.slug;
                const queryParams = new URLSearchParams();
                queryParams.set('category', cat.slug);
                if (search) queryParams.set('search', search);
                if (sort) queryParams.set('sort', sort);

                return (
                  <Link
                    key={cat.id}
                    href={`/products?${queryParams.toString()}`}
                    className={`flex items-center justify-between py-1.5 px-2 rounded-lg transition ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 font-bold'
                        : 'text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className="text-zinc-400">{cat._count.products}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Price Range Filter Form */}
          <div className="border-t border-zinc-100 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2.5">
              Price Range (₹)
            </h3>
            <form method="GET" action="/products" className="space-y-3">
              {category && <input type="hidden" name="category" value={category} />}
              {search && <input type="hidden" name="search" value={search} />}
              {sort && <input type="hidden" name="sort" value={sort} />}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-500">Min (₹)</label>
                  <input
                    type="number"
                    name="minPrice"
                    placeholder="0"
                    defaultValue={minPrice || ''}
                    className="w-full border border-zinc-300 rounded p-1.5 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500">Max (₹)</label>
                  <input
                    type="number"
                    name="maxPrice"
                    placeholder="10000"
                    defaultValue={maxPrice || ''}
                    className="w-full border border-zinc-300 rounded p-1.5 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded text-xs font-semibold transition"
              >
                Apply Price
              </button>
            </form>
          </div>
        </aside>

        {/* Product Grid Area */}
        <main className="lg:col-span-3 space-y-6">
          {products.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-zinc-200 p-8 space-y-4">
              <div className="w-16 h-16 mx-auto bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center">
                <Search className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900">No products match your criteria</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Try clearing some filters or searching with a different term.
                </p>
              </div>
              <Link
                href="/products"
                className="inline-block px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition"
              >
                Reset All Filters
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    id={p.id}
                    name={p.name}
                    slug={p.slug}
                    categoryName={p.category.name}
                    startingPrice={p.basePrice}
                    imageUrl={p.primaryImage}
                    variantsCount={p.variantCount}
                    inStock={p.inStock}
                  />
                ))}
              </div>

              {/* Pagination Bar */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6">
                  {hasPrev && (
                    <Link
                      href={`/products?${new URLSearchParams({
                        ...(category ? { category } : {}),
                        ...(search ? { search } : {}),
                        ...(minPrice ? { minPrice: minPrice.toString() } : {}),
                        ...(maxPrice ? { maxPrice: maxPrice.toString() } : {}),
                        sort,
                        page: (page - 1).toString(),
                      }).toString()}`}
                      className="p-2 border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-100 flex items-center text-xs font-semibold"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </Link>
                  )}

                  <span className="px-3 text-xs text-zinc-500 font-medium">
                    Page {page} of {totalPages}
                  </span>

                  {hasNext && (
                    <Link
                      href={`/products?${new URLSearchParams({
                        ...(category ? { category } : {}),
                        ...(search ? { search } : {}),
                        ...(minPrice ? { minPrice: minPrice.toString() } : {}),
                        ...(maxPrice ? { maxPrice: maxPrice.toString() } : {}),
                        sort,
                        page: (page + 1).toString(),
                      }).toString()}`}
                      className="p-2 border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-100 flex items-center text-xs font-semibold"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
