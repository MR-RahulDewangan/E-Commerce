'use client';

import React, { useState, useEffect } from 'react';
import { Store, ShieldCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface SellerProfileData {
  id: string;
  storeName: string;
  storeSlug: string;
  description: string | null;
  gstin: string | null;
  pan: string | null;
  bankAccount: string | null;
  bankIfsc: string | null;
  commissionRate: string | number;
  isVerified: boolean;
  user: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export default function SellerProfilePage() {
  const [profile, setProfile] = useState<SellerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/v1/seller/profile');
        const json = await res.json();
        if (json.success && json.data) {
          setProfile(json.data);
          setStoreName(json.data.storeName || '');
          setDescription(json.data.description || '');
          setGstin(json.data.gstin || '');
          setPan(json.data.pan || '');
          setBankAccount(json.data.bankAccount || '');
          setBankIfsc(json.data.bankIfsc || '');
        }
      } catch (e) {
        console.error('Failed to load seller profile', e);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    setSaving(true);

    try {
      const res = await fetch('/api/v1/seller/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName,
          description,
          gstin: gstin.trim() || null,
          pan: pan.trim().toUpperCase() || null,
          bankAccount: bankAccount.trim() || null,
          bankIfsc: bankIfsc.trim().toUpperCase() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to update store settings');
      }

      setSuccessMsg('Store profile and merchant compliance details saved successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
        <p className="text-sm">Loading seller profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Store Profile & Settings</h1>
        <p className="text-sm text-zinc-500">
          Manage your merchant identity, compliance information, and settlement bank credentials.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Store Identity */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-900">Merchant Information</h2>
            {profile?.isVerified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified Merchant
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                Store Name *
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                Storefront Slug
              </label>
              <input
                type="text"
                disabled
                value={profile?.storeSlug || ''}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 text-sm font-mono cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
              Store Bio / Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell buyers about your artisanal tradition, brand origin, and authenticity guarantee..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-1">
              <span className="text-zinc-500 font-medium">Platform Commission</span>
              <p className="text-lg font-bold text-zinc-900">
                {Number(profile?.commissionRate || 10)}%
              </p>
              <p className="text-zinc-400">Fixed rate applied to net realized orders.</p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-1">
              <span className="text-zinc-500 font-medium">Primary Contact User</span>
              <p className="text-base font-bold text-zinc-900">
                {profile?.user.firstName} {profile?.user.lastName}
              </p>
              <p className="text-zinc-500 truncate">{profile?.user.email}</p>
            </div>
          </div>
        </div>

        {/* Indian Compliance & Bank Settlement */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-zinc-900">Tax Compliance & Settlement Account</h2>
          <p className="text-xs text-zinc-500">
            Required for statutory GST invoice issuance and weekly merchant payouts.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                GSTIN (15 Digits)
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="01ABCDE1234F1Z5"
                maxLength={15}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 font-mono text-sm uppercase"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                PAN (10 Characters)
              </label>
              <input
                type="text"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                maxLength={10}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 font-mono text-sm uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                Settlement Bank Account Number
              </label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="9876543210123"
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 font-mono text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                Bank IFSC Code (11 Digits)
              </label>
              <input
                type="text"
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                placeholder="SBIN0001234"
                maxLength={11}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 font-mono text-sm uppercase"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...
              </>
            ) : (
              'Save Store Settings'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
