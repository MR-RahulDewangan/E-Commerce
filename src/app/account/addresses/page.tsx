'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { MapPin, Plus, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { AccountNav } from '@/components/account/AccountNav';

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
        setSuccessMessage('Delivery address saved successfully to your dossier!');
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
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-full bg-stone-100 border border-border text-muted-foreground flex items-center justify-center">
          <MapPin className="w-7 h-7 stroke-[1.25]" />
        </div>
        <h2 className="font-serif text-2xl font-normal text-foreground">Sign In Required</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Please sign in to manage your verified shipping addresses.
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

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-normal text-foreground tracking-tight">
            Saved Delivery Addresses
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Manage your verified destinations across India for expedited white-glove dispatch.
          </p>
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="px-5 py-2.5 bg-primary hover:bg-charcoal text-primary-foreground text-xs uppercase tracking-widest font-medium rounded-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add New Address
          </button>
        )}
      </div>

      {successMessage && (
        <div className="p-3.5 bg-stone-50 border border-stone-200 text-foreground text-xs rounded-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-champagne-dark flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xs text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-700 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Add Address Form Accordion */}
      {isAdding && (
        <form
          onSubmit={handleAddAddress}
          className="bg-card p-6 sm:p-8 rounded-xs border border-border shadow-xs space-y-5 text-card-foreground animate-in fade-in duration-200"
        >
          <div className="flex justify-between items-center border-b border-border pb-4">
            <h3 className="font-serif text-lg font-normal text-foreground">
              Add New Delivery Destination
            </h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                Recipient Name *
              </label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. Pooja Sharma"
                className="w-full text-xs bg-background border border-border rounded-xs p-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+919876543210"
                className="w-full text-xs bg-background border border-border rounded-xs p-3 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                Address Line 1 (Flat, House No, Building, Street) *
              </label>
              <input
                type="text"
                required
                value={streetLine1}
                onChange={(e) => setStreetLine1(e.target.value)}
                placeholder="Flat 402, Lotus Residences, 12th Cross"
                className="w-full text-xs bg-background border border-border rounded-xs p-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                Address Line 2 (Area, Landmark - Optional)
              </label>
              <input
                type="text"
                value={streetLine2}
                onChange={(e) => setStreetLine2(e.target.value)}
                placeholder="Indiranagar 100ft Road"
                className="w-full text-xs bg-background border border-border rounded-xs p-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                City / District *
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Bengaluru"
                className="w-full text-xs bg-background border border-border rounded-xs p-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                State / Union Territory *
              </label>
              <select
                value={stateProvince}
                onChange={(e) => setStateProvince(e.target.value)}
                className="w-full text-xs bg-background border border-border rounded-xs p-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition cursor-pointer"
              >
                <option value="Karnataka">Karnataka</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Delhi">Delhi</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="Telangana">Telangana</option>
                <option value="West Bengal">West Bengal</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Kerala">Kerala</option>
                <option value="Rajasthan">Rajasthan</option>
                <option value="Punjab">Punjab</option>
                <option value="Goa">Goa</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                PIN Code (6 digits) *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="560038"
                className="w-full text-xs bg-background border border-border rounded-xs p-3 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition tracking-wider"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 border border-border rounded-xs text-xs uppercase tracking-wider font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-primary hover:bg-charcoal text-primary-foreground rounded-xs text-xs uppercase tracking-widest font-medium transition flex items-center gap-2 cursor-pointer shadow-xs disabled:bg-stone-400"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Address</span>
            </button>
          </div>
        </form>
      )}

      {/* Address cards */}
      {isLoading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-foreground" />
        </div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xs border border-border p-8 space-y-4 text-card-foreground">
          <div className="w-16 h-16 mx-auto rounded-full bg-stone-100 border border-border text-muted-foreground flex items-center justify-center">
            <MapPin className="w-7 h-7 stroke-[1.25]" />
          </div>
          <div className="space-y-1">
            <p className="font-serif text-lg text-foreground">No Saved Addresses</p>
            <p className="text-xs text-muted-foreground">Add a delivery address to expedite your checkout orders.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`p-6 rounded-xs border bg-card space-y-3 relative shadow-xs text-card-foreground ${
                addr.isDefault ? 'border-primary ring-1 ring-primary' : 'border-border'
              }`}
            >
              {addr.isDefault && (
                <span className="inline-block bg-primary text-primary-foreground text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-2xs">
                  Default Destination
                </span>
              )}
              <div>
                <p className="font-serif text-base font-normal text-foreground">{addr.recipientName}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{addr.streetLine1}</p>
                {addr.streetLine2 && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{addr.streetLine2}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {addr.city}, {addr.stateProvince} — <span className="font-mono">{addr.postalCode}</span>
                </p>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground pt-1 border-t border-border/60">
                Phone: {addr.phoneNumber}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

