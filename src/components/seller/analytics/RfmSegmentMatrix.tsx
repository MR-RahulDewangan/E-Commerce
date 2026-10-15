'use client';

import React from 'react';
import { RFMSegmentSummary } from '@/modules/analytics/types';
import { Crown, HeartHandshake, Sparkles, UserPlus, AlertOctagon, Moon, Lightbulb } from 'lucide-react';

interface RfmSegmentMatrixProps {
  segments: RFMSegmentSummary[];
  repeatPurchaseRatePct: number;
  totalCustomers: number;
}

export function RfmSegmentMatrix({
  segments,
  repeatPurchaseRatePct,
  totalCustomers,
}: RfmSegmentMatrixProps) {
  const getSegmentTheme = (key: string) => {
    switch (key) {
      case 'CHAMPIONS':
        return {
          icon: Crown,
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-800',
          badge: 'bg-amber-100 text-amber-800',
        };
      case 'LOYAL_CUSTOMERS':
        return {
          icon: HeartHandshake,
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-800',
          badge: 'bg-emerald-100 text-emerald-800',
        };
      case 'POTENTIAL_LOYALISTS':
        return {
          icon: Sparkles,
          bg: 'bg-indigo-50',
          border: 'border-indigo-200',
          text: 'text-indigo-800',
          badge: 'bg-indigo-100 text-indigo-800',
        };
      case 'NEW_CUSTOMERS':
        return {
          icon: UserPlus,
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          badge: 'bg-blue-100 text-blue-800',
        };
      case 'AT_RISK':
        return {
          icon: AlertOctagon,
          bg: 'bg-rose-50',
          border: 'border-rose-200',
          text: 'text-rose-800',
          badge: 'bg-rose-100 text-rose-800',
        };
      case 'HIBERNATING':
        return {
          icon: Moon,
          bg: 'bg-zinc-50',
          border: 'border-zinc-200',
          text: 'text-zinc-800',
          badge: 'bg-zinc-100 text-zinc-700',
        };
      default:
        return {
          icon: Crown,
          bg: 'bg-zinc-50',
          border: 'border-zinc-200',
          text: 'text-zinc-800',
          badge: 'bg-zinc-100 text-zinc-700',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Repeat purchase rate */}
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 text-white p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-indigo-200 font-semibold">
            Customer Health & Retention
          </span>
          <h3 className="text-xl font-extrabold tracking-tight">
            Repeat Purchase Rate: {repeatPurchaseRatePct}%
          </h3>
          <p className="text-xs text-indigo-100 mt-0.5">
            Analyzed {totalCustomers} distinct customer order profiles strictly isolated to your store catalog.
          </p>
        </div>
        <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-xs text-indigo-100">
          Scored by Recency, Frequency & Spend
        </div>
      </div>

      {/* Grid of 6 RFM Segments */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {segments.map((seg) => {
          const theme = getSegmentTheme(seg.segmentKey);
          const Icon = theme.icon;

          return (
            <div
              key={seg.segmentKey}
              className={`p-6 rounded-2xl border ${theme.border} bg-white shadow-sm flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${theme.bg} ${theme.text} flex items-center justify-center`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-base text-zinc-900">{seg.segmentName}</h4>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${theme.badge}`}>
                    {seg.percentageOfCustomers}%
                  </span>
                </div>

                <p className="text-xs text-zinc-500 mb-4">{seg.description}</p>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-50 rounded-xl mb-4 text-xs">
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase font-semibold">
                      Customers
                    </span>
                    <span className="font-bold text-zinc-900 text-sm">{seg.customerCount}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase font-semibold">
                      Avg. Spend
                    </span>
                    <span className="font-bold text-zinc-900 text-sm">
                      ₹{seg.averageMonetaryRupees.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-zinc-200/70">
                    <span className="text-zinc-400 text-[10px] uppercase font-semibold mr-1">
                      Total Revenue:
                    </span>
                    <span className="font-extrabold text-zinc-900">
                      ₹{seg.totalRevenueRupees.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recommended Actions */}
              <div className="pt-2 border-t border-zinc-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 mb-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span>Retention Playbook</span>
                </div>
                <ul className="space-y-1 text-[11px] text-zinc-600 list-disc list-inside">
                  {seg.recommendedActions.slice(0, 2).map((action, i) => (
                    <li key={i} className="truncate">
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
