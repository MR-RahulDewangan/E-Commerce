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
    <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-xs space-y-5">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Set New Password</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Enter your new password to regain access to your account.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-emerald-700 text-white rounded font-bold hover:bg-emerald-800"
          >
            Go to Store & Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {!tokenParam && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Reset Token
              </label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste token from email"
                className="w-full p-2 text-xs border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              New Password (min 8 characters)
            </label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
              <Lock className="w-4 h-4 text-zinc-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
              <Lock className="w-4 h-4 text-zinc-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />} Update Password
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-6">
      <Link
        href="/"
        className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 flex items-center gap-1"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Store
      </Link>

      <Suspense fallback={<div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" /></div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
