'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Store,
  Shield,
  ArrowRight,
} from 'lucide-react';

export function Header() {
  const router = useRouter();
  const { user, openAuthModal, logout } = useAuth();
  const { itemCount, openCartDrawer } = useCart();
  const { count: wishlistCount } = useWishlist();

  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsUserDropdownOpen(false);
        setIsMobileMenuOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Top Promotional Announcement Bar */}
      <aside
        aria-label="Promotional Announcement"
        className="bg-luxury-obsidian text-luxury-ivory text-[10px] sm:text-xs py-1.5 sm:py-2 px-3 sm:px-4 text-center tracking-wider sm:tracking-widest uppercase font-sans border-b border-stone-800"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          <span className="font-medium">Complimentary Shipping on Orders ₹999+</span>
          <span className="hidden sm:inline text-luxury-champagne">•</span>
          <span className="hidden sm:inline text-stone-300">Certified Master Artisan Handlooms</span>
          <span className="hidden md:inline text-luxury-champagne">•</span>
          <span className="hidden md:inline text-stone-300">Prices Inclusive of 18% GST</span>
        </div>
      </aside>

      {/* Main Luxury Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Menu className="w-5 h-5" aria-hidden="true" />
              )}
            </button>

            {/* Brand Logo / Wordmark */}
            <Link
              href="/"
              className="flex flex-col items-start flex-shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring p-1 rounded-xs"
            >
              <span className="font-serif text-lg sm:text-2xl font-medium tracking-[0.14em] sm:tracking-[0.18em] uppercase text-foreground group-hover:text-luxury-charcoal transition-colors">
                BharatStore
              </span>
              <span className="text-[8px] sm:text-[9px] tracking-[0.2em] sm:tracking-[0.28em] uppercase text-muted-foreground font-sans font-medium -mt-0.5 sm:-mt-1 group-hover:text-luxury-champagne transition-colors">
                Maison &bull; Handcrafted
              </span>
            </Link>

            {/* Search Bar (Desktop) */}
            <form
              onSubmit={handleSearch}
              role="search"
              className="hidden md:flex flex-1 max-w-sm lg:max-w-md relative items-center mx-4"
            >
              <label htmlFor="desktop-search-input" className="sr-only">
                Search products
              </label>
              <Search
                className="w-4 h-4 text-muted-foreground absolute left-3.5 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="desktop-search-input"
                type="search"
                placeholder="Search handlooms, sarees, kurtas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-20 py-2 bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground tracking-wide focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring transition-all"
              />
              <button
                type="submit"
                className="absolute right-1 px-2.5 py-1 bg-primary text-primary-foreground text-[10px] uppercase tracking-widest font-medium hover:bg-primary-hover transition cursor-pointer"
              >
                Search
              </button>
            </form>

            {/* Actions: Wishlist, Cart, Account */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Wishlist Link */}
              <Link
                href="/account/wishlist"
                className="relative p-2 sm:p-2.5 text-foreground hover:text-luxury-champagne hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Wishlist, ${wishlistCount} items saved`}
              >
                <Heart className="w-5 h-5" aria-hidden="true" />
                {wishlistCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 bg-luxury-obsidian text-luxury-ivory border border-luxury-champagne text-[10px] font-medium rounded-full min-w-[17px] h-[17px] px-1 flex items-center justify-center shadow-xs">
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart Drawer Trigger */}
              <button
                type="button"
                onClick={openCartDrawer}
                className="relative p-2 sm:p-2.5 text-foreground hover:text-luxury-champagne hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                aria-label={`Shopping bag, ${itemCount} items`}
              >
                <ShoppingBag className="w-5 h-5" aria-hidden="true" />
                {itemCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 bg-luxury-obsidian text-luxury-ivory border border-luxury-champagne text-[10px] font-medium rounded-full min-w-[17px] h-[17px] px-1 flex items-center justify-center shadow-xs">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </button>

              {/* Customer Account Menu */}
              {user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="flex items-center gap-1.5 p-1.5 rounded-xs text-foreground hover:bg-muted transition text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                    aria-expanded={isUserDropdownOpen}
                    aria-haspopup="true"
                    aria-label="User account menu"
                  >
                    <div className="w-7 h-7 bg-luxury-stone text-luxury-obsidian border border-border flex items-center justify-center font-serif text-xs font-semibold">
                      {user.firstName[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden xl:inline text-xs tracking-editorial uppercase max-w-[100px] truncate">
                      {user.firstName}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                  </button>

                  {/* Dropdown Menu */}
                  {isUserDropdownOpen && (
                    <div
                      role="menu"
                      aria-orientation="vertical"
                      className="absolute right-0 mt-2 w-56 bg-card text-card-foreground border border-border shadow-xl py-2 z-50 text-xs animate-in fade-in-50 duration-150"
                    >
                      <div className="px-4 py-2 border-b border-border/80">
                        <p className="font-medium text-foreground truncate font-serif text-sm">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                      </div>

                      <Link
                        href="/account/orders"
                        role="menuitem"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-foreground hover:bg-muted transition-colors"
                      >
                        <Package className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                        <span>My Orders</span>
                      </Link>

                      <Link
                        href="/account/addresses"
                        role="menuitem"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-foreground hover:bg-muted transition-colors"
                      >
                        <MapPin className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                        <span>Delivery Addresses</span>
                      </Link>

                      <Link
                        href="/account/profile"
                        role="menuitem"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-foreground hover:bg-muted transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                        <span>Account Profile</span>
                      </Link>

                      {(user.role === 'SELLER' || user.role === 'ADMIN') && (
                        <Link
                          href="/seller"
                          role="menuitem"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-amber-900 bg-amber-50/60 hover:bg-amber-100/60 font-medium transition-colors"
                        >
                          <Store className="w-4 h-4 text-amber-800" aria-hidden="true" />
                          <span>Seller Portal</span>
                        </Link>
                      )}

                      {user.role === 'ADMIN' && (
                        <Link
                          href="/admin"
                          role="menuitem"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-stone-900 bg-stone-100 hover:bg-stone-200 font-medium transition-colors"
                        >
                          <Shield className="w-4 h-4 text-stone-800" aria-hidden="true" />
                          <span>Admin Backoffice</span>
                        </Link>
                      )}

                      <div className="border-t border-border/80 mt-1 pt-1">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            logout();
                          }}
                          className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-destructive hover:bg-red-50 text-xs font-medium cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" aria-hidden="true" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 border border-foreground text-foreground hover:bg-foreground hover:text-background text-[11px] font-sans font-medium uppercase tracking-editorial transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Sign In"
                >
                  <UserIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}
            </div>
          </div>

          {/* Desktop Category Navigation Bar */}
          <nav
            aria-label="Product categories"
            className="hidden lg:flex items-center justify-center gap-8 py-3 border-t border-border/70 text-xs uppercase tracking-editorial font-medium text-muted-foreground overflow-x-auto"
          >
            <Link
              href="/products"
              className="hover:text-foreground transition-colors flex-shrink-0 relative py-1 hover:border-b hover:border-foreground"
            >
              All Collections
            </Link>
            <Link
              href="/products?category=artisanal-handlooms"
              className="hover:text-foreground transition-colors flex-shrink-0 relative py-1 hover:border-b hover:border-foreground"
            >
              Handlooms & Silks
            </Link>
            <Link
              href="/products?category=pashmina-shawls"
              className="hover:text-foreground transition-colors flex-shrink-0 relative py-1 hover:border-b hover:border-foreground"
            >
              Eco Pashmina
            </Link>
            <Link
              href="/products?category=handcrafted-jewellery"
              className="hover:text-foreground transition-colors flex-shrink-0 relative py-1 hover:border-b hover:border-foreground"
            >
              Heritage Jewellery
            </Link>
            <Link
              href="/products?category=organic-khadi"
              className="hover:text-foreground transition-colors flex-shrink-0 relative py-1 hover:border-b hover:border-foreground"
            >
              Organic Khadi
            </Link>
            <Link
              href="/products?category=sustainable-decor"
              className="hover:text-foreground transition-colors flex-shrink-0 relative py-1 hover:border-b hover:border-foreground"
            >
              Sustainable Living
            </Link>
            <Link
              href="/products?category=botanical-wellness"
              className="hover:text-foreground transition-colors flex-shrink-0 relative py-1 hover:border-b hover:border-foreground"
            >
              Botanical Wellness
            </Link>
          </nav>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div
            id="mobile-navigation-drawer"
            ref={mobileMenuRef}
            className="lg:hidden border-t border-border bg-background px-4 pt-4 pb-8 space-y-5 animate-in slide-in-from-top-2 duration-200 max-h-[calc(100vh-5rem)] overflow-y-auto"
          >
            {/* Mobile Search Form */}
            <form onSubmit={handleSearch} role="search" className="relative">
              <label htmlFor="mobile-search-input" className="sr-only">
                Search products
              </label>
              <Search
                className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="mobile-search-input"
                type="search"
                placeholder="Search handlooms, kurtas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-12 py-2.5 bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring"
              />
              <button
                type="submit"
                className="absolute right-2 top-2 p-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Submit search"
              >
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>

            {/* Mobile Categories Links */}
            <div className="flex flex-col divide-y divide-border/60 text-xs uppercase tracking-editorial font-medium text-foreground">
              <Link
                href="/products"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-3 hover:text-luxury-champagne transition-colors"
              >
                All Collections
              </Link>
              <Link
                href="/products?category=artisanal-handlooms"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-3 hover:text-luxury-champagne transition-colors"
              >
                Artisanal Handlooms & Silks
              </Link>
              <Link
                href="/products?category=pashmina-shawls"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-3 hover:text-luxury-champagne transition-colors"
              >
                Eco Cashmere & Pashmina
              </Link>
              <Link
                href="/products?category=handcrafted-jewellery"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-3 hover:text-luxury-champagne transition-colors"
              >
                Heritage Handcrafted Jewellery
              </Link>
              <Link
                href="/products?category=organic-khadi"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-3 hover:text-luxury-champagne transition-colors"
              >
                Organic Khadi & Ahimsa Cotton
              </Link>
              <Link
                href="/products?category=sustainable-decor"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-3 hover:text-luxury-champagne transition-colors"
              >
                Sustainable Living & Decor
              </Link>
              <Link
                href="/products?category=botanical-wellness"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-3 hover:text-luxury-champagne transition-colors"
              >
                Botanical Wellness & Aromas
              </Link>
            </div>

            {/* Mobile Account Quick Navigation */}
            <div className="pt-2 border-t border-border">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-1 text-xs text-muted-foreground">
                    <span>Signed in as <strong className="text-foreground">{user.firstName}</strong></span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        logout();
                      }}
                      className="text-destructive font-medium uppercase tracking-wider text-[11px] cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <Link
                      href="/account/orders"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-2.5 bg-card border border-border text-center font-medium"
                    >
                      My Orders
                    </Link>
                    <Link
                      href="/account/addresses"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-2.5 bg-card border border-border text-center font-medium"
                    >
                      Addresses
                    </Link>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openAuthModal('login');
                  }}
                  className="w-full py-3 bg-primary text-primary-foreground text-xs uppercase tracking-widest font-medium text-center cursor-pointer hover:bg-primary-hover transition"
                >
                  Sign In / Register
                </button>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
