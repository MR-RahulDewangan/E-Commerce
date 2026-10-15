'use client';

import React from 'react';
import { GeographicDataPoint, MarketBenchmark } from '@/modules/analytics/types';
import { MapPin, Sparkles, Compass, ShieldCheck } from 'lucide-react';

interface GeographicInsightsViewProps {
  locations: GeographicDataPoint[];
  stateAggregates: {
    state: string;
    orderCount: number;
    revenueRupees: number;
    pctOfRevenue: number;
  }[];
  topPromisingMarkets: string[];
  benchmarks: MarketBenchmark[];
}

export function GeographicInsightsView({
  locations,
  stateAggregates,
  topPromisingMarkets,
  benchmarks,
}: GeographicInsightsViewProps) {
  return (
    <div className="space-y-6">
      {/* Promising Markets Banner */}
      {topPromisingMarkets.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-950">
                Top Promising Regional Markets
              </h4>
              <p className="text-xs text-emerald-800">
                High-converting cities with above-average AOV and low cancellation rates:
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {topPromisingMarkets.map((market, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-full bg-white text-emerald-800 border border-emerald-300 text-xs font-bold shadow-2xs"
              >
                📍 {market}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Grid: State Aggregates & Ranked Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* State Breakdown */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-zinc-900">Revenue by State</h4>
              <p className="text-xs text-zinc-500">Regional sales concentration</p>
            </div>
            <Compass className="w-4 h-4 text-zinc-400" />
          </div>

          <div className="space-y-3.5">
            {stateAggregates.map((s) => (
              <div key={s.state} className="space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-zinc-800">{s.state}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 font-mono">
                      ₹{s.revenueRupees.toLocaleString('en-IN')}
                    </span>
                    <span className="font-bold text-zinc-900 w-10 text-right">
                      {s.pctOfRevenue}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(3, s.pctOfRevenue))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ranked Locations Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-zinc-900">Ranked City Performance</h4>
              <p className="text-xs text-zinc-500">
                Aggregated order metrics with privacy preservation
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-zinc-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>PII Masked</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 uppercase text-[10px] font-semibold">
                  <th className="py-2.5 px-3">City & State</th>
                  <th className="py-2.5 px-3 text-right">Orders</th>
                  <th className="py-2.5 px-3 text-right">Revenue</th>
                  <th className="py-2.5 px-3 text-right">AOV</th>
                  <th className="py-2.5 px-3 text-right">Cancel Rate</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {locations.slice(0, 8).map((loc, i) => (
                  <tr key={i} className="hover:bg-zinc-50/50">
                    <td className="py-3 px-3 font-semibold text-zinc-900">
                      {loc.city}, <span className="text-zinc-500 font-normal">{loc.state}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-zinc-700">
                      {loc.orderCount}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-zinc-900">
                      ₹{loc.revenueRupees.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-zinc-600">
                      ₹{loc.averageOrderValueRupees.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-zinc-600">
                      {loc.cancellationRatePct}%
                    </td>
                    <td className="py-3 px-3 text-center">
                      {loc.isPromising ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                          Promising
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-[10px]">
                          Stable
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Market Benchmarks */}
      {benchmarks.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-zinc-900">
              Marketplace Category Benchmarking & Opportunities
            </h4>
            <p className="text-xs text-zinc-500">
              Comparing your category share vs aggregated BharatStore platform demand
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {benchmarks.map((bm, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-zinc-900">{bm.categoryName}</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-200">
                      {bm.sellerCategorySharePct}% Store Share
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 mb-2">
                    Platform Category Share: {bm.platformCategorySharePct ?? 'N/A'}%
                  </div>
                  <p className="text-xs text-zinc-700 leading-relaxed bg-white p-2.5 rounded-lg border border-zinc-200">
                    💡 {bm.growthOpportunityAssessment}
                  </p>
                </div>
                <div className="text-[10px] text-zinc-400 font-mono pt-1">
                  Source: {bm.benchmarkSource} • {bm.reportingPeriod}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
