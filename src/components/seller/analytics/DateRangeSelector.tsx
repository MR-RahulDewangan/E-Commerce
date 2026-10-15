'use client';

import React from 'react';
import { DateRangePreset } from '@/modules/analytics/types';
import { Calendar } from 'lucide-react';

interface DateRangeSelectorProps {
  selectedPreset: DateRangePreset;
  onSelect: (preset: DateRangePreset) => void;
  isLoading?: boolean;
}

const PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: '90d', label: 'Last 90 Days' },
  { id: '1y', label: 'Past Year' },
];

export function DateRangeSelector({
  selectedPreset,
  onSelect,
  isLoading = false,
}: DateRangeSelectorProps) {
  return (
    <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-xl border border-zinc-200">
      <div className="flex items-center px-2 text-zinc-500 text-xs font-medium">
        <Calendar className="w-3.5 h-3.5 mr-1 text-zinc-400" />
        <span className="hidden sm:inline">Reporting:</span>
      </div>
      {PRESETS.map((p) => {
        const isSelected = selectedPreset === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            disabled={isLoading}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isSelected
                ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
            } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
