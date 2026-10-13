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
    <div className="max-w-md mx-auto px-4 py-16 space-y-6">
      <Link
        href="/"
        className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 flex items-center gap-1"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Store
      </Link>

      <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-xs space-y-5">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Forgot Your Password?</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Enter your email and we&apos;ll issue a 15-minute single-use secure reset link.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
            {resetToken && (
              <div className="pt-2 border-t border-emerald-200">
                <p className="font-semibold text-emerald-900 mb-1">Development Demo Token:</p>
                <Link
                  href={`/auth/reset-password?token=${encodeURIComponent(resetToken)}`}
                  className="inline-block px-3 py-1.5 bg-emerald-700 text-white rounded font-bold hover:bg-emerald-800"
                >
                  Click Here to Set New Password
                </Link>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.in"
                className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
              <Mail className="w-4 h-4 text-zinc-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />} Send Reset Link
          </button>
        </form>
      </div>
    </div>
  );
}
