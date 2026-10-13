import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Truck, RotateCcw, CreditCard } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-zinc-900 text-zinc-300 mt-auto border-t border-zinc-800">
      {/* Value Proposition Highlights */}
      <div className="border-b border-zinc-800 py-8 bg-zinc-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="p-2.5 bg-emerald-950/60 text-emerald-400 rounded-lg">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">All-India Delivery</p>
              <p className="text-xs text-zinc-400">Free delivery on ₹999+</p>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="p-2.5 bg-emerald-950/60 text-emerald-400 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">100% Authentic</p>
              <p className="text-xs text-zinc-400">Direct artisan sourcing</p>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="p-2.5 bg-emerald-950/60 text-emerald-400 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Secure Indian Payments</p>
              <p className="text-xs text-zinc-400">UPI, RuPay, Netbanking, COD</p>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="p-2.5 bg-emerald-950/60 text-emerald-400 rounded-lg">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">GST Compliant</p>
              <p className="text-xs text-zinc-400">18% GST invoices with HSN</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
              B
            </div>
            <span className="font-bold text-white text-base">BharatStore</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            India&apos;s premier enterprise handloom and modern retail destination. Built with server-authoritative GST pricing and atomic inventory protection.
          </p>
        </div>

        <div>
          <p className="font-semibold text-white mb-3 text-sm">Explore Catalog</p>
          <ul className="space-y-2 text-xs text-zinc-400">
            <li>
              <Link href="/products?category=ethnic-wear" className="hover:text-emerald-400 transition">
                Ethnic Wear
              </Link>
            </li>
            <li>
              <Link href="/products?category=sarees" className="hover:text-emerald-400 transition">
                Banarasi & Silk Sarees
              </Link>
            </li>
            <li>
              <Link href="/products?category=handloom-fabrics" className="hover:text-emerald-400 transition">
                Handloom Cottons
              </Link>
            </li>
            <li>
              <Link href="/products?category=mens-kurtas" className="hover:text-emerald-400 transition">
                Men&apos;s Formal Kurtas
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-white mb-3 text-sm">Customer Care</p>
          <ul className="space-y-2 text-xs text-zinc-400">
            <li>
              <Link href="/account/orders" className="hover:text-emerald-400 transition">
                Track Orders
              </Link>
            </li>
            <li>
              <Link href="/account/addresses" className="hover:text-emerald-400 transition">
                Shipping & PIN Lookup
              </Link>
            </li>
            <li>
              <span className="text-zinc-500">Support: support@bharatstore.in</span>
            </li>
            <li>
              <span className="text-zinc-500">Toll-free: 1800-202-6000 (Mon-Sat 9AM-7PM)</span>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-white mb-3 text-sm">Compliance & Trust</p>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Registered with GSTIN Karnataka. All transactions encrypted via TLS 1.3. Prices displayed are MRP inclusive of 18% GST.
          </p>
          <div className="mt-4 flex gap-2 text-xs text-zinc-500">
            <span>© 2026 BharatStore. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
