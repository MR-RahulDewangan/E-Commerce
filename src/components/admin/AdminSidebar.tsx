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
  BarChart3,
  Store,
  LogOut,
  Menu,
  X,
  ShieldAlert,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Products', href: '/admin/products', icon: Package },
  { label: 'Inventory', href: '/admin/inventory', icon: Boxes },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingBag },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  const navContent = (
    <div className="flex flex-col h-full bg-zinc-900 text-zinc-100">
      {/* Brand header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white text-lg">
            E
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white block">
              Admin Portal
            </span>
            <span className="text-[10px] text-zinc-400 font-medium tracking-wider uppercase block">
              Enterprise Store
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

      {/* Role badge */}
      {user && (
        <div className="px-6 py-3 bg-zinc-950/60 border-b border-zinc-800/80 flex items-center justify-between text-xs">
          <span className="text-zinc-400 truncate max-w-[140px]">
            {user.firstName} {user.lastName}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold text-[10px] uppercase tracking-wider">
            {user.role}
          </span>
        </div>
      )}

      {/* Navigation links */}
      <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
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
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Utilities */}
      <div className="p-4 border-t border-zinc-800 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <Store className="w-4 h-4" />
          <span>Customer Storefront</span>
        </Link>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors text-left"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu trigger */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-zinc-900 text-white px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-1.5 rounded-md bg-zinc-800 text-zinc-300 hover:text-white"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm">Admin Portal</span>
        </div>
        <Link
          href="/"
          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
        >
          <Store className="w-3.5 h-3.5" />
          <span>Storefront</span>
        </Link>
      </div>

      {/* Mobile drawer backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 transform transition-transform duration-200 ease-in-out lg:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-1/0 -translate-x-full'
        }`}
      >
        {navContent}
      </aside>

      {/* Desktop static sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 border-r border-zinc-800">
        {navContent}
      </aside>
    </>
  );
}
