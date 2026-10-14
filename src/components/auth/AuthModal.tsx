'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { X, Lock, Mail, User, Phone, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, authModalTab, openAuthModal, login, register } =
    useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    if (isAuthModalOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    if (authModalTab === 'login') {
      const res = await login({ email, password });
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Invalid email or password.');
      }
    } else {
      if (!firstName.trim() || !lastName.trim()) {
        setIsLoading(false);
        setErrorMessage('First and last name are required.');
        return;
      }
      const res = await register({
        email,
        password,
        firstName,
        lastName,
        phoneNumber: phoneNumber.trim() || undefined,
      });
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Registration failed.');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-charcoal/70 backdrop-blur-xs transition-opacity duration-300"
        onClick={closeAuthModal}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md bg-card rounded-xs shadow-2xl border border-border overflow-hidden z-10 text-card-foreground animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-border bg-stone-50/50 flex-shrink-0">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                openAuthModal('login');
              }}
              className={`pb-1 text-xs uppercase tracking-widest font-medium border-b-2 transition ${
                authModalTab === 'login'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                openAuthModal('register');
              }}
              className={`pb-1 text-xs uppercase tracking-widest font-medium border-b-2 transition ${
                authModalTab === 'register'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Create Account
            </button>
          </div>

          <button
            type="button"
            onClick={closeAuthModal}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-4 overflow-y-auto flex-1">
          <div className="space-y-1">
            <h2 id="auth-modal-title" className="font-serif text-2xl font-normal text-foreground">
              {authModalTab === 'login' ? 'Welcome Back' : 'Create an Account'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {authModalTab === 'login'
                ? 'Sign in to access your curated wishlist, order history, and saved addresses.'
                : 'Join BharatStore Maison for exclusive artisan drops and bespoke order tracking.'}
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xs text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-700 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {authModalTab === 'register' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                  First Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Pooja"
                    className="w-full pl-8 pr-3 py-2.5 text-xs bg-background border border-border rounded-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition text-foreground"
                  />
                  <User className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                  Last Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Sharma"
                    className="w-full pl-8 pr-3 py-2.5 text-xs bg-background border border-border rounded-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition text-foreground"
                  />
                  <User className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-3" />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
              Email Address *
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.in"
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-background border border-border rounded-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition text-foreground"
              />
              <Mail className="w-4 h-4 text-muted-foreground absolute left-2.5 top-3" />
            </div>
          </div>

          {authModalTab === 'register' && (
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-background border border-border rounded-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition text-foreground"
                />
                <Phone className="w-4 h-4 text-muted-foreground absolute left-2.5 top-3" />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Password *
              </label>
              {authModalTab === 'login' && (
                <Link
                  href="/auth/forgot-password"
                  onClick={closeAuthModal}
                  className="text-xs text-muted-foreground hover:text-foreground transition underline underline-offset-2"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-9 py-2.5 text-xs bg-background border border-border rounded-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition text-foreground"
              />
              <Lock className="w-4 h-4 text-muted-foreground absolute left-2.5 top-3" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 p-1 text-muted-foreground hover:text-foreground"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-primary hover:bg-charcoal disabled:bg-stone-400 text-primary-foreground text-xs uppercase tracking-widest font-medium transition shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{authModalTab === 'login' ? 'Sign In' : 'Create Account'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
