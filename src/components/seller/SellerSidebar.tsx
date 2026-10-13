'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingBag,
  Store,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

interface SellerSidebarProps {
  storeName?: string;
  storeSlug?: string;
  isVerified?: boolean;
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/seller', icon: LayoutDashboard },
  { label: 'My Products', href: '/seller/products', icon: Package },
  { label: 'Inventory', href: '/seller/inventory', icon: Boxes },
  { label: 'Orders', href: '/seller/orders', icon: ShoppingBag },
  { label: 'Store Profile', href: '/seller/profile', icon: Store },
];

export function SellerSidebar({ storeName = 'Seller Hub', storeSlug, isVerified = true }: SellerSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/seller') {
      return pathname === '/seller';
    }
    return pathname.startsWith(href);
  };

  const navContent = (
    <div className="flex flex-col h-full bg-zinc-900 text-zinc-100">
      {/* Brand header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
        <Link href="/seller" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center font-bold text-white text-lg shadow-inner">
            S
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white block">
              Seller Portal
            </span>
            <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase block">
              Multi-Vendor Marketplace
            </span>
          </div>
        </Link>
        <button
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden text-zinc-400 hover:text-white p-1"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Store Badge */}
      <div className="px-6 py-4 bg-zinc-950/70 border-b border-zinc-800/80">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-sm text-zinc-200 truncate max-w-[160px]">
            {storeName}
          </span>
          {isVerified && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800 text-[10px] font-semibold">
              <ShieldCheck className="w-3 h-3 text-indigo-400" /> Verified
            </span>
          )}
        </div>
        {user && (
          <p className="text-xs text-zinc-400 truncate">
            {user.firstName} {user.lastName} ({user.email})
          </p>
        )}
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer quick links & sign out */}
      <div className="p-4 border-t border-zinc-800 space-y-2">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-md transition"
        >
          <ExternalLink className="w-4 h-4" />
          <span>View Customer Storefront</span>
        </Link>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-md transition text-left"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <Link href="/seller" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
            S
          </div>
          <span className="font-bold text-sm text-white">Seller Portal</span>
        </Link>
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-1.5 text-zinc-400 hover:text-white rounded-md bg-zinc-800"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 w-64 z-50 transform transition-transform duration-200 ease-in-out lg:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </div>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 min-h-screen">
        {navContent}
      </aside>
    </>
  );
}
