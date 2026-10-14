import React from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { queryProducts, ProductSortOption } from '@/modules/catalog/queries';
import { ProductCard } from '@/components/catalog/ProductCard';
import { CatalogFilters } from '@/components/catalog/CatalogFilters';
import { SortSelect } from '@/components/catalog/SortSelect';
import { Search, ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';

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

export const revalidate = 30; // 30s ISR cache

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

  const currentCategory = category ? categories.find((c) => c.slug === category) : null;
  const hasActiveFilters = Boolean(category || search || minPrice || maxPrice);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 space-y-6 sm:space-y-10">
      {/* 1. Editorial Collection Header */}
      <header className="bg-card border border-border p-4 sm:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-sans uppercase tracking-[0.25em] text-muted-foreground font-medium">
            <Sparkles className="w-3 h-3 text-luxury-champagne" aria-hidden="true" />
            <span>Artisanal Collections &bull; Pan-India Dispatch</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-foreground tracking-tight">
            {currentCategory
              ? currentCategory.name
              : search
              ? `Search: "${search}"`
              : 'All Creations'}
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {currentCategory
              ? `Master weaves and authentic handcrafted heritage pieces in ${currentCategory.name}. Directly sourced from certified regional ateliers.`
              : search
              ? `Showing all curated results matching your inquiry across verified craft ateliers.`
              : 'Explore genuine Indian textiles, Banarasi silk brocades, handloom cottons, and heirloom jewellery. Prices inclusive of 18% GST with transparent billing.'}
          </p>

          <p className="text-[11px] text-stone-500 font-sans tracking-wide pt-1">
            Displaying {products.length} of {total} available items
          </p>
        </div>

        {/* Sort Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <span className="text-xs uppercase tracking-editorial font-medium text-muted-foreground">
            Sort By:
          </span>
          <SortSelect currentSort={sort} />
        </div>
      </header>

      {/* 2. Active Filters Pill Bar (if any) */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-muted-foreground uppercase tracking-widest text-[10px] font-medium mr-1">
            Active Refinements:
          </span>

          {currentCategory && (
            <Link
              href={`/products?${new URLSearchParams({
                ...(search ? { search } : {}),
                ...(minPrice ? { minPrice: minPrice.toString() } : {}),
                ...(maxPrice ? { maxPrice: maxPrice.toString() } : {}),
                sort,
              }).toString()}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-muted border border-border text-foreground hover:bg-stone-200 transition text-[11px]"
            >
              <span>Category: <strong>{currentCategory.name}</strong></span>
              <X className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
            </Link>
          )}

          {search && (
            <Link
              href={`/products?${new URLSearchParams({
                ...(category ? { category } : {}),
                ...(minPrice ? { minPrice: minPrice.toString() } : {}),
                ...(maxPrice ? { maxPrice: maxPrice.toString() } : {}),
                sort,
              }).toString()}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-muted border border-border text-foreground hover:bg-stone-200 transition text-[11px]"
            >
              <span>Search: <strong>&ldquo;{search}&rdquo;</strong></span>
              <X className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
            </Link>
          )}

          {(minPrice !== undefined || maxPrice !== undefined) && (
            <Link
              href={`/products?${new URLSearchParams({
                ...(category ? { category } : {}),
                ...(search ? { search } : {}),
                sort,
              }).toString()}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-muted border border-border text-foreground hover:bg-stone-200 transition text-[11px]"
            >
              <span>
                Price: ₹{minPrice || 0} &ndash; {maxPrice ? `₹${maxPrice}` : 'Above'}
              </span>
              <X className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
            </Link>
          )}

          <Link
            href="/products"
            className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground underline underline-offset-4 ml-2"
          >
            Clear All
          </Link>
        </div>
      )}

      {/* 3. Catalog Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-10">
        {/* Left Column: Filter Sidebar */}
        <div className="lg:col-span-1">
          <CatalogFilters
            categories={categories}
            activeCategory={category}
            searchQuery={search}
            minPrice={minPrice}
            maxPrice={maxPrice}
            currentSort={sort}
          />
        </div>

        {/* Right Column: Product Grid & Pagination */}
        <main className="lg:col-span-3 space-y-10">
          {products.length === 0 ? (
            /* Empty State */
            <div className="bg-card border border-border p-12 sm:p-20 text-center space-y-6">
              <div className="w-16 h-16 mx-auto bg-muted text-muted-foreground flex items-center justify-center border border-border">
                <Search className="w-6 h-6" aria-hidden="true" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h2 className="font-serif text-2xl font-medium text-foreground tracking-tight">
                  No Creations Found in this Curation
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  We could not locate items matching your chosen criteria. Try widening your price range, searching with a broader keyword, or clearing refinements.
                </p>
              </div>
              <div>
                <Link
                  href="/products"
                  className="inline-block px-6 py-3 bg-primary text-primary-foreground hover:bg-primary-hover text-[11px] font-sans uppercase tracking-widest font-medium transition cursor-pointer"
                >
                  Reset All Filters
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Refined Luxury Product Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
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

              {/* Luxury Pagination Controls */}
              {totalPages > 1 && (
                <nav
                  aria-label="Catalog Pagination"
                  className="flex items-center justify-center gap-3 pt-8 border-t border-border/80"
                >
                  {hasPrev ? (
                    <Link
                      href={`/products?${new URLSearchParams({
                        ...(category ? { category } : {}),
                        ...(search ? { search } : {}),
                        ...(minPrice ? { minPrice: minPrice.toString() } : {}),
                        ...(maxPrice ? { maxPrice: maxPrice.toString() } : {}),
                        sort,
                        page: (page - 1).toString(),
                      }).toString()}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-card border border-border text-foreground hover:border-foreground text-xs font-sans uppercase tracking-widest font-medium transition"
                      aria-label="Go to previous page"
                    >
                      <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                      <span>Previous</span>
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 border border-border/40 text-muted-foreground/50 text-xs font-sans uppercase tracking-widest font-medium cursor-not-allowed">
                      <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                      <span>Previous</span>
                    </span>
                  )}

                  <span className="px-4 font-serif text-sm text-foreground tracking-wide">
                    Page {page} <span className="text-muted-foreground">of</span> {totalPages}
                  </span>

                  {hasNext ? (
                    <Link
                      href={`/products?${new URLSearchParams({
                        ...(category ? { category } : {}),
                        ...(search ? { search } : {}),
                        ...(minPrice ? { minPrice: minPrice.toString() } : {}),
                        ...(maxPrice ? { maxPrice: maxPrice.toString() } : {}),
                        sort,
                        page: (page + 1).toString(),
                      }).toString()}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-card border border-border text-foreground hover:border-foreground text-xs font-sans uppercase tracking-widest font-medium transition"
                      aria-label="Go to next page"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 border border-border/40 text-muted-foreground/50 text-xs font-sans uppercase tracking-widest font-medium cursor-not-allowed">
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </span>
                  )}
                </nav>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
