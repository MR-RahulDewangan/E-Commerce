import React from 'react';
import { db } from '@/lib/db';
import { ProductForm } from '@/components/admin/ProductForm';

export const revalidate = 0; // Dynamic server component

export default async function NewProductPage() {
  const categories = await db.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
          Create New Product
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Add a new SKU and item to your Indian e-commerce catalog.
        </p>
      </div>

      <ProductForm categories={categories} />
    </div>
  );
}
