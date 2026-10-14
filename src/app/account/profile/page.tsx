'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, Mail, ShieldCheck, Phone, Sparkles } from 'lucide-react';
import { AccountNav } from '@/components/account/AccountNav';

export default function ProfilePage() {
  const { user, openAuthModal, logout } = useAuth();

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-full bg-stone-100 border border-border text-muted-foreground flex items-center justify-center">
          <User className="w-7 h-7 stroke-[1.25]" />
        </div>
        <h2 className="font-serif text-2xl font-normal text-foreground">Sign In Required</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Please sign in to access your personal profile and account dossier.
        </p>
        <button
          type="button"
          onClick={() => openAuthModal('login')}
          className="inline-block px-6 py-3 bg-primary hover:bg-charcoal text-primary-foreground text-xs uppercase tracking-widest font-medium transition shadow-xs cursor-pointer"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      <AccountNav />

      <div className="bg-card p-6 sm:p-8 rounded-xs border border-border shadow-xs space-y-8 text-card-foreground">
        {/* Profile Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-stone-100 border border-border text-foreground flex items-center justify-center font-serif font-light text-2xl">
              {user.firstName[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-normal text-foreground">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-block text-[10px] uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-2xs bg-stone-100 border border-stone-200 text-foreground">
                  Role: {user.role}
                </span>
                <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-champagne-dark" /> Verified Patron
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Identity & Security Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
          <div className="p-5 bg-stone-50/70 rounded-xs border border-border space-y-2">
            <span className="text-muted-foreground flex items-center gap-2 text-[11px] uppercase tracking-wider font-medium">
              <Mail className="w-3.5 h-3.5 text-champagne-dark" /> Registered Email
            </span>
            <p className="font-medium text-foreground text-sm">{user.email}</p>
            <p className="text-[11px] text-muted-foreground">Used for tax invoices & dispatch tracking.</p>
          </div>

          <div className="p-5 bg-stone-50/70 rounded-xs border border-border space-y-2">
            <span className="text-muted-foreground flex items-center gap-2 text-[11px] uppercase tracking-wider font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-champagne-dark" /> Account Tier
            </span>
            <p className="font-medium text-foreground text-sm capitalize">
              {user.role.toLowerCase()} Patron
            </p>
            <p className="text-[11px] text-muted-foreground">Authorized for personalized shopping and express dispatch.</p>
          </div>

          <div className="p-5 bg-stone-50/70 rounded-xs border border-border space-y-2 sm:col-span-2">
            <span className="text-muted-foreground flex items-center gap-2 text-[11px] uppercase tracking-wider font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-champagne-dark" /> Authentication & Session Security
            </span>
            <p className="font-medium text-foreground">
              14-Day Rolling HTTP-Only Secure Cookie Protection Active
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Sessions are cryptographically protected with SHA-256 HMAC tokens, encrypted edge transmission (TLS 1.3), and server-authoritative role verification on every mutation.
            </p>
          </div>
        </div>

        {/* Sign Out CTA */}
        <div className="pt-2 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={logout}
            className="px-5 py-2.5 border border-border text-muted-foreground hover:text-rose-700 hover:border-rose-300 text-xs uppercase tracking-wider font-medium rounded-xs transition cursor-pointer"
          >
            Sign Out of Maison Account
          </button>
        </div>
      </div>
    </div>
  );
}

