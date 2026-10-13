import React from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ProductForm } from '@/components/admin/ProductForm';

export const revalidate = 0; // Dynamic server component

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        variants: { orderBy: { sku: 'asc' } },
        images: { orderBy: { sortOrder: 'asc' } },
      },
    }),
    db.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!product) {
    notFound();
  }

  const initialData = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    description: product.description,
    basePrice: Number(product.basePrice),
    isPublished: product.isPublished,
    isFeatured: product.isFeatured,
    images: product.images.map((img) => ({
      url: img.url,
      altText: img.altText,
    })),
    variants: product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.name,
      priceOverride: v.priceOverride ? Number(v.priceOverride) : null,
      stockQuantity: v.stockQuantity,
    })),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
          Edit Product: {product.name}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Update pricing, description, imagery, or multi-variant SKU configuration.
        </p>
      </div>

      <ProductForm categories={categories} initialData={initialData} />
    </div>
  );
}
