'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      setIsLoading(false);

      if (!res.ok) {
        setErrorMessage(json.error?.message || 'Failed to submit request.');
      } else {
        setSuccessMessage(json.data.message);
        if (json.data.resetToken) {
          setResetToken(json.data.resetToken);
        }
      }
    } catch {
      setIsLoading(false);
      setErrorMessage('Network error.');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 sm:py-24 space-y-6">
      <Link
        href="/"
        className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-1.5 font-medium transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Return to Storefront
      </Link>

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
            Forgot Your Password?
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Enter your registered email address and we will issue a 15-minute single-use secure reset link.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-700 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-stone-50 border border-stone-200 text-foreground text-xs rounded-xs space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-champagne-dark flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
            {resetToken && (
              <div className="pt-2 border-t border-border">
                <p className="font-semibold text-foreground mb-2 text-[11px] uppercase tracking-wider">
                  Development Simulator Link:
                </p>
                <Link
                  href={`/auth/reset-password?token=${encodeURIComponent(resetToken)}`}
                  className="inline-block px-4 py-2 bg-primary hover:bg-charcoal text-primary-foreground text-xs uppercase tracking-widest font-medium transition rounded-xs"
                >
                  Set New Password Now
                </Link>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              Email Address *
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.in"
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-background border border-border rounded-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground transition"
              />
              <Mail className="w-4 h-4 text-muted-foreground absolute left-2.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-primary hover:bg-charcoal disabled:bg-stone-400 text-primary-foreground text-xs uppercase tracking-widest font-medium transition rounded-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Send Reset Instructions</span>
          </button>
        </form>
      </div>
    </div>
  );
}

