'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal, RotateCcw, X, ChevronDown, Check } from 'lucide-react';

export interface CategoryFilterItem {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
}

interface CatalogFiltersProps {
  categories: CategoryFilterItem[];
  activeCategory?: string;
  searchQuery?: string;
  minPrice?: number;
  maxPrice?: number;
  currentSort?: string;
}

export function CatalogFilters({
  categories,
  activeCategory,
  searchQuery,
  minPrice,
  maxPrice,
  currentSort = 'newest',
}: CatalogFiltersProps) {
  const router = useRouter();
  const [minPriceInput, setMinPriceInput] = useState(minPrice ? minPrice.toString() : '');
  const [maxPriceInput, setMaxPriceInput] = useState(maxPrice ? maxPrice.toString() : '');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const hasActiveFilters = Boolean(activeCategory || searchQuery || minPrice || maxPrice);

  const handlePriceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (activeCategory) params.set('category', activeCategory);
    if (searchQuery) params.set('search', searchQuery);
    if (currentSort) params.set('sort', currentSort);
    if (minPriceInput.trim()) params.set('minPrice', minPriceInput.trim());
    if (maxPriceInput.trim()) params.set('maxPrice', maxPriceInput.trim());
    setIsMobileOpen(false);
    router.push(`/products?${params.toString()}`);
  };

  const handleQuickPrice = (min?: number, max?: number) => {
    const params = new URLSearchParams();
    if (activeCategory) params.set('category', activeCategory);
    if (searchQuery) params.set('search', searchQuery);
    if (currentSort) params.set('sort', currentSort);
    if (min !== undefined) params.set('minPrice', min.toString());
    if (max !== undefined) params.set('maxPrice', max.toString());
    setIsMobileOpen(false);
    router.push(`/products?${params.toString()}`);
  };

  const totalProducts = categories.reduce((sum, c) => sum + c._count.products, 0);

  return (
    <>
      {/* Mobile Filters Toggle Button */}
      <div className="lg:hidden flex items-center justify-between pb-2">
        <button
          type="button"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border text-xs uppercase tracking-editorial font-medium text-foreground w-full justify-center"
          aria-expanded={isMobileOpen}
          aria-controls="catalog-filters-sidebar"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-luxury-champagne" aria-hidden="true" />
          <span>Filter & Refine Collection</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-luxury-obsidian ml-1" />
          )}
        </button>
      </div>

      {/* Filter Sidebar Container */}
      <aside
        id="catalog-filters-sidebar"
        className={`lg:block ${
          isMobileOpen ? 'block' : 'hidden'
        } bg-card border border-border p-6 space-y-8 h-fit`}
      >
        {/* Header with Title and Reset */}
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <h2 className="font-serif text-lg font-medium text-foreground flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-luxury-champagne" aria-hidden="true" />
            <span>Refine Collection</span>
          </h2>
          {hasActiveFilters && (
            <Link
              href="/products"
              onClick={() => setIsMobileOpen(false)}
              className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              <span>Reset</span>
            </Link>
          )}
        </div>

        {/* Categories Section */}
        <div className="space-y-3">
          <p className="text-[10px] font-sans uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Craft Categories
          </p>
          <nav aria-label="Category filter" className="space-y-1 text-xs">
            {/* All Categories Option */}
            <Link
              href={`/products${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`}
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center justify-between py-2 px-2.5 transition-colors ${
                !activeCategory
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <span>All Collections</span>
              <span className="text-[11px] opacity-75">{totalProducts}</span>
            </Link>

            {/* Individual Categories */}
            {categories.map((cat) => {
              const isActive = activeCategory === cat.slug;
              const params = new URLSearchParams();
              params.set('category', cat.slug);
              if (searchQuery) params.set('search', searchQuery);
              if (currentSort) params.set('sort', currentSort);
              if (minPrice) params.set('minPrice', minPrice.toString());
              if (maxPrice) params.set('maxPrice', maxPrice.toString());

              return (
                <Link
                  key={cat.id}
                  href={`/products?${params.toString()}`}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center justify-between py-2 px-2.5 transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <span className="font-sans">{cat.name}</span>
                  <span className={`text-[11px] ${isActive ? 'text-primary-foreground opacity-75' : 'text-muted-foreground'}`}>
                    {cat._count.products}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Price Filter Section */}
        <div className="space-y-4 border-t border-border/80 pt-6">
          <p className="text-[10px] font-sans uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Price Range (INR ₹)
          </p>

          {/* Quick Price Buttons */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => handleQuickPrice(undefined, 2000)}
              className="py-1.5 px-2 border border-border text-center text-foreground hover:border-foreground transition cursor-pointer"
            >
              Under ₹2,000
            </button>
            <button
              type="button"
              onClick={() => handleQuickPrice(2000, 5000)}
              className="py-1.5 px-2 border border-border text-center text-foreground hover:border-foreground transition cursor-pointer"
            >
              ₹2,000 - ₹5,000
            </button>
            <button
              type="button"
              onClick={() => handleQuickPrice(5000, 10000)}
              className="py-1.5 px-2 border border-border text-center text-foreground hover:border-foreground transition cursor-pointer"
            >
              ₹5,000 - ₹10,000
            </button>
            <button
              type="button"
              onClick={() => handleQuickPrice(10000, undefined)}
              className="py-1.5 px-2 border border-border text-center text-foreground hover:border-foreground transition cursor-pointer"
            >
              ₹10,000 &amp; Above
            </button>
          </div>

          {/* Custom Price Range Form */}
          <form onSubmit={handlePriceSubmit} className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label htmlFor="filter-min-price" className="sr-only">
                  Minimum Price
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground">₹</span>
                  <input
                    id="filter-min-price"
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={minPriceInput}
                    onChange={(e) => setMinPriceInput(e.target.value)}
                    className="w-full pl-6 pr-2 py-2 bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="filter-max-price" className="sr-only">
                  Maximum Price
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground">₹</span>
                  <input
                    id="filter-max-price"
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={maxPriceInput}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                    className="w-full pl-6 pr-2 py-2 bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-primary text-primary-foreground hover:bg-primary-hover text-[11px] font-sans uppercase tracking-widest font-medium transition cursor-pointer"
            >
              Apply Filter
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
