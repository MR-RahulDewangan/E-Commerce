import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/db';
import { queryProducts } from '@/modules/catalog/queries';
import { ProductCard } from '@/components/catalog/ProductCard';
import { NewsletterSection } from '@/components/home/NewsletterSection';
import { ArrowRight, Sparkles, ShieldCheck, Truck, Scale, Award } from 'lucide-react';

export const revalidate = 60; // ISR cache 60s

export default async function HomePage() {
  // Query featured products & categories from real PostgreSQL DB
  const [productsResult, categories] = await Promise.all([
    queryProducts({ limit: 8, sort: 'newest' }),
    db.category.findMany({
      take: 6,
      include: { _count: { select: { products: true } } },
      orderBy: { products: { _count: 'desc' } },
    }),
  ]);

  const featuredProducts = productsResult.items;

  return (
    <div className="space-y-20 sm:space-y-32 pb-24">
      {/* 1. Haute Couture Hero Banner */}
      <section className="relative min-h-[580px] sm:min-h-[720px] flex items-center justify-center overflow-hidden bg-luxury-obsidian text-luxury-ivory">
        {/* Background Editorial Visual with Subtle Parallax Feel */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=2000&q=85"
            alt="Handloom silk textile weaving on traditional wooden loom"
            fill
            priority
            className="object-cover object-center opacity-40 brightness-75 scale-102"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-luxury-obsidian via-luxury-obsidian/40 to-luxury-obsidian/60" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 sm:space-y-8 py-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-luxury-champagne/40 bg-luxury-obsidian/60 backdrop-blur-xs text-luxury-champagne text-[11px] font-sans uppercase tracking-[0.25em]">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Festive Haute Couture &bull; 2026 Atelier</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-6xl md:text-7xl font-normal tracking-tight text-white leading-[1.1] max-w-4xl mx-auto">
            Handcrafted Heritage, <br />
            <span className="italic font-normal text-luxury-champagne">Reimagined for Luxury.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-stone-300 text-xs sm:text-base font-sans font-light leading-relaxed tracking-wide">
            Curated Banarasi silks, certified Kashmiri pashminas, and artisanal handloom kurtas sourced directly from master weavers. Transparent GST billing with insured all-India dispatch.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-4 w-full">
            <Link
              href="/products"
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-luxury-ivory text-luxury-obsidian hover:bg-luxury-champagne text-[11px] sm:text-xs font-sans uppercase tracking-[0.16em] sm:tracking-[0.18em] font-medium transition duration-200 flex items-center justify-center gap-2.5 shadow-sm"
            >
              <span>Explore All Collections</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link
              href="/products?category=artisanal-handlooms"
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-transparent border border-stone-400 hover:border-white text-white text-[11px] sm:text-xs font-sans uppercase tracking-[0.16em] sm:tracking-[0.18em] font-medium transition duration-200 text-center"
            >
              The Handloom & Silk Gallery
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Brand Ethos & Trust Pillars */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="border border-border bg-card p-4 sm:p-10 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-muted text-foreground border border-border flex-shrink-0">
              <Truck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-medium text-foreground tracking-wide">
                Pan-India Delivery
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-normal">
                Complimentary on ₹999+ with tracking
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-muted text-foreground border border-border flex-shrink-0">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-medium text-foreground tracking-wide">
                Artisan Provenance
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-normal">
                Direct sourcing from master weavers
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-muted text-foreground border border-border flex-shrink-0">
              <Scale className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-medium text-foreground tracking-wide">
                18% GST Inclusive
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-normal">
                Zero surprise checkout taxes
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-muted text-foreground border border-border flex-shrink-0">
              <Award className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-medium text-foreground tracking-wide">
                Domestic Settlement
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-normal">
                UPI, RuPay, Netbanking & COD
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Curated Collections Gallery (Real DB Categories) */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/80 pb-4">
          <div>
            <p className="text-[10px] font-sans uppercase tracking-[0.2em] text-muted-foreground font-medium">
              Curated Ateliers
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-foreground mt-1">
              Browse by Craft Tradition
            </h2>
          </div>
          <Link
            href="/products"
            className="text-foreground hover:text-luxury-charcoal text-xs font-sans uppercase tracking-editorial font-medium flex items-center gap-1.5 group"
          >
            <span>All Categories</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.slug}`}
              className="group relative flex flex-col aspect-[4/5] bg-muted border border-border overflow-hidden hover:border-luxury-champagne transition-all duration-300"
            >
              {cat.imageUrl ? (
                <Image
                  src={cat.imageUrl}
                  alt={cat.name}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                />
              ) : null}
              {/* Dark subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-luxury-obsidian/90 via-luxury-obsidian/30 to-transparent transition-opacity group-hover:opacity-90" />

              <div className="absolute inset-x-0 bottom-0 p-3 sm:p-3.5 text-center text-white space-y-0.5">
                <p className="font-serif text-xs sm:text-sm font-medium tracking-wide">
                  {cat.name}
                </p>
                <p className="text-[9px] sm:text-[10px] text-stone-300 uppercase tracking-widest font-sans">
                  {cat._count.products} {cat._count.products === 1 ? 'Design' : 'Designs'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. Seasonal Curations (Real DB Products) */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/80 pb-4">
          <div>
            <p className="text-[10px] font-sans uppercase tracking-[0.2em] text-muted-foreground font-medium">
              Seasonal Releases
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-foreground mt-1">
              Featured Handloom Creations
            </h2>
          </div>
          <Link
            href="/products"
            className="text-foreground hover:text-luxury-charcoal text-xs font-sans uppercase tracking-editorial font-medium flex items-center gap-1.5 group"
          >
            <span>View All ({productsResult.pagination.totalItems})</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
          {featuredProducts.map((p) => (
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

      {/* 5. Editorial Storytelling: The Master Weavers */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 border border-border bg-card overflow-hidden">
          {/* Story Visual */}
          <div className="relative min-h-[300px] sm:min-h-[480px] bg-muted">
            <Image
              src="https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&q=80"
              alt="Traditional Indian master weaver working on intricate handloom textile"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          {/* Story Narrative */}
          <div className="p-5 sm:p-12 lg:p-16 flex flex-col justify-center space-y-4 sm:space-y-6">
            <p className="text-[10px] font-sans uppercase tracking-[0.25em] text-luxury-champagne font-medium">
              Atelier Chronicle &bull; Artisan Heritage
            </p>
            <h2 className="font-serif text-2xl sm:text-4xl font-normal text-foreground tracking-tight leading-tight">
              Woven with Patience. <br />
              <span className="italic">Delivered with Reverence.</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Every creation featured at BharatStore Maison represents generations of uninterrupted Indian craftsmanship. From the wooden looms of Varanasi where silver-dipped zari is intertwined with mulberry silk, to the remote valleys of Kashmir where pashmina wool is hand-spun, we bypass middlemen to ensure master artisans receive fair value while connoisseurs receive certified provenance.
            </p>
            <div className="pt-2">
              <Link
                href="/products?category=organic-khadi"
                className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 border border-foreground text-foreground hover:bg-foreground hover:text-background text-[11px] font-sans uppercase tracking-[0.16em] sm:tracking-[0.18em] font-medium transition duration-200"
              >
                <span>Discover Organic Khadi</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Client Newsletter Section */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <NewsletterSection />
      </div>
    </div>
  );
}
