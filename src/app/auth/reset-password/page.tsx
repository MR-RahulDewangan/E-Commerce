'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Lock, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenParam);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const json = await res.json();
      setIsLoading(false);

      if (!res.ok) {
        setErrorMessage(json.error?.message || 'Failed to reset password.');
      } else {
        setSuccessMessage(json.data.message);
      }
    } catch {
      setIsLoading(false);
      setErrorMessage('Network error.');
    }
  };

  return (
    <div className="bg-card p-8 sm:p-10 rounded-xs border border-border shadow-xs space-y-6 text-card-foreground">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="font-serif text-xl font-light tracking-widest text-foreground uppercase">
            BharatStore
          </span>
          <span className="text-[10px] tracking-widest uppercase font-serif text-champagne-dark border-l border-border pl-2">
            Maison
          </span>
        </div>
        <h1 className="font-serif text-2xl font-normal text-foreground tracking-tight pt-1">
          Set New Password
        </h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Create a secure password with at least 8 characters to restore access to your account.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-700 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage ? (
        <div className="p-4 bg-stone-50 border border-stone-200 text-foreground text-xs rounded-xs space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-champagne-dark flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-primary hover:bg-charcoal text-primary-foreground text-xs uppercase tracking-widest font-medium transition rounded-xs"
          >
            Go to Store & Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {!tokenParam && (
            <div className="space-y-1.5">
              <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Reset Token *
              </label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste token from email"
                className="w-full p-2.5 text-xs bg-background border border-border rounded-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground font-mono transition"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              New Password (min 8 characters) *
            </label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-background border border-border rounded-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground transition"
              />
              <Lock className="w-4 h-4 text-muted-foreground absolute left-2.5 top-3" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              Confirm Password *
            </label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-background border border-border rounded-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground transition"
              />
              <Lock className="w-4 h-4 text-muted-foreground absolute left-2.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-primary hover:bg-charcoal disabled:bg-stone-400 text-primary-foreground text-xs uppercase tracking-widest font-medium transition rounded-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Update Password</span>
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-16 sm:py-24 space-y-6">
      <Link
        href="/"
        className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-1.5 font-medium transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Return to Storefront
      </Link>

      <Suspense
        fallback={
          <div className="text-center py-12">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-foreground" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}

