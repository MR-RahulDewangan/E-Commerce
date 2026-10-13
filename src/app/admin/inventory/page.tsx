'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Boxes,
  Search,
  AlertTriangle,
  RefreshCw,
  Plus,
  Minus,
  History,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';

interface AuditLogEntry {
  delta: number;
  previousStock: number;
  newStock: number;
  reason: string;
  adjustedBy: string;
  adjustedByName: string;
  timestamp: string;
}

interface InventoryVariant {
  id: string;
  sku: string;
  name: string;
  stockQuantity: number;
  priceOverride: number | null;
  effectivePrice: number;
  product: {
    id: string;
    name: string;
    slug: string;
    categoryName: string;
    imageUrl: string | null;
  };
  auditLog: AuditLogEntry[];
  lastAdjustedAt: string | null;
}

const REASON_PRESETS = [
  'Restocked from supplier batch',
  'Physical inventory count correction',
  'Damaged / defective stock written off',
  'Customer return accepted',
  'Sample / internal promotional allocation',
  'Other / custom explanation',
];

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [adjustingVariant, setAdjustingVariant] = useState<InventoryVariant | null>(null);
  const [delta, setDelta] = useState<number>(10);
  const [selectedReason, setSelectedReason] = useState<string>(REASON_PRESETS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // History modal
  const [historyVariant, setHistoryVariant] = useState<InventoryVariant | null>(null);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (lowStockOnly) params.set('lowStock', 'true');

      const res = await fetch(`/api/v1/admin/inventory?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to load inventory.');
      setItems(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching inventory data.');
    } finally {
      setLoading(false);
    }
  }, [search, lowStockOnly]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInventory();
  };

  const handleOpenAdjust = (item: InventoryVariant) => {
    setAdjustingVariant(item);
    setDelta(10);
    setSelectedReason(REASON_PRESETS[0]);
    setCustomReason('');
    setActionSuccess(null);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingVariant) return;

    const finalReason =
      selectedReason === 'Other / custom explanation'
        ? customReason.trim()
        : selectedReason;

    if (!finalReason) {
      setError('Please provide an adjustment reason.');
      return;
    }

    if (delta === 0) {
      setError('Delta adjustment cannot be zero.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: adjustingVariant.id,
          delta,
          reason: finalReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to adjust stock.');
      }

      setActionSuccess(
        `Successfully updated ${adjustingVariant.sku} from ${data.data.previousStock} to ${data.data.newStock} units.`
      );
      setAdjustingVariant(null);
      fetchInventory();
    } catch (err: any) {
      setError(err.message || 'Failed to submit adjustment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
            Inventory & Stock Manager
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Real-time physical stock counts, atomic increment/decrement adjustments, and audit trail logs.
          </p>
        </div>
        <button
          onClick={fetchInventory}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-300 rounded-lg text-sm font-semibold transition shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Stock</span>
        </button>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SKU, variant name, or product title..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-900 text-white rounded-lg text-sm font-semibold transition"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 cursor-pointer">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500"
            />
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Low Stock Alerts Only (≤ 5 units)</span>
            </span>
          </label>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-zinc-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-emerald-600" />
              <p className="text-sm">Querying real-time inventory levels...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <Boxes className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-zinc-800">No items found</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                No variants matched your current filters. Clear search or uncheck low stock filter.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500 text-xs font-semibold uppercase border-b border-zinc-100">
                <tr>
                  <th className="px-6 py-3.5">SKU & Variant</th>
                  <th className="px-6 py-3.5">Product & Category</th>
                  <th className="px-6 py-3.5">Price</th>
                  <th className="px-6 py-3.5">Current Stock</th>
                  <th className="px-6 py-3.5">Audit Trail</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((item) => {
                  const isOut = item.stockQuantity === 0;
                  const isLow = item.stockQuantity > 0 && item.stockQuantity <= 5;

                  return (
                    <tr key={item.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-mono font-bold text-xs text-zinc-900">
                          {item.sku}
                        </div>
                        <div className="text-xs text-zinc-500 font-medium">{item.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-zinc-900 text-xs line-clamp-1">
                          {item.product.name}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {item.product.categoryName}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-zinc-900 text-xs">
                        ₹{item.effectivePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${
                            isOut
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isLow
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                          {item.stockQuantity} units
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {item.auditLog.length > 0 ? (
                          <button
                            onClick={() => setHistoryVariant(item)}
                            className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-emerald-700 font-semibold"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>{item.auditLog.length} entry/ies</span>
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-400">No adjustments</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenAdjust(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                        >
                          <span>Adjust Stock</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Adjust Stock Modal Dialog */}
      {adjustingVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-extrabold text-zinc-900 text-lg">Adjust Inventory</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  SKU: <span className="font-mono font-bold">{adjustingVariant.sku}</span> (
                  {adjustingVariant.name})
                </p>
              </div>
              <button
                onClick={() => setAdjustingVariant(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-5">
              {/* Live stock calculation preview */}
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
                    Current Stock
                  </span>
                  <span className="text-xl font-extrabold text-zinc-900">
                    {adjustingVariant.stockQuantity}
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 text-zinc-400" />
                <div>
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
                    Adjustment
                  </span>
                  <span
                    className={`text-xl font-extrabold ${
                      delta > 0
                        ? 'text-emerald-600'
                        : delta < 0
                        ? 'text-rose-600'
                        : 'text-zinc-500'
                    }`}
                  >
                    {delta > 0 ? `+${delta}` : delta}
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 text-zinc-400" />
                <div>
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
                    New Stock
                  </span>
                  <span
                    className={`text-xl font-extrabold ${
                      adjustingVariant.stockQuantity + delta < 0
                        ? 'text-rose-600'
                        : 'text-zinc-900'
                    }`}
                  >
                    {adjustingVariant.stockQuantity + delta}
                  </span>
                </div>
              </div>

              {adjustingVariant.stockQuantity + delta < 0 && (
                <p className="text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Cannot reduce stock below zero units.</span>
                </p>
              )}

              {/* Delta Input and Quick Buttons */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Delta Units (+ to add, - to deduct) *
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDelta((d) => d - 10)}
                    className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-bold"
                  >
                    -10
                  </button>
                  <button
                    type="button"
                    onClick={() => setDelta((d) => d - 1)}
                    className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-bold"
                  >
                    -1
                  </button>
                  <input
                    type="number"
                    required
                    value={delta}
                    onChange={(e) => setDelta(parseInt(e.target.value) || 0)}
                    className="flex-1 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-center font-bold text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setDelta((d) => d + 1)}
                    className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-bold"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => setDelta((d) => d + 10)}
                    className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-bold"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => setDelta((d) => d + 25)}
                    className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-bold"
                  >
                    +25
                  </button>
                </div>
              </div>

              {/* Mandatory Reason Code */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Mandatory Reason Code *
                </label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {REASON_PRESETS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {selectedReason === 'Other / custom explanation' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    Custom Explanation *
                  </label>
                  <input
                    type="text"
                    required
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Enter audit explanation..."
                    className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setAdjustingVariant(null)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || delta === 0 || adjustingVariant.stockQuantity + delta < 0}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Confirm Adjustment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit History Modal */}
      {historyVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-zinc-200 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-extrabold text-zinc-900 text-base">
                  Inventory Audit History
                </h3>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">
                  SKU: {historyVariant.sku} | {historyVariant.name}
                </p>
              </div>
              <button
                onClick={() => setHistoryVariant(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3">
              {historyVariant.auditLog.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 text-xs">
                  No adjustments recorded yet.
                </div>
              ) : (
                [...historyVariant.auditLog].reverse().map((entry, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-start justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-zinc-900">{entry.reason}</div>
                      <div className="text-[11px] text-zinc-500">
                        Adjusted by: <span className="font-medium text-zinc-700">{entry.adjustedBy}</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        {new Date(entry.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`font-mono font-extrabold text-sm ${
                          entry.delta > 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {entry.delta > 0 ? `+${entry.delta}` : entry.delta} units
                      </span>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        {entry.previousStock} → {entry.newStock}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-100">
              <button
                onClick={() => setHistoryVariant(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
