'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { User, Package, MapPin, Heart, LogOut } from 'lucide-react';

const ACCOUNT_TABS = [
  { label: 'Profile Dossier', href: '/account/profile', icon: User },
  { label: 'Order History', href: '/account/orders', icon: Package },
  { label: 'Delivery Addresses', href: '/account/addresses', icon: MapPin },
  { label: 'Saved Wishlist', href: '/account/wishlist', icon: Heart },
];

export function AccountNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="border-b border-border pb-6 space-y-6">
      {/* Account Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
            Customer Atelier Portal
          </span>
          <h1 className="font-serif text-2xl sm:text-4xl font-normal text-foreground tracking-tight pt-1">
            Welcome, {user.firstName}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {user.email} • Account Status: <strong className="text-foreground capitalize">{user.role.toLowerCase()}</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground hover:text-rose-700 font-medium transition cursor-pointer self-start sm:self-auto"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>

      {/* Tabs */}
      <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1" aria-label="Account navigation">
        {ACCOUNT_TABS.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xs text-[11px] sm:text-xs uppercase tracking-wider font-medium whitespace-nowrap transition border ${
                isActive
                  ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                  : 'border-border/80 bg-card text-muted-foreground hover:text-foreground hover:border-stone-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
