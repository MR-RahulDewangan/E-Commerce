'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

interface SortSelectProps {
  currentSort: string;
}

export function SortSelect({ currentSort }: SortSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value;
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    params.set('sort', newSort);
    params.delete('page'); // Reset to page 1 on sort change
    router.push(`/products?${params.toString()}`);
  };

  return (
    <div className="relative inline-flex items-center">
      <select
        id="sort-select"
        value={currentSort}
        onChange={handleSortChange}
        aria-label="Sort catalog products"
        className="appearance-none bg-card border border-border text-xs uppercase tracking-editorial font-medium text-foreground py-2.5 pl-3.5 pr-8 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring cursor-pointer transition-colors"
      >
        <option value="newest">Newest Arrivals</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
      </select>
      <ChevronDown
        className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}
