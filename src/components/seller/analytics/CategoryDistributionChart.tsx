'use client';

import React from 'react';
import { CategoryBreakdown } from '@/modules/analytics/types';
import { Tag, TrendingUp, TrendingDown } from 'lucide-react';

interface CategoryDistributionChartProps {
  categories: CategoryBreakdown[];
}

const CATEGORY_COLORS = [
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-teal-600',
  'bg-violet-600',
];

export function CategoryDistributionChart({ categories }: CategoryDistributionChartProps) {
  if (!categories || categories.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 text-center text-zinc-500 text-sm">
        No category sales recorded.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-zinc-900 tracking-tight">
            Sales by Category
          </h3>
          <p className="text-xs text-zinc-500">
            Category revenue contribution and period growth
          </p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center">
          <Tag className="w-4 h-4" />
        </div>
      </div>

      <div className="space-y-4">
        {categories.map((cat, idx) => {
          const colorClass = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
          const isPos = cat.growthRatePct >= 0;

          return (
            <div key={cat.categoryId} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-800 truncate max-w-[200px]">
                  {cat.categoryName}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500 font-mono">
                    ₹{cat.revenueRupees.toLocaleString('en-IN')}
                  </span>
                  <span className="font-bold text-zinc-900 w-12 text-right">
                    {cat.percentageOfTotal}%
                  </span>
                  <span
                    className={`inline-flex items-center text-[10px] font-bold w-14 justify-end ${
                      isPos ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {isPos ? (
                      <TrendingUp className="w-3 h-3 mr-0.5" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-0.5" />
                    )}
                    {isPos ? '+' : ''}
                    {cat.growthRatePct}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                  style={{ width: `${Math.min(100, Math.max(2, cat.percentageOfTotal))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
