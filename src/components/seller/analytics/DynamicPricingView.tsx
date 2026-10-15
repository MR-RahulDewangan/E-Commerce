'use client';

import React, { useState } from 'react';
import { PricingRecommendationItem } from '@/modules/analytics/types';
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Check,
  X,
  Sparkles,
  RefreshCw,
  Info,
} from 'lucide-react';

interface DynamicPricingViewProps {
  recommendations: PricingRecommendationItem[];
  onActionComplete: () => void;
}

export function DynamicPricingView({
  recommendations,
  onActionComplete,
}: DynamicPricingViewProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const pendingList = recommendations.filter((r) => r.status === 'PENDING_APPROVAL');
  const auditList = recommendations.filter((r) => r.status !== 'PENDING_APPROVAL');

  const handleAction = async (recommendationId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      setProcessingId(recommendationId);
      setFeedbackMessage(null);

      const res = await fetch('/api/v1/seller/analytics/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationId, action }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to update pricing recommendation.');
      }

      setFeedbackMessage({
        type: 'success',
        text: action === 'APPROVE' ? `Approved! Live price updated.` : 'Recommendation dismissed.',
      });
      onActionComplete();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Operation failed.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setFeedbackMessage(null);

      const res = await fetch('/api/v1/seller/analytics/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetMarginPct: 35, minMarginFloorPct: 15 }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to generate recommendations.');
      }

      setFeedbackMessage({
        type: 'success',
        text: `Analysis complete! Generated ${data.generatedCount || 0} pricing recommendations.`,
      });
      onActionComplete();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Generation failed.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const getStrategyBadge = (strat: string) => {
    switch (strat) {
      case 'VELOCITY_CLEARANCE':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
            Velocity Clearance
          </span>
        );
      case 'DEMAND_SURGE':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold">
            Demand Scarcity
          </span>
        );
      case 'MARGIN_OPTIMIZER':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
            Margin Optimizer
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Governance & Safety Banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-indigo-950">
              Merchant-Authorized Dynamic Pricing Engine
            </h4>
            <p className="text-xs text-indigo-800">
              Pricing recommendations strictly require your explicit approval before altering live product catalog prices.
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Analyzing...' : 'Run Pricing Scan'}
        </button>
      </div>

      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedbackMessage.text}
        </div>
      )}

      {/* Pending Recommendations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Pending Price Recommendations ({pendingList.length})
          </h3>
          <span className="text-xs text-zinc-400">Review & approve adjustments</span>
        </div>

        {pendingList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {pendingList.map((rec) => {
              const isIncrease = rec.priceDeltaRupees > 0;
              const isProcessing = processingId === rec.id;

              return (
                <div
                  key={rec.id}
                  className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-base text-zinc-900">{rec.productName}</h4>
                        <span className="text-xs text-zinc-500 block">
                          {rec.variantName} • <span className="font-mono">{rec.sku}</span>
                        </span>
                      </div>
                      {getStrategyBadge(rec.strategy)}
                    </div>

                    {/* Price Comparison */}
                    <div className="flex items-center gap-4 p-3 bg-zinc-50 rounded-xl">
                      <div>
                        <span className="text-[10px] text-zinc-400 block uppercase font-semibold">
                          Current Price
                        </span>
                        <span className="text-base font-bold text-zinc-600 line-through">
                          ₹{rec.currentPriceRupees.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <span className="text-zinc-300 font-bold">→</span>
                      <div>
                        <span className="text-[10px] text-zinc-400 block uppercase font-semibold">
                          Recommended
                        </span>
                        <span className="text-lg font-extrabold text-indigo-600">
                          ₹{rec.suggestedPriceRupees.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="ml-auto text-right">
                        <span
                          className={`inline-flex items-center text-xs font-extrabold ${
                            isIncrease ? 'text-emerald-600' : 'text-blue-600'
                          }`}
                        >
                          {isIncrease ? (
                            <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                          )}
                          {isIncrease ? '+' : ''}
                          {rec.priceDeltaPct}%
                        </span>
                        <span className="text-[10px] text-zinc-400 block">
                          (₹{Math.abs(rec.priceDeltaRupees)})
                        </span>
                      </div>
                    </div>

                    {/* Rationale explanation */}
                    <p className="text-xs text-zinc-700 leading-relaxed bg-zinc-50/50 p-3 rounded-xl border border-zinc-100">
                      💡 {rec.reasoning}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-3 border-t border-zinc-100">
                    <button
                      onClick={() => handleAction(rec.id, 'APPROVE')}
                      disabled={isProcessing}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-4 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve & Update Price
                    </button>
                    <button
                      onClick={() => handleAction(rec.id, 'REJECT')}
                      disabled={isProcessing}
                      className="py-2 px-4 bg-zinc-100 text-zinc-700 rounded-xl text-xs font-semibold hover:bg-zinc-200 transition disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-zinc-500 text-sm">
            No pending pricing recommendations. Click &quot;Run Pricing Scan&quot; to evaluate your catalog.
          </div>
        )}
      </div>

      {/* Pricing Audit History */}
      {auditList.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
          <h4 className="text-sm font-bold text-zinc-900 mb-1">Pricing Action Audit Trail</h4>
          <p className="text-xs text-zinc-500 mb-4">Historical approvals and dismissals</p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 uppercase text-[10px] font-semibold">
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3 text-right">Original</th>
                  <th className="py-2.5 px-3 text-right">Adjusted Price</th>
                  <th className="py-2.5 px-3">Strategy</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {auditList.slice(0, 6).map((audit) => (
                  <tr key={audit.id} className="hover:bg-zinc-50/50">
                    <td className="py-3 px-3 font-semibold text-zinc-900">{audit.productName}</td>
                    <td className="py-3 px-3 text-right font-mono text-zinc-500">
                      ₹{audit.currentPriceRupees.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-zinc-900">
                      ₹{audit.suggestedPriceRupees.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-zinc-600">{audit.strategy}</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          audit.status === 'APPLIED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {audit.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-zinc-400 font-mono">
                      {new Date(audit.createdAt).toLocaleDateString()}
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
