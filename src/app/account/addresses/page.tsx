'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { MapPin, Plus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SavedAddress {
  id: string;
  recipientName: string;
  phoneNumber: string;
  streetLine1: string;
  streetLine2?: string | null;
  city: string;
  stateProvince: string;
  postalCode: string;
  isDefault: boolean;
}

export default function AddressBookPage() {
  const { user, openAuthModal } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New address form fields
  const [recipientName, setRecipientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [streetLine1, setStreetLine1] = useState('');
  const [streetLine2, setStreetLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateProvince, setStateProvince] = useState('Karnataka');
  const [postalCode, setPostalCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAddresses = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/account/addresses', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setAddresses(json.data.addresses);
      }
    } catch (err) {
      console.error('Failed to fetch addresses:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchAddresses();
    } else {
      setIsLoading(false);
    }
  }, [user, fetchAddresses]);

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!/^[1-9][0-9]{5}$/.test(postalCode.trim())) {
      setErrorMessage('Postal code must be a valid 6-digit Indian PIN code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/account/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          recipientName: recipientName.trim(),
          phoneNumber: phoneNumber.trim(),
          streetLine1: streetLine1.trim(),
          streetLine2: streetLine2.trim() || undefined,
          city: city.trim(),
          stateProvince: stateProvince.trim(),
          postalCode: postalCode.trim(),
          countryCode: 'IN',
        }),
      });

      const json = await res.json();
      setIsSubmitting(false);

      if (!res.ok) {
        setErrorMessage(json.error?.message || 'Failed to add address.');
      } else {
        setSuccessMessage('Delivery address saved successfully!');
        setIsAdding(false);
        // Reset fields
        setRecipientName('');
        setPhoneNumber('');
        setStreetLine1('');
        setStreetLine2('');
        setCity('');
        setPostalCode('');
        await fetchAddresses();
      }
    } catch {
      setIsSubmitting(false);
      setErrorMessage('Network error while saving address.');
    }
  };

  if (!user && !isLoading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <MapPin className="w-12 h-12 mx-auto text-zinc-400" />
        <h2 className="text-xl font-bold text-zinc-900">Sign In Required</h2>
        <p className="text-xs text-zinc-500">Sign in to manage your saved shipping addresses.</p>
        <button
          type="button"
          onClick={() => openAuthModal('login')}
          className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-bold"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
            Saved Delivery Addresses
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Manage your verified Indian shipping addresses.
          </p>
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add New Address
          </button>
        )}
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Add Address Form Accordion */}
      {isAdding && (
        <form
          onSubmit={handleAddAddress}
          className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4"
        >
          <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
            <h2 className="text-sm font-bold text-zinc-900">Add New Shipping Address</h2>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-zinc-500 hover:text-zinc-800"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Recipient Name *
              </label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Pooja Sharma"
                className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+919876543210"
                className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Address Line 1 *
              </label>
              <input
                type="text"
                required
                value={streetLine1}
                onChange={(e) => setStreetLine1(e.target.value)}
                placeholder="Flat 402, Lotus Apartments, 12th Cross"
                className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Address Line 2 (Optional)
              </label>
              <input
                type="text"
                value={streetLine2}
                onChange={(e) => setStreetLine2(e.target.value)}
                placeholder="Indiranagar"
                className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">City *</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Bengaluru"
                className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">State *</label>
              <input
                type="text"
                required
                value={stateProvince}
                onChange={(e) => setStateProvince(e.target.value)}
                placeholder="Karnataka"
                className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                PIN Code (6 digits) *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="560038"
                className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Address
            </button>
          </div>
        </form>
      )}

      {/* Address cards */}
      {isLoading ? (
        <div className="py-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
        </div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-zinc-200 p-8 space-y-2">
          <p className="font-semibold text-zinc-800 text-sm">No saved addresses</p>
          <p className="text-xs text-zinc-500">Add a delivery address to speed up checkout.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`p-5 rounded-2xl border bg-white space-y-2 relative shadow-xs ${
                addr.isDefault ? 'border-emerald-600 ring-1 ring-emerald-500' : 'border-zinc-200'
              }`}
            >
              {addr.isDefault && (
                <span className="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                  Default Address
                </span>
              )}
              <p className="font-bold text-sm text-zinc-900">{addr.recipientName}</p>
              <p className="text-xs text-zinc-600">{addr.streetLine1}</p>
              {addr.streetLine2 && <p className="text-xs text-zinc-600">{addr.streetLine2}</p>}
              <p className="text-xs text-zinc-600">
                {addr.city}, {addr.stateProvince} — {addr.postalCode}
              </p>
              <p className="text-xs text-zinc-400">Phone: {addr.phoneNumber}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
