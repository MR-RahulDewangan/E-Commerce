'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Boxes,
  Search,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Plus,
  Minus,
} from 'lucide-react';

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  stockQuantity: number;
  priceOverride: string | null;
  product: {
    id: string;
    name: string;
    slug: string;
    basePrice: string;
    images: { url: string }[];
  };
}

export default function SellerInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [stockInputs, setStockInputs] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<{ id: string; msg: string; type: 'success' | 'error' } | null>(null);

  const fetchInventory = async (query = '') => {
    try {
      setLoading(true);
      const url = query
        ? `/api/v1/seller/inventory?search=${encodeURIComponent(query)}`
        : '/api/v1/seller/inventory';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setItems(json.data);
        const map: Record<string, number> = {};
        json.data.forEach((item: InventoryItem) => {
          map[item.id] = item.stockQuantity;
        });
        setStockInputs(map);
      }
    } catch (e) {
      console.error('Failed to load inventory', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInventory(search);
  };

  const handleUpdateStock = async (variantId: string) => {
    const targetQuantity = stockInputs[variantId];
    if (typeof targetQuantity !== 'number' || targetQuantity < 0) {
      setFeedback({ id: variantId, msg: 'Invalid stock count', type: 'error' });
      return;
    }

    setUpdatingId(variantId);
    setFeedback(null);

    try {
      const res = await fetch('/api/v1/seller/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId,
          stockQuantity: targetQuantity,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to update stock');
      }

      setItems((prev) =>
        prev.map((i) => (i.id === variantId ? { ...i, stockQuantity: targetQuantity } : i))
      );
      setFeedback({ id: variantId, msg: 'Stock updated!', type: 'success' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ id: variantId, msg: err.message || 'Update failed', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const changeStockInput = (variantId: string, delta: number) => {
    setStockInputs((prev) => {
      const current = prev[variantId] ?? 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [variantId]: next };
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Inventory Management</h1>
          <p className="text-sm text-zinc-500">
            Real-time warehouse stock tracking and instant inventory level adjustments.
          </p>
        </div>
        <button
          onClick={() => fetchInventory(search)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-xl text-sm font-semibold hover:bg-zinc-50 transition shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search Filter */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU, variant name, or product..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition"
        >
          Search
        </button>
      </form>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="py-20 text-center text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
            <p className="text-sm">Loading seller inventory...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 space-y-2">
            <Boxes className="w-12 h-12 text-zinc-300 mx-auto" />
            <p className="font-semibold text-zinc-800">No inventory records found</p>
            <p className="text-xs text-zinc-400">Add products to your catalog to populate inventory.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Product / Variant</th>
                  <th className="py-3.5 px-4">SKU</th>
                  <th className="py-3.5 px-4">Unit Price</th>
                  <th className="py-3.5 px-4">Current Stock</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Adjust Stock Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-sm">
                {items.map((item) => {
                  const imageUrl = item.product.images[0]?.url || '/placeholder.png';
                  const effectivePrice = item.priceOverride || item.product.basePrice;
                  const isLow = item.stockQuantity <= 5 && item.stockQuantity > 0;
                  const isOut = item.stockQuantity === 0;

                  return (
                    <tr key={item.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-zinc-100 overflow-hidden shrink-0 relative border border-zinc-200">
                            <Image
                              src={imageUrl}
                              alt={item.product.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-900 max-w-xs truncate">
                              {item.product.name}
                            </p>
                            <p className="text-xs text-zinc-500">{item.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs font-semibold text-zinc-700">
                        {item.sku}
                      </td>
                      <td className="py-4 px-4 font-bold text-zinc-900">
                        ₹{Number(effectivePrice).toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`font-extrabold text-base ${
                            isOut
                              ? 'text-rose-600'
                              : isLow
                              ? 'text-amber-600'
                              : 'text-zinc-900'
                          }`}
                        >
                          {item.stockQuantity}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {isOut ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Low Stock (≤ 5)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Healthy
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => changeStockInput(item.id, -1)}
                            className="w-7 h-7 rounded-lg border border-zinc-300 flex items-center justify-center text-zinc-600 hover:bg-zinc-100"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={stockInputs[item.id] ?? item.stockQuantity}
                            onChange={(e) =>
                              setStockInputs((prev) => ({
                                ...prev,
                                [item.id]: parseInt(e.target.value || '0', 10),
                              }))
                            }
                            className="w-16 px-2 py-1 text-center font-bold text-sm border border-zinc-300 rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => changeStockInput(item.id, 1)}
                            className="w-7 h-7 rounded-lg border border-zinc-300 flex items-center justify-center text-zinc-600 hover:bg-zinc-100"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === item.id}
                            onClick={() => handleUpdateStock(item.id)}
                            className="ml-1 px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                          >
                            {updatingId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              'Save'
                            )}
                          </button>
                        </div>
                        {feedback && feedback.id === item.id && (
                          <p
                            className={`text-[11px] mt-1 font-semibold ${
                              feedback.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {feedback.msg}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
