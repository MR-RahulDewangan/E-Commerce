'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface VariantRow {
  sku: string;
  name: string;
  stockQuantity: number;
  priceOverride: number | '';
  size: string;
  color: string;
}

export default function NewSellerProductPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState<number | ''>('');
  const [categoryId, setCategoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  const [variants, setVariants] = useState<VariantRow[]>([
    { sku: '', name: 'Standard Edition', stockQuantity: 10, priceOverride: '', size: 'M', color: 'Default' },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/v1/categories');
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setCategories(data.data);
          if (data.data.length > 0) {
            setCategoryId(data.data[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to load categories', e);
      } finally {
        setLoadingCategories(false);
      }
    }
    fetchCategories();
  }, []);

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        sku: '',
        name: `Variant ${prev.length + 1}`,
        stockQuantity: 10,
        priceOverride: '',
        size: '',
        color: '',
      },
    ]);
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 1) return;
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof VariantRow, value: any) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (!description.trim() || description.length < 10) {
      setError('Description must be at least 10 characters.');
      return;
    }
    if (typeof basePrice !== 'number' || basePrice <= 0) {
      setError('Valid base price in INR is required.');
      return;
    }
    if (!categoryId) {
      setError('Category is required.');
      return;
    }

    for (let i = 0; i < variants.length; i++) {
      if (!variants[i].sku.trim()) {
        setError(`SKU is required for Variant ${i + 1}.`);
        return;
      }
      if (variants[i].stockQuantity < 0) {
        setError(`Stock cannot be negative for Variant ${i + 1}.`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        name,
        description,
        basePrice: Number(basePrice),
        categoryId,
        imageUrl: imageUrl.trim() || undefined,
        isPublished,
        variants: variants.map((v) => ({
          sku: v.sku.trim(),
          name: v.name.trim(),
          stockQuantity: Number(v.stockQuantity),
          priceOverride: v.priceOverride !== '' ? Number(v.priceOverride) : null,
          size: v.size.trim() || undefined,
          color: v.color.trim() || undefined,
        })),
      };

      const res = await fetch('/api/v1/seller/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to create product listing');
      }

      router.push('/seller/products');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating product.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button & Title */}
      <div className="flex items-center gap-4">
        <Link
          href="/seller/products"
          className="p-2 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Create New Product</h1>
          <p className="text-sm text-zinc-500">
            Publish an authentic item to the marketplace catalog with variants and initial stock.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Product Information */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-zinc-900">General Information</h2>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
              Product Title *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Handcrafted Kashmiri Pashmina Shawl"
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                Category *
              </label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={loadingCategories}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                Base Price (₹ INR) *
              </label>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={basePrice}
                onChange={(e) =>
                  setBasePrice(e.target.value === '' ? '' : parseFloat(e.target.value))
                }
                placeholder="e.g. 2999"
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
              Detailed Description *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe craftsmanship, material, weave pattern, care instructions, and dimensions..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
              Primary Image URL
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <p className="text-xs text-zinc-400">
              Provide a direct Unsplash or high-resolution image URL.
            </p>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-zinc-800">
                Publish immediately to customer catalog
              </span>
            </label>
          </div>
        </div>

        {/* Product Variants Section */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-900">Inventory Variants</h2>
              <p className="text-xs text-zinc-500">
                Specify sizes, colors, unique SKUs, and initial warehouse stock units.
              </p>
            </div>
            <button
              type="button"
              onClick={addVariant}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add Variant
            </button>
          </div>

          <div className="space-y-3">
            {variants.map((v, index) => (
              <div
                key={index}
                className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/60 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    Variant #{index + 1}
                  </span>
                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      className="text-rose-600 hover:text-rose-800 p-1"
                      title="Remove variant"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-zinc-600">
                      SKU Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={v.sku}
                      onChange={(e) =>
                        updateVariant(index, 'sku', e.target.value.toUpperCase())
                      }
                      placeholder="e.g. KSH-PAS-BLUE-M"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-zinc-600">
                      Variant Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={v.name}
                      onChange={(e) => updateVariant(index, 'name', e.target.value)}
                      placeholder="e.g. Size M / Royal Blue"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-zinc-600">
                      Initial Stock Quantity *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={v.stockQuantity}
                      onChange={(e) =>
                        updateVariant(
                          index,
                          'stockQuantity',
                          parseInt(e.target.value || '0', 10)
                        )
                      }
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-zinc-600">
                      Size Attribute
                    </label>
                    <input
                      type="text"
                      value={v.size}
                      onChange={(e) => updateVariant(index, 'size', e.target.value)}
                      placeholder="e.g. M, Free Size, 2.5m"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-zinc-600">
                      Color Attribute
                    </label>
                    <input
                      type="text"
                      value={v.color}
                      onChange={(e) => updateVariant(index, 'color', e.target.value)}
                      placeholder="e.g. Indigo Blue, Saffron Gold"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-zinc-600">
                      Price Override (₹ INR, optional)
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={v.priceOverride}
                      onChange={(e) =>
                        updateVariant(
                          index,
                          'priceOverride',
                          e.target.value === '' ? '' : parseFloat(e.target.value)
                        )
                      }
                      placeholder="Leave blank for base price"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/seller/products"
            className="px-5 py-2.5 rounded-xl border border-zinc-300 text-zinc-700 text-sm font-semibold hover:bg-zinc-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Publishing Product...
              </>
            ) : (
              'Save & Publish Product'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
