'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Store, Shield, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

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

      // Successful login will trigger the useEffect redirect above once user state updates
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
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-zinc-50">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-zinc-200 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center font-bold text-white text-xl mx-auto shadow-md">
            E
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
            Sign In to Your Account
          </h1>
          <p className="text-xs text-zinc-500">
            Access your customer orders, merchant seller hub, or administrative dashboard.
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. seller.kashmir@ecommerce.example.in"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                Password *
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Forgot?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Authenticating...
              </>
            ) : (
              <>
                Sign In <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Fill Buttons for Testing */}
        <div className="pt-2 border-t border-zinc-100 space-y-2">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block text-center">
            Quick Fill Demo Credentials
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillSellerCredentials('seller.kashmir@ecommerce.example.in')}
              className="p-2 rounded-lg border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 text-[11px] text-indigo-700 font-semibold text-left transition flex items-center gap-1.5"
            >
              <Store className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="truncate">Seller 1 (Kashmir)</span>
            </button>
            <button
              type="button"
              onClick={() => fillSellerCredentials('seller.jaipur@ecommerce.example.in')}
              className="p-2 rounded-lg border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 text-[11px] text-indigo-700 font-semibold text-left transition flex items-center gap-1.5"
            >
              <Store className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="truncate">Seller 2 (Jaipur)</span>
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-zinc-500 pt-2">
          Don&apos;t have an account?{' '}
          <Link href="/" className="text-indigo-600 font-semibold hover:underline">
            Register on Storefront
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
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
