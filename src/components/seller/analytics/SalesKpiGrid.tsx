'use client';

import React from 'react';
import { SalesKPIs } from '@/modules/analytics/types';
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Package,
  IndianRupee,
  RotateCcw,
  XCircle,
  Percent,
  Warehouse,
  ShieldAlert,
} from 'lucide-react';

interface SalesKpiGridProps {
  kpis: SalesKPIs;
  periodLabel: string;
}

export function SalesKpiGrid({ kpis, periodLabel }: SalesKpiGridProps) {
  const isPositiveGrowth = kpis.revenueGrowthRatePct >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {/* 1. Gross Revenue */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Realized Revenue
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <IndianRupee className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-extrabold text-zinc-900 tracking-tight">
            ₹{kpis.grossRevenueRupees.toLocaleString('en-IN')}
          </p>
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={`inline-flex items-center font-bold ${
                isPositiveGrowth ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {isPositiveGrowth ? (
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
              )}
              {isPositiveGrowth ? '+' : ''}
              {kpis.revenueGrowthRatePct}%
            </span>
            <span className="text-zinc-400">vs prev equivalent {periodLabel}</span>
          </div>
        </div>
      </div>

      {/* 2. Eligible Orders */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Eligible Orders
          </span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShoppingBag className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-extrabold text-zinc-900 tracking-tight">
            {kpis.eligibleOrdersCount.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-zinc-500">Paid, processing & delivered</p>
        </div>
      </div>

      {/* 3. Units Sold */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Units Sold
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Package className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-extrabold text-zinc-900 tracking-tight">
            {kpis.unitsSold.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-zinc-500">Total catalog pieces fulfilled</p>
        </div>
      </div>

      {/* 4. Average Order Value (AOV) */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Average Order Value
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <IndianRupee className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-extrabold text-zinc-900 tracking-tight">
            ₹{kpis.averageOrderValueRupees.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-zinc-500">Revenue per customer transaction</p>
        </div>
      </div>

      {/* 5. Gross Margin & Profit */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Gross Margin
          </span>
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
            <Percent className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1">
          {kpis.grossMarginPct !== null ? (
            <>
              <p className="text-2xl font-extrabold text-teal-700 tracking-tight">
                {kpis.grossMarginPct}%
              </p>
              <p className="text-xs text-zinc-500">
                Gross Profit: ₹{kpis.grossProfitRupees?.toLocaleString('en-IN')}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-zinc-400">Unavailable</p>
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Cost data not configured
              </p>
            </>
          )}
        </div>
      </div>

      {/* 6. Inventory Valuation */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Inventory Value
          </span>
          <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
            <Warehouse className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1">
          {kpis.totalInventoryValueRupees !== null ? (
            <>
              <p className="text-2xl font-extrabold text-zinc-900 tracking-tight">
                ₹{kpis.totalInventoryValueRupees.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-zinc-500">Current active warehouse cost</p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-zinc-400">Unavailable</p>
              <p className="text-xs text-zinc-500">Requires complete variant cost pricing</p>
            </>
          )}
        </div>
      </div>

      {/* 7. Cancellation Rate */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Cancellation Rate
          </span>
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <XCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1">
          <p
            className={`text-2xl font-extrabold tracking-tight ${
              kpis.cancellationRatePct > 15 ? 'text-rose-600' : 'text-zinc-900'
            }`}
          >
            {kpis.cancellationRatePct}%
          </p>
          <p className="text-xs text-zinc-500">Orders cancelled prior to dispatch</p>
        </div>
      </div>

      {/* 8. Return / Refund Rate */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Return / Refund Rate
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <RotateCcw className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1">
          <p
            className={`text-2xl font-extrabold tracking-tight ${
              kpis.returnRatePct > 10 ? 'text-amber-600' : 'text-zinc-900'
            }`}
          >
            {kpis.returnRatePct}%
          </p>
          <p className="text-xs text-zinc-500">Full or partial refunded volume</p>
        </div>
      </div>
    </div>
  );
}
