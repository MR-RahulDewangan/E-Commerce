'use client';

import React from 'react';
import { ConversionFunnelStage } from '@/modules/analytics/types';
import { Filter, ArrowDown, Eye, ShoppingCart, ShoppingBag, CheckCircle } from 'lucide-react';

interface ConversionFunnelViewProps {
  stages: ConversionFunnelStage[];
  summary: {
    totalSessions: number;
    completedPurchases: number;
    overallConversionRatePct: number;
    averageDropOffRatePct: number;
  };
  topViewedProducts: {
    productId: string;
    productName: string;
    viewCount: number;
    addToCartCount: number;
    cartToViewRatioPct: number;
  }[];
}

export function ConversionFunnelView({
  stages,
  summary,
  topViewedProducts,
}: ConversionFunnelViewProps) {
  const getStageIcon = (key: string) => {
    switch (key) {
      case 'HOMEPAGE':
        return <Filter className="w-4 h-4 text-indigo-600" />;
      case 'PRODUCT_VIEW':
        return <Eye className="w-4 h-4 text-blue-600" />;
      case 'ADD_TO_CART':
        return <ShoppingCart className="w-4 h-4 text-amber-600" />;
      case 'CHECKOUT_INITIATED':
        return <ShoppingBag className="w-4 h-4 text-violet-600" />;
      case 'PURCHASE_COMPLETED':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      default:
        return <Filter className="w-4 h-4 text-zinc-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Funnel KPI Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-zinc-500">
            Total Unique Sessions
          </span>
          <p className="text-2xl font-extrabold text-zinc-900 mt-1">
            {summary.totalSessions.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-zinc-400">Storefront & catalog visitors</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-zinc-500">
            End-to-End Conversion Rate
          </span>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">
            {summary.overallConversionRatePct}%
          </p>
          <p className="text-xs text-zinc-400">Visitor to paid order completion</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-zinc-500">
            Avg. Stage Drop-Off
          </span>
          <p className="text-2xl font-extrabold text-rose-600 mt-1">
            {summary.averageDropOffRatePct}%
          </p>
          <p className="text-xs text-zinc-400">Across sequential funnel steps</p>
        </div>
      </div>

      {/* Stepped Conversion Funnel Visualization */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-base font-bold text-zinc-900 tracking-tight">
            Behavioral Conversion Funnel
          </h3>
          <p className="text-xs text-zinc-500">
            Deduplicated session progression from catalog discovery to checkout completion
          </p>
        </div>

        <div className="space-y-4">
          {stages.map((stage, idx) => {
            const widthPct = Math.max(12, stage.overallFunnelConversionPct);

            return (
              <div key={stage.stageKey} className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center">
                      {getStageIcon(stage.stageKey)}
                    </div>
                    <div>
                      <span className="font-bold text-zinc-900 block">{stage.stageName}</span>
                      <span className="text-zinc-400 text-[11px]">
                        {stage.uniqueSessions.toLocaleString('en-IN')} unique sessions
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {idx > 0 && (
                      <span className="text-rose-600 font-semibold text-[11px]">
                        Drop-off: {stage.dropOffRatePct}%
                      </span>
                    )}
                    <span className="font-extrabold text-zinc-900 text-sm">
                      {stage.conversionRateFromPreviousPct}%
                    </span>
                  </div>
                </div>

                {/* Progress bar representing funnel narrowing */}
                <div className="w-full bg-zinc-100 h-4 rounded-xl overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-lg transition-all duration-500"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>

                {/* Arrow down connector */}
                {idx < stages.length - 1 && (
                  <div className="flex justify-center py-0.5 text-zinc-300">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Product Views & Cart Conversion Ratio */}
      {topViewedProducts.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
          <h4 className="text-sm font-bold text-zinc-900 mb-1">
            Product Engagement & Add-to-Cart Efficiency
          </h4>
          <p className="text-xs text-zinc-500 mb-4">
            Catalog items with highest view volume and cart intent conversion
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 uppercase text-[10px] font-semibold">
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3 text-right">Views</th>
                  <th className="py-2.5 px-3 text-right">Added to Cart</th>
                  <th className="py-2.5 px-3 text-right">Cart-to-View Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {topViewedProducts.slice(0, 6).map((prod) => (
                  <tr key={prod.productId} className="hover:bg-zinc-50/50">
                    <td className="py-3 px-3 font-semibold text-zinc-900">{prod.productName}</td>
                    <td className="py-3 px-3 text-right font-mono text-zinc-700">
                      {prod.viewCount}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-zinc-700">
                      {prod.addToCartCount}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs">
                        {prod.cartToViewRatioPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
