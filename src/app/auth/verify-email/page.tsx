'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { CheckCircle, Loader2, AlertCircle, Mail, ArrowLeft } from 'lucide-react';

function VerifyEmailContent() {
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'verifying' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoRedirect, setAutoRedirect] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setToken(params.get('token') || null);
      setStatus('verifying');
    }
  }, []);

  useEffect(() => {
    if (!token || status !== 'verifying') return;

    async function verifyEmail() {
      try {
        const res = await fetch('/api/v1/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const json = await res.json();

        if (!res.ok) {
          setStatus('error');
          setErrorMessage(json.error?.message || 'Verification failed. The link may have expired or already been used.');
          return;
        }

        setStatus('success');
        setAutoRedirect(true);

        // Auto-redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login?verified=true');
          router.refresh();
        }, 3000);
      } catch (err) {
        console.error('Verification error:', err);
        setStatus('error');
        setErrorMessage('Network error during verification. Please try again.');
      }
    };

    verifyEmail();
  }, [token, router, status]);

  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 p-8 sm:p-10 shadow-sm text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-stone-100 rounded-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <h1 className="text-2xl font-serif font-normal text-foreground mb-3">Verifying your email...</h1>
          <p className="text-stone-500 text-sm">Please wait while we verify your email address.</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 p-8 sm:p-10 shadow-sm text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-emerald-50 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-serif font-normal text-foreground mb-3">Email Verified!</h1>
          <p className="text-stone-500 text-sm mb-6">Your account has been activated. Redirecting to sign in...</p>
          <Link
            href="/login?verified=true"
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-charcoal font-medium underline underline-offset-2"
            onClick={() => router.push('/login?verified=true')}
          >
            <ArrowLeft className="w-4 h-4" />
            Continue to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 p-8 sm:p-10 shadow-sm text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-rose-50 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-rose-600" />
        </div>
        <h1 className="text-2xl font-serif font-normal text-foreground mb-3">Verification Failed</h1>
        <p className="text-stone-500 text-sm mb-6">{errorMessage || 'Unable to verify your email address.'}</p>
        <div className="space-y-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-charcoal transition shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
          <Link
            href="/auth/forgot-password"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-stone-100 text-stone-800 rounded-xl text-sm font-semibold hover:bg-stone-200 transition"
          >
            <Mail className="w-4 h-4" />
            Resend Verification Email
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4 py-12">
          <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 p-8 sm:p-10 shadow-sm text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-stone-100 rounded-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-serif font-normal text-foreground mb-3">Loading...</h1>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}