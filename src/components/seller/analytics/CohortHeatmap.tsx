'use client';

import React from 'react';
import { CohortData } from '@/modules/analytics/types';
import { Users, Info } from 'lucide-react';

interface CohortHeatmapProps {
  cohorts: CohortData[];
}

export function CohortHeatmap({ cohorts }: CohortHeatmapProps) {
  if (!cohorts || cohorts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-zinc-500 text-sm">
        Insufficient customer order history for monthly cohort analysis.
      </div>
    );
  }

  // Helper to color cells based on retention percentage
  const getCellColor = (pct: number) => {
    if (pct === 0) return 'bg-zinc-50 text-zinc-400';
    if (pct < 15) return 'bg-indigo-50 text-indigo-700';
    if (pct < 30) return 'bg-indigo-100 text-indigo-800';
    if (pct < 50) return 'bg-indigo-200 text-indigo-900';
    if (pct < 75) return 'bg-indigo-300 text-indigo-950 font-bold';
    return 'bg-indigo-600 text-white font-bold';
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="text-base font-bold text-zinc-900 tracking-tight">
            Monthly Cohort Customer Retention Heatmap
          </h3>
          <p className="text-xs text-zinc-500">
            Percentage of customers who make repeat purchases in subsequent calendar months
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Info className="w-3.5 h-3.5 text-zinc-400" />
          <span>Cohort grouped by first store purchase</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 font-semibold uppercase text-[10px]">
              <th className="py-3 px-4">Cohort Month</th>
              <th className="py-3 px-4 text-center">Initial Buyers</th>
              <th className="py-3 px-4 text-center">Month 0</th>
              <th className="py-3 px-4 text-center">Month 1</th>
              <th className="py-3 px-4 text-center">Month 2</th>
              <th className="py-3 px-4 text-center">Month 3</th>
              <th className="py-3 px-4 text-center">Month 4</th>
              <th className="py-3 px-4 text-center">Month 5</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {cohorts.map((cohort) => (
              <tr key={cohort.cohortMonth} className="hover:bg-zinc-50/50">
                <td className="py-3 px-4 font-bold text-zinc-900 flex items-center gap-2">
                  <span>{cohort.cohortMonth}</span>
                  {cohort.isIncomplete && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                      In Progress
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-center font-semibold text-zinc-700">
                  {cohort.initialCustomerCount}
                </td>
                {cohort.retentions.map((r) => (
                  <td key={r.monthIndex} className="py-2.5 px-2 text-center">
                    <div
                      className={`py-1.5 px-2 rounded-lg text-xs transition-all ${getCellColor(
                        r.retentionPct
                      )}`}
                    >
                      {r.retentionPct}%
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
        <span>* Month 0 indicates 100% initial acquisition baseline.</span>
        <div className="flex items-center gap-2">
          <span>Lower Retention</span>
          <div className="flex gap-1">
            <span className="w-3.5 h-3.5 rounded bg-indigo-50 border border-indigo-100" />
            <span className="w-3.5 h-3.5 rounded bg-indigo-100" />
            <span className="w-3.5 h-3.5 rounded bg-indigo-200" />
            <span className="w-3.5 h-3.5 rounded bg-indigo-300" />
            <span className="w-3.5 h-3.5 rounded bg-indigo-600" />
          </div>
          <span>Higher Retention</span>
        </div>
      </div>
    </div>
  );
}
