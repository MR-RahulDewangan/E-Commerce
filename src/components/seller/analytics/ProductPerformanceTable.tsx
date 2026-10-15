'use client';

import React from 'react';
import {
  ProductPerformanceItem,
  InventoryValuationMetrics,
  ProductAffinityRule,
} from '@/modules/analytics/types';
import { Package, ShieldAlert, Sparkles, Layers, ArrowRight } from 'lucide-react';

interface ProductPerformanceTableProps {
  products: ProductPerformanceItem[];
  inventorySummary: InventoryValuationMetrics;
  affinityRules: ProductAffinityRule[];
  affinitySufficient: boolean;
  affinityLimitationReason?: string;
}

export function ProductPerformanceTable({
  products,
  inventorySummary,
  affinityRules,
  affinitySufficient,
  affinityLimitationReason,
}: ProductPerformanceTableProps) {
  const getStockBadge = (risk: string) => {
    switch (risk) {
      case 'HEALTHY':
        return (
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
            Healthy
          </span>
        );
      case 'LOW_STOCK':
        return (
          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-semibold border border-amber-200">
            Low Stock
          </span>
        );
      case 'OVERSTOCK':
        return (
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200">
            Overstock
          </span>
        );
      case 'OUT_OF_STOCK':
        return (
          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-semibold border border-rose-200">
            Out of Stock
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Inventory & GMROI Summary */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
          <div>
            <h4 className="text-sm font-bold text-zinc-900">
              Inventory Valuation & GMROI Engine
            </h4>
            <p className="text-xs text-zinc-500">
              Gross Margin Return on Inventory Investment & active capital efficiency
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Total Catalog Stock:</span>
            <span className="font-bold text-zinc-900 text-sm">
              {inventorySummary.totalInventoryUnits} units
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="p-4 bg-zinc-50 rounded-xl">
            <span className="text-xs text-zinc-400 block font-semibold uppercase">
              Total Inventory Cost
            </span>
            <p className="text-xl font-extrabold text-zinc-900 mt-1">
              {inventorySummary.totalInventoryValueRupees !== null
                ? `₹${inventorySummary.totalInventoryValueRupees.toLocaleString('en-IN')}`
                : 'Unavailable'}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">At verified unit cost prices</p>
          </div>

          <div className="p-4 bg-zinc-50 rounded-xl">
            <span className="text-xs text-zinc-400 block font-semibold uppercase">
              GMROI Multiple
            </span>
            <p className="text-xl font-extrabold text-indigo-700 mt-1">
              {inventorySummary.grossMarginReturnOnInvestment !== null
                ? `${inventorySummary.grossMarginReturnOnInvestment}x`
                : 'Unavailable'}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Gross Margin / Avg Inventory Cost</p>
          </div>

          <div className="p-4 bg-zinc-50 rounded-xl">
            <span className="text-xs text-zinc-400 block font-semibold uppercase">
              Cost Config Status
            </span>
            <p className="text-sm font-bold text-zinc-800 mt-1 flex items-center gap-1.5">
              {inventorySummary.isCostDataConfigured ? (
                <span className="text-emerald-700">✓ 100% Configured</span>
              ) : (
                <span className="text-amber-700 flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4" />{' '}
                  {inventorySummary.unconfiguredCostVariantsCount} missing
                </span>
              )}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">{inventorySummary.notes}</p>
          </div>
        </div>
      </div>

      {/* Product Performance Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900 tracking-tight">
              Product Performance & Inventory Health
            </h3>
            <p className="text-xs text-zinc-500">
              Detailed breakdown of product velocity, margins, and stock duration
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
            <Package className="w-4 h-4" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 uppercase text-[10px] font-semibold">
                <th className="py-3 px-3">Product & SKU</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Units Sold</th>
                <th className="py-3 px-3 text-right">Revenue</th>
                <th className="py-3 px-3 text-right">ASP</th>
                <th className="py-3 px-3 text-right">Stock</th>
                <th className="py-3 px-3 text-right">Days Left</th>
                <th className="py-3 px-3 text-right">Gross Margin</th>
                <th className="py-3 px-3 text-center">Stock Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {products.map((prod) => (
                <tr key={prod.productId} className="hover:bg-zinc-50/50">
                  <td className="py-3 px-3">
                    <span className="font-bold text-zinc-900 block truncate max-w-[180px]">
                      {prod.productName}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 block">{prod.sku}</span>
                  </td>
                  <td className="py-3 px-3 text-zinc-600">{prod.categoryName}</td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-zinc-900">
                    {prod.unitsSold}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-zinc-900">
                    ₹{prod.revenueRupees.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-zinc-600">
                    ₹{prod.averageSellingPriceRupees.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-zinc-800">
                    {prod.stockQuantity}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-zinc-600">
                    {prod.daysOfInventoryRemaining ?? '—'} d
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-teal-700">
                    {prod.grossMarginPct !== null ? `${prod.grossMarginPct}%` : 'N/A'}
                  </td>
                  <td className="py-3 px-3 text-center">{getStockBadge(prod.stockRisk)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Frequently Bought Together / Association Rules */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-zinc-900">
              Market Basket Affinity (Frequently Bought Together)
            </h4>
            <p className="text-xs text-zinc-500">
              Association rules discovered via Apriori algorithm from real customer baskets
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        {affinityRules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {affinityRules.map((rule, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-3"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900">
                  <span className="truncate max-w-[150px]">{rule.antecedentNames.join(', ')}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="text-indigo-700 truncate max-w-[150px]">
                    {rule.consequentNames.join(', ')}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-zinc-600 bg-white p-2.5 rounded-lg border border-zinc-200">
                  <div>
                    <span className="text-[10px] uppercase text-zinc-400 block font-sans">
                      Support
                    </span>
                    <span className="font-bold">{(rule.support * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-zinc-400 block font-sans">
                      Confidence
                    </span>
                    <span className="font-bold">{(rule.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-zinc-400 block font-sans">
                      Lift
                    </span>
                    <span className="font-extrabold text-indigo-700">{rule.lift}x</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-indigo-950 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Recommendation: Create &quot;{rule.recommendedBundleLabel}&quot; promotion</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 bg-zinc-50 rounded-xl text-center text-xs text-zinc-500">
            {affinityLimitationReason ||
              'Insufficient multi-item transaction density to generate statistically significant basket affinity rules.'}
          </div>
        )}
      </div>
    </div>
  );
}
