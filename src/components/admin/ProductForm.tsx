'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Trash2,
  Package,
  Layers,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import Link from 'next/link';

interface CategoryOption {
  id: string;
  name: string;
}

interface VariantInput {
  id?: string;
  sku: string;
  name: string;
  priceOverride: string;
  stockQuantity: number;
}

interface ImageInput {
  url: string;
  altText: string;
}

interface ProductFormProps {
  categories: CategoryOption[];
  initialData?: {
    id: string;
    name: string;
    slug: string;
    categoryId: string;
    description: string;
    basePrice: number;
    isPublished: boolean;
    isFeatured: boolean;
    images: { url: string; altText: string | null }[];
    variants: {
      id: string;
      sku: string;
      name: string;
      priceOverride: number | null;
      stockQuantity: number;
    }[];
  };
}

export function ProductForm({ categories, initialData }: ProductFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialData);

  const [name, setName] = useState(initialData?.name || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || categories[0]?.id || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [basePrice, setBasePrice] = useState(initialData ? String(initialData.basePrice) : '');
  const [isPublished, setIsPublished] = useState(initialData?.isPublished || false);
  const [isFeatured, setIsFeatured] = useState(initialData?.isFeatured || false);

  const [images, setImages] = useState<ImageInput[]>(
    initialData?.images?.length
      ? initialData.images.map((img) => ({ url: img.url, altText: img.altText || '' }))
      : [{ url: '', altText: '' }]
  );

  const [variants, setVariants] = useState<VariantInput[]>(
    initialData?.variants?.length
      ? initialData.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          name: v.name,
          priceOverride: v.priceOverride !== null ? String(v.priceOverride) : '',
          stockQuantity: v.stockQuantity,
        }))
      : [
          {
            sku: '',
            name: 'Standard Edition',
            priceOverride: '',
            stockQuantity: 10,
          },
        ]
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAddImage = () => {
    setImages([...images, { url: '', altText: '' }]);
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleImageChange = (index: number, field: keyof ImageInput, value: string) => {
    const updated = [...images];
    updated[index][field] = value;
    setImages(updated);
  };

  const handleAddVariant = () => {
    setVariants([
      ...variants,
      {
        sku: '',
        name: `Variant ${variants.length + 1}`,
        priceOverride: '',
        stockQuantity: 0,
      },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length <= 1) return;
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index: number, field: keyof VariantInput, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Product title is required.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Product description is required.');
      return;
    }
    const numBasePrice = parseFloat(basePrice);
    if (isNaN(numBasePrice) || numBasePrice < 0) {
      setErrorMessage('Please enter a valid base price in INR (₹).');
      return;
    }
    if (!categoryId) {
      setErrorMessage('Please select a category.');
      return;
    }
    if (variants.length === 0) {
      setErrorMessage('Product must have at least one variant.');
      return;
    }

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.sku.trim()) {
        setErrorMessage(`Variant #${i + 1} requires a valid SKU.`);
        return;
      }
      if (!v.name.trim()) {
        setErrorMessage(`Variant #${i + 1} requires a name.`);
        return;
      }
      if (v.stockQuantity < 0) {
        setErrorMessage(`Variant #${i + 1} cannot have negative stock.`);
        return;
      }
    }

    const validImages = images.filter((img) => img.url.trim().length > 0);

    const payload = {
      name: name.trim(),
      ...(slug.trim() && { slug: slug.trim() }),
      categoryId,
      description: description.trim(),
      basePrice: numBasePrice,
      isPublished,
      isFeatured,
      images: validImages,
      variants: variants.map((v) => ({
        ...(v.id && { id: v.id }),
        sku: v.sku.trim(),
        name: v.name.trim(),
        priceOverride: v.priceOverride.trim() ? parseFloat(v.priceOverride) : null,
        stockQuantity: Number(v.stockQuantity),
      })),
    };

    setIsSubmitting(true);
    try {
      const url = isEditing
        ? `/api/v1/admin/products/${initialData?.id}`
        : '/api/v1/admin/products';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to save product.');
      }

      router.push('/admin/products');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
      {/* Top back bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Products</span>
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>{isEditing ? 'Update Product' : 'Create Product'}</span>
            )}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Section 1: Basic Information */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-xs space-y-5">
        <h2 className="text-base font-bold text-zinc-900 border-b border-zinc-100 pb-3">
          Basic Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Product Title *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Handloom Cotton Kurta"
              className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              URL Slug (Optional)
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Auto-generated from title if blank"
              className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Category *
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Description *
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of materials, craft, care instructions, and Indian sizing..."
              className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Pricing and Visibility */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-xs space-y-5">
        <h2 className="text-base font-bold text-zinc-900 border-b border-zinc-100 pb-3">
          Pricing & Storefront Status
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Base Price (INR ₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="499.00"
                className="w-full pl-8 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <p className="text-[11px] text-zinc-400">All prices include 18% GST.</p>
          </div>

          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="isPublished"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500"
            />
            <label htmlFor="isPublished" className="text-sm font-semibold text-zinc-800 cursor-pointer">
              Publish on Storefront
            </label>
          </div>

          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="isFeatured"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500"
            />
            <label htmlFor="isFeatured" className="text-sm font-semibold text-zinc-800 cursor-pointer">
              Feature on Homepage
            </label>
          </div>
        </div>
      </div>

      {/* Section 3: Product Images */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Product Images</h2>
            <p className="text-xs text-zinc-500">Provide direct image URLs for gallery showcase.</p>
          </div>
          <button
            type="button"
            onClick={handleAddImage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Image</span>
          </button>
        </div>

        <div className="space-y-3">
          {images.map((img, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center">
                {img.url ? (
                  <img src={img.url} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-zinc-400" />
                )}
              </div>
              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={img.url}
                onChange={(e) => handleImageChange(idx, 'url', e.target.value)}
                className="flex-1 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <input
                type="text"
                placeholder="Alt text (optional)"
                value={img.altText}
                onChange={(e) => handleImageChange(idx, 'altText', e.target.value)}
                className="w-48 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 hidden sm:block"
              />
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Product Variants */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-zinc-900">SKUs & Multi-Variants *</h2>
            <p className="text-xs text-zinc-500">Configure size, color options, SKU codes, and stock.</p>
          </div>
          <button
            type="button"
            onClick={handleAddVariant}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Variant</span>
          </button>
        </div>

        <div className="space-y-4">
          {variants.map((v, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">
                  Variant #{idx + 1}
                </span>
                {variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(idx)}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KRT-WHT-L"
                    value={v.sku}
                    onChange={(e) => handleVariantChange(idx, 'sku', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                    Variant Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Size L - White"
                    value={v.name}
                    onChange={(e) => handleVariantChange(idx, 'name', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                    Price Override (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Blank = Base Price"
                    value={v.priceOverride}
                    onChange={(e) => handleVariantChange(idx, 'priceOverride', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={v.stockQuantity}
                    onChange={(e) => handleVariantChange(idx, 'stockQuantity', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Save Action */}
      <div className="flex justify-end gap-3 pt-4">
        <Link
          href="/admin/products"
          className="px-6 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-sm font-semibold transition"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition shadow-sm disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Product...</span>
            </>
          ) : (
            <span>{isEditing ? 'Update Product' : 'Create Product'}</span>
          )}
        </button>
      </div>
    </form>
  );
}
