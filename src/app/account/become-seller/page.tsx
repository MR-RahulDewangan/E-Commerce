'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Store,
  FileText,
  CreditCard,
  Building,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Sparkles,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import {
  indianGstinRegex,
  indianPanRegex,
  indianIfscRegex,
} from '@/modules/auth/validation';

export default function BecomeSellerPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [existingApplication, setExistingApplication] = useState<any | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    storeName: '',
    storeDescription: '',
    gstin: '',
    pan: '',
    bankAccount: '',
    bankIfsc: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Check existing application status
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/v1/seller/apply', { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          if (json.data?.application || json.application) {
            setExistingApplication(json.data?.application || json.application);
          }
        }
      } catch (err) {
        console.error('Failed to check application status:', err);
      } finally {
        setIsCheckingStatus(false);
      }
    };
    checkStatus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);
    setSuccessMessage(null);

    const errors: Record<string, string> = {};
    if (!formData.storeName.trim()) errors.storeName = 'Store name is required.';
    if (!formData.gstin.trim()) errors.gstin = 'GSTIN is required.';
    else if (!indianGstinRegex.test(formData.gstin.toUpperCase())) {
      errors.gstin = 'Invalid GSTIN format (15 characters required).';
    }
    if (!formData.pan.trim()) errors.pan = 'PAN is required.';
    else if (!indianPanRegex.test(formData.pan.toUpperCase())) {
      errors.pan = 'Invalid PAN format (10 characters required).';
    }
    if (!formData.bankAccount.trim()) errors.bankAccount = 'Bank account number is required.';
    if (!formData.bankIfsc.trim()) errors.bankIfsc = 'Bank IFSC code is required.';
    else if (!indianIfscRegex.test(formData.bankIfsc.toUpperCase())) {
      errors.bankIfsc = 'Invalid IFSC format (11 characters required).';
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setGlobalError('Please fix the errors marked below.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/seller/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          storeName: formData.storeName.trim(),
          storeDescription: formData.storeDescription.trim() || undefined,
          gstin: formData.gstin.trim().toUpperCase(),
          pan: formData.pan.trim().toUpperCase(),
          bankAccount: formData.bankAccount.trim(),
          bankIfsc: formData.bankIfsc.trim().toUpperCase(),
        }),
      });

      const json = await res.json();
      setIsLoading(false);

      if (!res.ok) {
        setGlobalError(json.error?.message || 'Failed to submit seller application.');
        return;
      }

      setSuccessMessage('Application submitted successfully!');
      setExistingApplication(json.data?.application || json.application);
    } catch (err) {
      setIsLoading(false);
      console.error('Seller application error:', err);
      setGlobalError('Network error. Please try again later.');
    }
  };

  if (isCheckingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Back Link */}
        <div>
          <Link
            href="/account/profile"
            className="inline-flex items-center gap-2 text-xs text-stone-600 hover:text-stone-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Account Dossier
          </Link>
        </div>

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-luxury-champagne/10 border border-luxury-champagne/30 rounded-full text-luxury-champagne text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Marketplace Vendor Upgrade</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-stone-900 tracking-tight font-normal">
            Become a Verified Seller on BharatStore
          </h1>
          <p className="text-stone-600 text-sm max-w-xl mx-auto leading-relaxed">
            Submit your official enterprise credentials and statutory documents. Once reviewed and verified by our compliance team, your customer account will be upgraded to a verified merchant store.
          </p>
        </div>

        {/* Existing Application Status Banner */}
        {existingApplication && (
          <div
            className={`p-6 rounded-2xl border shadow-sm space-y-3 ${
              existingApplication.status === 'APPROVED'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : existingApplication.status === 'REJECTED'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-3">
              {existingApplication.status === 'APPROVED' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              ) : existingApplication.status === 'REJECTED' ? (
                <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
              ) : (
                <Clock className="w-6 h-6 text-amber-600 shrink-0" />
              )}
              <div>
                <h2 className="font-serif text-lg font-medium">
                  Application Status: {existingApplication.status}
                </h2>
                <p className="text-xs opacity-90 mt-0.5">
                  {existingApplication.status === 'APPROVED'
                    ? 'Your application has been approved! Your account is now upgraded. Access your seller portal below.'
                    : existingApplication.status === 'REJECTED'
                    ? `Application rejected. Reason: ${existingApplication.rejectionReason || 'Compliance criteria not met.'}`
                    : 'Your seller application is currently under review by our compliance team (typically 2-3 business days).'}
                </p>
              </div>
            </div>

            {existingApplication.status === 'APPROVED' && (
              <div className="pt-2">
                <Link
                  href="/seller"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition shadow-xs"
                >
                  <Store className="w-4 h-4" />
                  Open Seller Control Panel &rarr;
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Global Error/Success Messages */}
        {globalError && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-sm font-medium flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-700 shrink-0" />
            <span>{globalError}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-sm font-medium flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Application Form (Only shown if no application or if rejected) */}
        {(!existingApplication || existingApplication.status === 'REJECTED') && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="border-b border-stone-100 pb-3 flex items-center gap-2">
              <Store className="w-5 h-5 text-stone-700" />
              <h2 className="font-serif text-lg font-medium text-stone-900">Store & Compliance Details</h2>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-600 font-medium mb-1.5">
                Store / Atelier Name *
              </label>
              <input
                type="text"
                name="storeName"
                required
                value={formData.storeName}
                onChange={handleChange}
                placeholder="e.g. Jaipur Heritage Handlooms"
                className={`w-full px-3.5 py-2.5 text-xs bg-stone-50 border rounded-lg focus:outline-none focus:ring-1 transition text-stone-900 ${
                  fieldErrors.storeName ? 'border-rose-400 bg-rose-50/30' : 'border-stone-200 focus:ring-primary'
                }`}
              />
              {fieldErrors.storeName && <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.storeName}</p>}
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-600 font-medium mb-1.5">
                Store Bio & Craft Story
              </label>
              <textarea
                name="storeDescription"
                rows={3}
                value={formData.storeDescription}
                onChange={handleChange}
                placeholder="Describe your artisanal craft or textile heritage..."
                className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-stone-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-600 font-medium mb-1.5">
                  GSTIN (15 characters) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="gstin"
                    required
                    maxLength={15}
                    value={formData.gstin}
                    onChange={handleChange}
                    placeholder="29ABCDE1234F1Z5"
                    className={`w-full pl-9 pr-3.5 py-2.5 text-xs bg-stone-50 border rounded-lg font-mono uppercase text-stone-900 ${
                      fieldErrors.gstin ? 'border-rose-400 bg-rose-50/30' : 'border-stone-200 focus:ring-primary'
                    }`}
                  />
                  <FileText className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                </div>
                {fieldErrors.gstin && <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.gstin}</p>}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-600 font-medium mb-1.5">
                  PAN (10 characters) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="pan"
                    required
                    maxLength={10}
                    value={formData.pan}
                    onChange={handleChange}
                    placeholder="ABCDE1234F"
                    className={`w-full pl-9 pr-3.5 py-2.5 text-xs bg-stone-50 border rounded-lg font-mono uppercase text-stone-900 ${
                      fieldErrors.pan ? 'border-rose-400 bg-rose-50/30' : 'border-stone-200 focus:ring-primary'
                    }`}
                  />
                  <FileText className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                </div>
                {fieldErrors.pan && <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.pan}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-600 font-medium mb-1.5">
                  Bank Account Number *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="bankAccount"
                    required
                    value={formData.bankAccount}
                    onChange={handleChange}
                    placeholder="9876543210123"
                    className={`w-full pl-9 pr-3.5 py-2.5 text-xs bg-stone-50 border rounded-lg font-mono text-stone-900 ${
                      fieldErrors.bankAccount ? 'border-rose-400 bg-rose-50/30' : 'border-stone-200 focus:ring-primary'
                    }`}
                  />
                  <CreditCard className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                </div>
                {fieldErrors.bankAccount && <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.bankAccount}</p>}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-600 font-medium mb-1.5">
                  Bank IFSC Code (11 chars) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="bankIfsc"
                    required
                    maxLength={11}
                    value={formData.bankIfsc}
                    onChange={handleChange}
                    placeholder="SBIN0001234"
                    className={`w-full pl-9 pr-3.5 py-2.5 text-xs bg-stone-50 border rounded-lg font-mono uppercase text-stone-900 ${
                      fieldErrors.bankIfsc ? 'border-rose-400 bg-rose-50/30' : 'border-stone-200 focus:ring-primary'
                    }`}
                  />
                  <Building className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                </div>
                {fieldErrors.bankIfsc && <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.bankIfsc}</p>}
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-stone-900 hover:bg-black disabled:bg-stone-400 text-white text-xs uppercase tracking-widest font-semibold rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Submit Seller Application for Review</span>
              </button>
              <p className="text-[11px] text-stone-500 text-center mt-3">
                By submitting, you certify that all provided GSTIN, PAN, and banking documents are authentic.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}