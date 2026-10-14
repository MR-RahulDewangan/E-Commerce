'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Store, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '';

  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (callbackUrl) {
        router.push(callbackUrl);
      } else if (user.role === 'SELLER') {
        router.push('/seller');
      } else if (user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/account/profile');
      }
    }
  }, [user, callbackUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await login({ email: email.trim(), password });
      if (!res.success) {
        setErrorMessage(res.error || 'Invalid email or password.');
        setLoading(false);
        return;
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error during login.');
      setLoading(false);
    }
  };

  const fillSellerCredentials = (sellerEmail: string) => {
    setEmail(sellerEmail);
    setPassword('SellerSecure2026!');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 sm:py-24 bg-background">
      <div className="w-full max-w-md bg-card rounded-xs p-8 sm:p-10 border border-border shadow-xs space-y-6 text-card-foreground">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="font-serif text-2xl font-light tracking-widest text-foreground uppercase">
              BharatStore
            </span>
            <span className="text-[10px] tracking-widest uppercase font-serif text-champagne-dark border-l border-border pl-2">
              Maison
            </span>
          </div>
          <h1 className="font-serif text-2xl font-normal text-foreground tracking-tight pt-1">
            Sign In to Your Account
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Access your customer dossier, artisan seller portal, or administrative backoffice.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xs bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-700" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. customer@ecommerce.example.in"
              className="w-full px-3.5 py-2.5 rounded-xs bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs transition"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Password *
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-muted-foreground hover:text-foreground transition underline underline-offset-2"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xs bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-primary text-primary-foreground rounded-xs text-xs uppercase tracking-widest font-medium hover:bg-charcoal transition flex items-center justify-center gap-2 disabled:bg-stone-400 shadow-xs cursor-pointer pt-3"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Authenticating...
              </>
            ) : (
              <>
                Sign In <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Fill Buttons for Testing */}
        <div className="pt-4 border-t border-border space-y-2.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest block text-center">
            Demo Merchant Credentials
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillSellerCredentials('seller.kashmir@ecommerce.example.in')}
              className="p-2.5 rounded-xs border border-border bg-stone-50/70 hover:bg-stone-100 text-[11px] text-foreground font-medium text-left transition flex items-center gap-1.5"
            >
              <Store className="w-3.5 h-3.5 text-champagne-dark shrink-0" />
              <span className="truncate">Seller 1 (Kashmir)</span>
            </button>
            <button
              type="button"
              onClick={() => fillSellerCredentials('seller.jaipur@ecommerce.example.in')}
              className="p-2.5 rounded-xs border border-border bg-stone-50/70 hover:bg-stone-100 text-[11px] text-foreground font-medium text-left transition flex items-center gap-1.5"
            >
              <Store className="w-3.5 h-3.5 text-champagne-dark shrink-0" />
              <span className="truncate">Seller 2 (Jaipur)</span>
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground pt-2">
          Don&apos;t have an account?{' '}
          <Link href="/" className="text-foreground font-medium hover:underline underline-offset-2">
            Return to Storefront
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-foreground" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}

