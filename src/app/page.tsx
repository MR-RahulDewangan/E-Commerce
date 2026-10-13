import Link from 'next/link';
import { db } from '@/lib/db';
import { queryProducts } from '@/modules/catalog/queries';
import { ProductCard } from '@/components/catalog/ProductCard';
import { Sparkles, ArrowRight, ShieldCheck, Truck, Percent, Award } from 'lucide-react';

export const revalidate = 60; // ISR cache 60s

export default async function HomePage() {
  // Query featured products & categories from real DB
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
    <div className="space-y-12 pb-16">
      {/* Hero Banner */}
      <section className="relative bg-gradient-to-br from-emerald-900 via-zinc-900 to-black text-white py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Festive Handloom Collection 2026
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-3xl leading-tight">
            Handcrafted Heritage, <br />
            <span className="text-emerald-400">Delivered Across India</span>
          </h1>

          <p className="max-w-2xl text-zinc-300 text-sm sm:text-lg leading-relaxed">
            Discover authentic Banarasi silks, handloom cotton kurtas, and artisanal home textiles directly from master weavers. Transparent GST billing with guaranteed pan-India delivery.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/products"
              className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2 text-sm sm:text-base"
            >
              Explore Collection <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/products?category=sarees"
              className="px-6 py-3.5 bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 text-zinc-200 font-semibold rounded-xl transition text-sm sm:text-base"
            >
              Shop Silks & Sarees
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Highlights Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 sm:p-6 bg-white border border-zinc-200 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs sm:text-sm text-zinc-900">Free Delivery</p>
              <p className="text-[11px] text-zinc-500">Orders ₹999 and above</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs sm:text-sm text-zinc-900">100% Genuine</p>
              <p className="text-[11px] text-zinc-500">Certified artisan produce</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs sm:text-sm text-zinc-900">18% GST Inclusive</p>
              <p className="text-[11px] text-zinc-500">Zero hidden checkout taxes</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs sm:text-sm text-zinc-900">Indian Payments</p>
              <p className="text-[11px] text-zinc-500">UPI, RuPay, Netbanking, COD</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Curated Collections</h2>
            <p className="text-sm text-zinc-500 mt-1">Browse by authentic craft tradition</p>
          </div>
          <Link
            href="/products"
            className="text-emerald-700 hover:text-emerald-800 text-sm font-semibold flex items-center gap-1"
          >
            All Categories <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.slug}`}
              className="group p-4 bg-white border border-zinc-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition text-center flex flex-col items-center justify-center space-y-2"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg group-hover:bg-emerald-600 group-hover:text-white transition">
                {cat.name[0]}
              </div>
              <div>
                <p className="font-semibold text-xs sm:text-sm text-zinc-800 group-hover:text-emerald-700 transition">
                  {cat.name}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {cat._count.products} {cat._count.products === 1 ? 'item' : 'items'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Featured Products</h2>
            <p className="text-sm text-zinc-500 mt-1">Handpicked arrivals directly from our catalog</p>
          </div>
          <Link
            href="/products"
            className="text-emerald-700 hover:text-emerald-800 text-sm font-semibold flex items-center gap-1"
          >
            View All ({productsResult.pagination.totalItems}) <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
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
    </div>
  );
}
