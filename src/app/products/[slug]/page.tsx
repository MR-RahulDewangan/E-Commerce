import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductBySlug } from '@/modules/catalog/queries';
import { ProductDetailView } from '@/components/catalog/ProductDetailView';
import { ChevronRight } from 'lucide-react';

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60;

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-zinc-500 overflow-x-auto whitespace-nowrap">
        <Link href="/" className="hover:text-emerald-700 transition">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
        <Link href="/products" className="hover:text-emerald-700 transition">
          Catalog
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
        <Link
          href={`/products?category=${product.category.slug}`}
          className="hover:text-emerald-700 transition"
        >
          {product.category.name}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
        <span className="text-zinc-800 font-semibold truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Interactive PDP View */}
      <ProductDetailView product={product} />
    </div>
  );
}
