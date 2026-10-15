'use client';

import React from 'react';
import { ProductDemandForecast, CustomerChurnAnalysis } from '@/modules/analytics/types';
import { Sparkles, AlertTriangle, ShieldCheck, UserX, Lightbulb, Clock, CheckCircle } from 'lucide-react';

interface PredictiveIntelligenceViewProps {
  forecasts: ProductDemandForecast[];
  churn: CustomerChurnAnalysis;
}

export function PredictiveIntelligenceView({
  forecasts,
  churn,
}: PredictiveIntelligenceViewProps) {
  return (
    <div className="space-y-8">
      {/* 1. Demand Forecasting Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Machine Learning Demand Forecasting
            </h3>
            <p className="text-xs text-zinc-500">
              Time-series models (statsmodels Holt-Winters / EWMA) predicting 14–30 day product demand with 85% confidence intervals
            </p>
          </div>
          <div className="text-[11px] text-zinc-400 font-mono">
            Chronological Validation • Leak-free Splits
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {forecasts.map((fc) => {
            const hasData = fc.isDataSufficient && fc.forecastPoints.length > 0;
            const maxVal = Math.max(
              ...fc.historicalPoints.map((h) => h.units),
              ...fc.forecastPoints.map((f) => f.upperBound),
              5
            );

            const chartHeight = 160;
            const paddingX = 30;
            const paddingY = 20;
            const plotH = chartHeight - paddingY * 2;

            const totalPointsCount = fc.historicalPoints.length + fc.forecastPoints.length;

            // Coordinates for historical
            const histCoords = fc.historicalPoints.map((pt, idx) => ({
              x: paddingX + (idx / Math.max(1, totalPointsCount - 1)) * (500 - paddingX * 2),
              y: chartHeight - paddingY - (pt.units / maxVal) * plotH,
            }));

            // Coordinates for forecast
            const fcOffset = fc.historicalPoints.length;
            const fcCoords = fc.forecastPoints.map((pt, idx) => ({
              x: paddingX + ((fcOffset + idx) / Math.max(1, totalPointsCount - 1)) * (500 - paddingX * 2),
              y: chartHeight - paddingY - (pt.predictedUnits / maxVal) * plotH,
              yLow: chartHeight - paddingY - (pt.lowerBound / maxVal) * plotH,
              yHigh: chartHeight - paddingY - (pt.upperBound / maxVal) * plotH,
            }));

            const histPath = histCoords.reduce(
              (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
              ''
            );

            const fcPath = fcCoords.reduce(
              (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
              ''
            );

            // Shaded confidence interval band
            const bandD =
              fcCoords.length > 0
                ? fcCoords.reduce(
                    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.yHigh}` : `${acc} L ${p.x} ${p.yHigh}`),
                    ''
                  ) +
                  fcCoords
                    .slice()
                    .reverse()
                    .reduce((acc, p) => `${acc} L ${p.x} ${p.yLow}`, '') +
                  ' Z'
                : '';

            return (
              <div
                key={fc.productId}
                className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-bold text-sm text-zinc-900 truncate max-w-[240px]">
                        {fc.productName}
                      </h4>
                      <span className="text-[10px] font-mono text-zinc-400 block">{fc.sku}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-mono">
                      {fc.modelUsed}
                    </span>
                  </div>

                  {/* Stockout or Overstock Risk Alerts */}
                  {fc.stockoutRisk && (
                    <div className="mb-3 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Stockout Risk: Projected demand exceeds remaining inventory!</span>
                    </div>
                  )}

                  {fc.overstockRisk && (
                    <div className="mb-3 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-1.5 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Overstock Risk: Current stock exceeds 2.5x projected monthly demand.</span>
                    </div>
                  )}

                  {/* Chart or Insufficient Data State */}
                  {hasData ? (
                    <div className="relative w-full my-3">
                      <svg
                        viewBox={`0 0 500 ${chartHeight}`}
                        className="w-full h-auto overflow-visible"
                      >
                        {/* Shaded Confidence Band */}
                        <path d={bandD} fill="#4f46e5" fillOpacity="0.12" />

                        {/* Historical Line */}
                        <path
                          d={histPath}
                          fill="none"
                          stroke="#71717a"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />

                        {/* Forecast Line (Dashed) */}
                        <path
                          d={fcPath}
                          fill="none"
                          stroke="#4f46e5"
                          strokeWidth="2.5"
                          strokeDasharray="4 4"
                          strokeLinecap="round"
                        />
                      </svg>

                      <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono mt-1 px-4">
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-0.5 bg-zinc-400 inline-block" /> Historical
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-0.5 bg-indigo-600 inline-block border-b border-dashed" /> Forecast
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2 bg-indigo-100 inline-block" /> 85% Bounds
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-zinc-50 rounded-xl text-center text-xs text-zinc-500 my-4">
                      {fc.limitationReason || 'Historical observations insufficient for time-series modeling.'}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Generated: {new Date(fc.generatedAt).toLocaleTimeString()}
                  </span>
                  <span>Horizon: {fc.horizonDays} days</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Customer Churn Risk Prediction Section */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <UserX className="w-4 h-4 text-rose-600" />
              Customer Churn Risk Prediction
            </h3>
            <p className="text-xs text-zinc-500">
              Statistical customer dormancy likelihood and proactive retention playbooks
            </p>
          </div>
          <span className="text-xs font-bold text-zinc-700">
            {churn.totalCustomers} Customers Evaluated
          </span>
        </div>

        {/* Churn Risk Tiers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {churn.riskDistribution.map((tier) => {
            const isHigh = tier.tier === 'HIGH_RISK';
            const isMed = tier.tier === 'MEDIUM_RISK';

            return (
              <div
                key={tier.tier}
                className={`p-4 rounded-xl border ${
                  isHigh
                    ? 'bg-rose-50/50 border-rose-200'
                    : isMed
                    ? 'bg-amber-50/50 border-amber-200'
                    : 'bg-emerald-50/50 border-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold uppercase ${
                      isHigh ? 'text-rose-700' : isMed ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {tier.tier.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-bold text-zinc-900">{tier.percentage}%</span>
                </div>
                <p className="text-2xl font-extrabold text-zinc-900">{tier.count}</p>
                <p className="text-[11px] text-zinc-600 mt-1">{tier.description}</p>
              </div>
            );
          })}
        </div>

        {/* Contributing Factors & Retention Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-100">
          <div>
            <h5 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>Risk Contributing Factors</span>
            </h5>
            <ul className="space-y-1.5 text-xs text-zinc-600 list-disc list-inside">
              {churn.contributingFactors.map((factor, i) => (
                <li key={i}>{factor}</li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>Retention Recommendations</span>
            </h5>
            <ul className="space-y-1.5 text-xs text-zinc-600 list-disc list-inside">
              {churn.suggestedRetentionActions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
