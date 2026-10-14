import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductBySlug, queryProducts } from '@/modules/catalog/queries';
import { ProductDetailView } from '@/components/catalog/ProductDetailView';
import { ProductCard } from '@/components/catalog/ProductCard';
import { ChevronRight, ArrowRight, Sparkles } from 'lucide-react';

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60; // 60s ISR cache

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  // Query related products from the same category
  const relatedResult = await queryProducts({
    category: product.category.slug,
    limit: 5,
    sort: 'newest',
  });

  // Filter out the current product and take at most 4 related items
  const relatedProducts = relatedResult.items
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12 sm:space-y-16">
      {/* 1. Editorial Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-xs font-sans uppercase tracking-editorial text-muted-foreground overflow-x-auto whitespace-nowrap"
      >
        <Link href="/" className="hover:text-foreground transition-colors">
          Maison
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" aria-hidden="true" />
        <Link href="/products" className="hover:text-foreground transition-colors">
          All Collections
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" aria-hidden="true" />
        <Link
          href={`/products?category=${product.category.slug}`}
          className="hover:text-foreground transition-colors"
        >
          {product.category.name}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" aria-hidden="true" />
        <span className="text-foreground font-medium truncate max-w-xs" aria-current="page">
          {product.name}
        </span>
      </nav>

      {/* 2. Primary Product Showcase */}
      <main>
        <ProductDetailView product={product} />
      </main>

      {/* 3. Related Products Section: Curated Companions */}
      {relatedProducts.length > 0 && (
        <section aria-labelledby="related-products-heading" className="space-y-8 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-sans uppercase tracking-[0.25em] text-muted-foreground font-medium">
                Harmonious Pairings
              </p>
              <h2
                id="related-products-heading"
                className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-foreground mt-1"
              >
                You May Also Admire
              </h2>
            </div>
            <Link
              href={`/products?category=${product.category.slug}`}
              className="text-foreground hover:text-luxury-charcoal text-xs font-sans uppercase tracking-editorial font-medium flex items-center gap-1.5 group"
            >
              <span>Explore More in {product.category.name}</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {relatedProducts.map((p) => (
              <ProductCard
                key={p.id}
                id={p.id}
                name={p.name}
                slug={p.slug}
                categoryName={p.category.name}
                startingPrice={p.basePrice}
                imageUrl={p.primaryImage}
                variantsCount={p.variantCount}
                inStock={p.inStock}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
