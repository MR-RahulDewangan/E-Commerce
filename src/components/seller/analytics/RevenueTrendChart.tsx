'use client';

import React, { useState } from 'react';
import { TimeSeriesTrendPoint } from '@/modules/analytics/types';

interface RevenueTrendChartProps {
  data: TimeSeriesTrendPoint[];
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-zinc-500">
        No sales revenue recorded for this period.
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenueRupees), 1000);
  const maxOrders = Math.max(...data.map((d) => d.ordersCount), 5);

  const height = 260;
  const paddingX = 40;
  const paddingY = 30;
  const chartHeight = height - paddingY * 2;

  // Compute SVG polyline points
  const points = data.map((d, index) => {
    const x = paddingX + (index / Math.max(1, data.length - 1)) * (800 - paddingX * 2);
    const y = height - paddingY - (d.revenueRupees / maxRevenue) * chartHeight;
    return { x, y, data: d };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${
    height - paddingY
  } Z`;

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="text-base font-bold text-zinc-900 tracking-tight">
            Revenue & Order Trajectory
          </h3>
          <p className="text-xs text-zinc-500">
            Daily verified realized gross sales and order volume
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block" />
            <span className="text-zinc-700">Revenue (₹)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-zinc-300 inline-block" />
            <span className="text-zinc-500">Orders Count</span>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 800 ${height}`}
          className="w-full h-auto overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = height - paddingY - ratio * chartHeight;
            const labelValue = Math.round((ratio * maxRevenue) / 100) * 100;
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={800 - paddingX}
                  y2={y}
                  stroke="#f4f4f5"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] fill-zinc-400 font-mono"
                >
                  ₹{labelValue >= 1000 ? `${Math.round(labelValue / 1000)}k` : labelValue}
                </text>
              </g>
            );
          })}

          {/* Order volume background bars */}
          {points.map((p, idx) => {
            const barHeight = (p.data.ordersCount / maxOrders) * (chartHeight * 0.4);
            const barY = height - paddingY - barHeight;
            const barWidth = Math.max(3, (800 - paddingX * 2) / data.length - 4);
            return (
              <rect
                key={`bar-${idx}`}
                x={p.x - barWidth / 2}
                y={barY}
                width={barWidth}
                height={barHeight}
                className="fill-zinc-200/60 hover:fill-zinc-300 transition-colors"
                rx="2"
              />
            );
          })}

          {/* Gradient area */}
          <path d={areaD} fill="url(#revenueGradient)" />

          {/* Line path */}
          <path
            d={pathD}
            fill="none"
            stroke="#4f46e5"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive data dots */}
          {points.map((p, idx) => {
            const isHovered = hoveredIndex === idx;
            return (
              <g key={idx}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 5.5 : 3}
                  className={`${
                    isHovered ? 'fill-indigo-700 stroke-white' : 'fill-white stroke-indigo-600'
                  } transition-all cursor-pointer`}
                  strokeWidth="2"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
                {/* Invisible hit target for smooth hover */}
                <rect
                  x={p.x - 12}
                  y={0}
                  width="24"
                  height={height}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute top-2 bg-zinc-900 text-white px-3.5 py-2 rounded-xl text-xs shadow-xl pointer-events-none z-10 transition-all border border-zinc-700 transform -translate-x-1/2"
            style={{
              left: `${(hoveredPoint.x / 800) * 100}%`,
            }}
          >
            <div className="font-semibold text-zinc-300 mb-1">{hoveredPoint.data.date}</div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-white text-sm">
                ₹{hoveredPoint.data.revenueRupees.toLocaleString('en-IN')}
              </span>
              <span className="text-indigo-300">
                {hoveredPoint.data.ordersCount} {hoveredPoint.data.ordersCount === 1 ? 'order' : 'orders'} ({hoveredPoint.data.unitsSold} units)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Date labels at bottom */}
      <div className="flex justify-between text-[11px] text-zinc-400 font-mono mt-3 px-8">
        <span>{data[0]?.date}</span>
        {data.length > 2 && <span>{data[Math.floor(data.length / 2)]?.date}</span>}
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
