import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Truck, RotateCcw, CreditCard, Sparkles } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-luxury-obsidian text-stone-300 mt-auto border-t border-stone-800 font-sans">
      {/* Value Proposition Highlights */}
      <section
        aria-label="Artisan Trust & Service Promises"
        className="border-b border-stone-800/80 py-10 bg-[#161616]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-stone-900 border border-stone-800 text-luxury-champagne rounded-xs flex-shrink-0">
              <Truck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-serif text-white text-sm tracking-wide">Pan-India Delivery</p>
              <p className="text-xs text-stone-400 mt-0.5 leading-normal">Complimentary on orders ₹999+</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-stone-900 border border-stone-800 text-luxury-champagne rounded-xs flex-shrink-0">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-serif text-white text-sm tracking-wide">Artisan Provenance</p>
              <p className="text-xs text-stone-400 mt-0.5 leading-normal">Certified authentic handlooms</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-stone-900 border border-stone-800 text-luxury-champagne rounded-xs flex-shrink-0">
              <CreditCard className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-serif text-white text-sm tracking-wide">Domestic Payments</p>
              <p className="text-xs text-stone-400 mt-0.5 leading-normal">UPI, RuPay, Netbanking, COD</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-stone-900 border border-stone-800 text-luxury-champagne rounded-xs flex-shrink-0">
              <RotateCcw className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-serif text-white text-sm tracking-wide">GST Tax Invoices</p>
              <p className="text-xs text-stone-400 mt-0.5 leading-normal">18% inclusive statutory billing</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Footer Navigation & Brand Pillars */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 text-xs">
        {/* Brand Column */}
        <div className="space-y-4">
          <div className="flex flex-col items-start">
            <span className="font-serif text-xl tracking-[0.2em] uppercase text-white font-medium">
              BharatStore
            </span>
            <span className="text-[9px] tracking-[0.3em] uppercase text-luxury-champagne font-sans font-medium -mt-0.5">
              Maison &bull; Handcrafted
            </span>
          </div>
          <p className="text-stone-400 leading-relaxed text-xs">
            A celebrated atelier for authentic Indian textiles, handloom Banarasi weaves, and artisanal heritage couture. Engineered with server-authoritative GST calculations and atomic stock integrity.
          </p>
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-stone-400 border border-stone-800 px-3 py-1.5 bg-stone-950">
              <Sparkles className="w-3.5 h-3.5 text-luxury-champagne" aria-hidden="true" />
              <span>Certified Handloom Silk & Pure Cotton</span>
            </span>
          </div>
        </div>

        {/* Collections Column */}
        <div>
          <p className="font-serif uppercase tracking-[0.15em] text-white text-sm mb-4 font-medium">
            Curated Collections
          </p>
          <ul className="space-y-2.5 text-stone-400">
            <li>
              <Link
                href="/products?category=sarees"
                className="hover:text-luxury-champagne hover:translate-x-1 transition-all inline-block"
              >
                Banarasi & Silk Sarees
              </Link>
            </li>
            <li>
              <Link
                href="/products?category=ethnic-wear"
                className="hover:text-luxury-champagne hover:translate-x-1 transition-all inline-block"
              >
                Artisanal Ethnic Wear
              </Link>
            </li>
            <li>
              <Link
                href="/products?category=handloom-fabrics"
                className="hover:text-luxury-champagne hover:translate-x-1 transition-all inline-block"
              >
                Pure Handloom Cottons
              </Link>
            </li>
            <li>
              <Link
                href="/products?category=mens-kurtas"
                className="hover:text-luxury-champagne hover:translate-x-1 transition-all inline-block"
              >
                Men&apos;s Festive Kurtas
              </Link>
            </li>
            <li>
              <Link
                href="/products"
                className="hover:text-luxury-champagne hover:translate-x-1 transition-all inline-block text-stone-300 font-medium"
              >
                View All Collections &rarr;
              </Link>
            </li>
          </ul>
        </div>

        {/* Concierge & Orders */}
        <div>
          <p className="font-serif uppercase tracking-[0.15em] text-white text-sm mb-4 font-medium">
            Client Concierge
          </p>
          <ul className="space-y-2.5 text-stone-400">
            <li>
              <Link
                href="/account/orders"
                className="hover:text-luxury-champagne hover:translate-x-1 transition-all inline-block"
              >
                Track My Consignment
              </Link>
            </li>
            <li>
              <Link
                href="/account/addresses"
                className="hover:text-luxury-champagne hover:translate-x-1 transition-all inline-block"
              >
                Shipping & PIN Code Lookup
              </Link>
            </li>
            <li>
              <span className="block text-stone-400">
                Email: <span className="text-stone-300">concierge@bharatstore.in</span>
              </span>
            </li>
            <li>
              <span className="block text-stone-400">
                Toll-free: <span className="text-stone-300">1800-202-6000 (Mon–Sat 9AM–7PM)</span>
              </span>
            </li>
          </ul>
        </div>

        {/* Compliance & Trust */}
        <div>
          <p className="font-serif uppercase tracking-[0.15em] text-white text-sm mb-4 font-medium">
            Statutory & Trust
          </p>
          <p className="text-stone-400 leading-relaxed text-xs">
            Registered entity under Karnataka GST regulations. All digital transactions are protected via TLS 1.3 encryption. Displayed consumer prices are inclusive of 18% GST (MRP).
          </p>
          <div className="mt-5 pt-4 border-t border-stone-800 text-[11px] text-stone-500 space-y-1">
            <p>&copy; {new Date().getFullYear()} BharatStore Maison. All rights reserved.</p>
            <p className="tracking-wide">Domestic E-Commerce Platform &bull; India</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
