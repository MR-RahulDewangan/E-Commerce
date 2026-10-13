'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import {
  ShoppingBag,
  Heart,
  User as UserIcon,
  Search,
  Menu,
  X,
  LogOut,
  Package,
  MapPin,
  ChevronDown,
} from 'lucide-react';

export function Header() {
  const router = useRouter();
  const { user, openAuthModal, logout } = useAuth();
  const { itemCount, openCartDrawer } = useCart();
  const { count: wishlistCount } = useWishlist();

  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Top promotional banner */}
      <div className="bg-emerald-800 text-white text-xs py-2 px-4 text-center font-medium tracking-wide">
        <span>🇮🇳 Free Delivery Across India on Orders Above ₹999 | Inclusive of 18% GST</span>
      </div>

      <header className="sticky top-0 z-40 bg-white border-b border-zinc-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
              aria-label="Toggle navigation"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                B
              </div>
              <span className="font-extrabold text-xl tracking-tight text-zinc-900 hidden sm:inline">
                Bharat<span className="text-emerald-600">Store</span>
              </span>
            </Link>

            {/* Search Bar (Desktop) */}
            <form
              onSubmit={handleSearch}
              className="hidden md:flex flex-1 max-w-lg relative items-center"
            >
              <input
                type="text"
                placeholder="Search handlooms, kurtas, sarees, jewellery..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-zinc-50 hover:bg-white transition-colors"
              />
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
              <button
                type="submit"
                className="absolute right-1.5 px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-full hover:bg-emerald-700 transition"
              >
                Search
              </button>
            </form>

            {/* Actions: Wishlist, Cart, User */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Wishlist Link */}
              <Link
                href="/account/wishlist"
                className="relative p-2 text-zinc-700 hover:text-emerald-600 rounded-full hover:bg-zinc-100 transition"
                aria-label="Wishlist"
              >
                <Heart className="w-6 h-6" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart Drawer Trigger */}
              <button
                type="button"
                onClick={openCartDrawer}
                className="relative p-2 text-zinc-700 hover:text-emerald-600 rounded-full hover:bg-zinc-100 transition"
                aria-label="Shopping Cart"
              >
                <ShoppingBag className="w-6 h-6" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </button>

              {/* Customer Account Menu */}
              {user ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="flex items-center gap-1.5 p-1.5 rounded-full text-zinc-700 hover:bg-zinc-100 text-sm font-medium transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      {user.firstName[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden xl:inline text-xs text-zinc-800 max-w-[100px] truncate">
                      {user.firstName}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                  </button>

                  {isUserDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-xl border border-zinc-100 py-1.5 z-50 text-sm">
                      <div className="px-4 py-2 border-b border-zinc-100">
                        <p className="font-semibold text-zinc-900 truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                      </div>

                      <Link
                        href="/account/orders"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-zinc-700 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <Package className="w-4 h-4" /> My Orders
                      </Link>

                      <Link
                        href="/account/addresses"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-zinc-700 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <MapPin className="w-4 h-4" /> Address Book
                      </Link>

                      <Link
                        href="/account/profile"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-zinc-700 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <UserIcon className="w-4 h-4" /> Account Profile
                      </Link>

                      <div className="border-t border-zinc-100 mt-1 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            logout();
                          }}
                          className="flex items-center gap-2 w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-50 text-sm font-medium"
                        >
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-sm font-medium transition"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>

          {/* Category Navigation Bar (Desktop) */}
          <nav className="hidden lg:flex items-center gap-8 py-2.5 border-t border-zinc-100 text-sm font-medium text-zinc-600 overflow-x-auto">
            <Link href="/products" className="hover:text-emerald-600 transition flex-shrink-0">
              All Products
            </Link>
            <Link
              href="/products?category=ethnic-wear"
              className="hover:text-emerald-600 transition flex-shrink-0"
            >
              Ethnic Wear
            </Link>
            <Link
              href="/products?category=sarees"
              className="hover:text-emerald-600 transition flex-shrink-0"
            >
              Sarees & Silks
            </Link>
            <Link
              href="/products?category=handloom-fabrics"
              className="hover:text-emerald-600 transition flex-shrink-0"
            >
              Handloom Fabrics
            </Link>
            <Link
              href="/products?category=mens-kurtas"
              className="hover:text-emerald-600 transition flex-shrink-0"
            >
              Men&apos;s Kurtas
            </Link>
            <Link
              href="/products?category=jewellery"
              className="hover:text-emerald-600 transition flex-shrink-0"
            >
              Jewellery & Crafts
            </Link>
            <Link
              href="/products?category=home-decor"
              className="hover:text-emerald-600 transition flex-shrink-0"
            >
              Home & Living
            </Link>
          </nav>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-zinc-200 bg-white px-4 pt-3 pb-6 space-y-4">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg text-sm bg-zinc-50"
              />
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
            </form>

            <div className="flex flex-col space-y-2 text-sm font-medium text-zinc-700">
              <Link
                href="/products"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1.5 hover:text-emerald-600"
              >
                All Products
              </Link>
              <Link
                href="/products?category=ethnic-wear"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1.5 hover:text-emerald-600"
              >
                Ethnic Wear
              </Link>
              <Link
                href="/products?category=sarees"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1.5 hover:text-emerald-600"
              >
                Sarees & Silks
              </Link>
              <Link
                href="/products?category=handloom-fabrics"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1.5 hover:text-emerald-600"
              >
                Handloom Fabrics
              </Link>
              <Link
                href="/products?category=mens-kurtas"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1.5 hover:text-emerald-600"
              >
                Men&apos;s Kurtas
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
