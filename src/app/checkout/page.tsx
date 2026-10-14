'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { formatInr } from '@/lib/utils';
import {
  ShieldCheck,
  Truck,
  CreditCard,
  Banknote,
  Lock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MapPin,
  ChevronLeft,
  X,
  Sparkles,
} from 'lucide-react';

const MAX_COD_LIMIT_INR = 5000;

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, isLoading: isCartLoading, refreshCart } = useCart();

  // Form State
  const [recipientName, setRecipientName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [streetLine1, setStreetLine1] = useState('');
  const [streetLine2, setStreetLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateProvince, setStateProvince] = useState('Karnataka');
  const [postalCode, setPostalCode] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<'MOCK' | 'COD'>('MOCK');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mock Payment Modal state
  const [pendingPaymentData, setPendingPaymentData] = useState<{
    orderId: string;
    orderNumber: string;
    gatewayOrderId: string;
    amountPaise: number;
    paymentMethod: string;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Pre-fill user data if logged in
  useEffect(() => {
    if (user) {
      if (!recipientName) setRecipientName(`${user.firstName} ${user.lastName}`);
      if (!email) setEmail(user.email);
    }
  }, [user, recipientName, email]);

  if (isCartLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-foreground" />
          <p className="font-serif text-lg text-muted-foreground">Preparing your atelier checkout...</p>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-5">
        <h2 className="font-serif text-2xl font-normal text-foreground">Your Shopping Bag is Empty</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Please add handcrafted creations to your bag before proceeding to checkout.
        </p>
        <Link
          href="/products"
          className="inline-block px-6 py-3 bg-primary hover:bg-charcoal text-primary-foreground text-xs uppercase tracking-widest font-medium transition shadow-xs"
        >
          Browse Collections
        </Link>
      </div>
    );
  }

  const subtotalInr = cart.pricing.subtotalAfterDiscountPaise / 100;
  const shippingFeeInr = cart.pricing.shippingFeePaise / 100;
  const gstInr = cart.pricing.tax.totalGstPaise / 100;
  const totalInr = cart.pricing.totalPayablePaise / 100;
  const isCodAllowed = totalInr <= MAX_COD_LIMIT_INR;

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate 6-digit Indian PIN code
    if (!/^[1-9][0-9]{5}$/.test(postalCode.trim())) {
      setErrorMessage('Postal code must be a valid 6-digit Indian PIN code (e.g. 560038).');
      return;
    }

    // Validate Indian Phone Number
    if (!/^(?:\+91[\-\s]?)?[0]?(91)?[6-9]\d{9}$/.test(phone.trim())) {
      setErrorMessage('Phone number must be a valid 10-digit Indian mobile number (e.g. 9876543210).');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/v1/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customer: {
            name: recipientName.trim(),
            email: email.trim(),
            phone: phone.trim(),
          },
          shippingAddress: {
            recipientName: recipientName.trim(),
            phoneNumber: phone.trim(),
            streetLine1: streetLine1.trim(),
            streetLine2: streetLine2.trim() || undefined,
            city: city.trim(),
            stateProvince: stateProvince.trim(),
            postalCode: postalCode.trim(),
            countryCode: 'IN',
          },
          paymentMethod,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setIsSubmitting(false);
        setErrorMessage(json.error?.message || 'Failed to place checkout order.');
        return;
      }

      const orderData = json.data;

      // If COD, order is confirmed in AWAITING_PAYMENT status
      if (paymentMethod === 'COD') {
        await refreshCart();
        router.push(`/checkout/success?orderNumber=${encodeURIComponent(orderData.orderNumber)}`);
        return;
      }

      // If MOCK or online gateway, open payment simulator dialog
      setPendingPaymentData(orderData);
      setIsSubmitting(false);
    } catch {
      setIsSubmitting(false);
      setErrorMessage('Network error while processing checkout.');
    }
  };

  const handleVerifyMockPayment = async (shouldFail = false) => {
    if (!pendingPaymentData) return;
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/checkout/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderId: pendingPaymentData.orderId,
          gatewayOrderId: pendingPaymentData.gatewayOrderId,
          gatewayPaymentId: `pay_mock_${Date.now()}`,
          signature: shouldFail ? 'invalid_signature_mock' : 'mock_valid_signature',
        }),
      });

      const json = await res.json();
      setIsVerifying(false);

      if (!res.ok) {
        setErrorMessage(json.error?.message || 'Payment verification failed.');
        return;
      }

      await refreshCart();
      router.push(
        `/checkout/success?orderNumber=${encodeURIComponent(pendingPaymentData.orderNumber)}`
      );
    } catch {
      setIsVerifying(false);
      setErrorMessage('Network error during payment verification.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      {/* Back Link & Header */}
      <div>
        <Link
          href="/cart"
          className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 font-medium mb-4 transition"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Return to Shopping Bag
        </Link>

        <div className="border-b border-border pb-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-normal text-foreground tracking-tight">
              Maison Checkout
            </h1>
            <p className="text-xs text-muted-foreground mt-1.5">
              Atomic inventory hold active. Compliant with 18% inclusive GST Indian tax invoicing.
            </p>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">
            Secured with TLS 1.3
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-xs text-xs font-medium flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-rose-700 flex-shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 hover:text-rose-900"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleCreateOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Form Inputs (7 Cols) */}
        <div className="lg:col-span-7 space-y-8">
          {/* Step 1: Customer Contact & Shipping Address */}
          <div className="bg-card p-6 sm:p-8 rounded-xs border border-border shadow-xs space-y-6">
            <h2 className="font-serif text-xl font-normal text-foreground flex items-center gap-2.5 border-b border-border pb-4">
              <MapPin className="w-4 h-4 text-champagne-dark" />
              <span>1. Delivery Destination & Contact</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                  Recipient Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pooja Sharma"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full text-xs bg-background border border-border rounded-xs p-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs bg-background border border-border rounded-xs p-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                  Mobile Phone Number (10 digits) *
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3.5 rounded-l-xs border border-r-0 border-border bg-stone-100 text-foreground text-xs font-medium font-mono">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs bg-background border border-border rounded-r-xs p-3 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Required for courier dispatch and delivery PIN notification via SMS.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                  Address Line 1 (Flat, House No, Building, Street) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Flat 402, Lotus Residences, 12th Cross"
                  value={streetLine1}
                  onChange={(e) => setStreetLine1(e.target.value)}
                  className="w-full text-xs bg-background border border-border rounded-xs p-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                  Address Line 2 (Area, Landmark - Optional)
                </label>
                <input
                  type="text"
                  placeholder="Indiranagar 100ft Road"
                  value={streetLine2}
                  onChange={(e) => setStreetLine2(e.target.value)}
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
                  placeholder="Bengaluru"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
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
                  <option value="Haryana">Haryana</option>
                  <option value="Goa">Goa</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                  <option value="Madhya Pradesh">Madhya Pradesh</option>
                  <option value="Jammu & Kashmir">Jammu & Kashmir</option>
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
                  placeholder="560038"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full text-xs bg-background border border-border rounded-xs p-3 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition tracking-wider"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Payment Method Selection */}
          <div className="bg-card p-6 sm:p-8 rounded-xs border border-border shadow-xs space-y-6">
            <h2 className="font-serif text-xl font-normal text-foreground flex items-center gap-2.5 border-b border-border pb-4">
              <CreditCard className="w-4 h-4 text-champagne-dark" />
              <span>2. Preferred Payment Atelier</span>
            </h2>

            <div className="space-y-3.5">
              {/* Online Payment (UPI / Cards / Netbanking) */}
              <label
                className={`flex items-start gap-4 p-5 border rounded-xs cursor-pointer transition ${
                  paymentMethod === 'MOCK'
                    ? 'border-primary bg-stone-50/80 ring-1 ring-primary'
                    : 'border-border hover:border-stone-400 bg-card'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="MOCK"
                  checked={paymentMethod === 'MOCK'}
                  onChange={() => setPaymentMethod('MOCK')}
                  className="mt-1 text-primary focus:ring-primary accent-primary"
                />
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-xs sm:text-sm text-foreground">
                      Online Payment (UPI, Credit/Debit Cards, RuPay, Netbanking)
                    </span>
                    <span className="bg-primary text-primary-foreground text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-2xs">
                      Instant Confirmation
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Zero payment gateway surcharge. Seamless 100% encrypted checkout with immediate inventory reservation hold.
                  </p>
                </div>
              </label>

              {/* Cash On Delivery (COD) */}
              <label
                className={`flex items-start gap-4 p-5 border rounded-xs transition ${
                  !isCodAllowed
                    ? 'opacity-60 cursor-not-allowed bg-stone-100/50 border-border'
                    : paymentMethod === 'COD'
                    ? 'border-primary bg-stone-50/80 ring-1 ring-primary cursor-pointer'
                    : 'border-border hover:border-stone-400 bg-card cursor-pointer'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="COD"
                  disabled={!isCodAllowed}
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                  className="mt-1 text-primary focus:ring-primary accent-primary"
                />
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-xs sm:text-sm text-foreground">
                      Cash on Delivery (COD)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Pay securely with cash or UPI QR upon delivery at your doorstep across India.
                  </p>
                  {!isCodAllowed && (
                    <p className="text-[11px] font-medium text-rose-800">
                      ⚠️ Cash on Delivery is available for orders up to ₹5,000 as per statutory guidelines.
                    </p>
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Order Summary & Submit (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-card p-6 sm:p-7 rounded-xs border border-border shadow-xs space-y-6 sticky top-28">
            <h2 className="font-serif text-xl font-normal text-foreground border-b border-border pb-4">
              Order Review
            </h2>

            {/* Line items snippet */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1 divide-y divide-border/40">
              {cart.items.map((it) => (
                <div key={it.id} className="pt-3 first:pt-0 flex gap-3 items-center">
                  <div className="relative w-12 aspect-[3/4] bg-stone-100 rounded-2xs overflow-hidden flex-shrink-0 border border-border/60">
                    {it.imageUrl ? (
                      <Image
                        src={it.imageUrl}
                        alt={it.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground">
                        Item
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-xs text-foreground truncate">{it.productName}</p>
                    <p className="text-[11px] text-muted-foreground">{it.name} • Qty: {it.quantity}</p>
                  </div>
                  <span className="text-xs font-semibold text-foreground flex-shrink-0 font-mono">
                    {formatInr(it.totalPriceInr)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-2.5 text-xs sm:text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Creations Subtotal</span>
                <span className="font-medium text-foreground">{formatInr(subtotalInr)}</span>
              </div>

              <div className="flex justify-between">
                <span>Shipping & Handling</span>
                <span className="font-medium">
                  {shippingFeeInr === 0 ? (
                    <span className="text-emerald-700 font-medium">Complimentary</span>
                  ) : (
                    formatInr(shippingFeeInr)
                  )}
                </span>
              </div>

              <div className="flex justify-between text-muted-foreground/80">
                <span>Inclusive 18% GST</span>
                <span>{formatInr(gstInr)}</span>
              </div>

              <div className="border-t border-border pt-4 flex justify-between items-baseline text-base font-semibold text-foreground">
                <span>Total Payable</span>
                <span className="font-serif text-xl font-bold text-foreground">
                  {formatInr(totalInr)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-primary hover:bg-charcoal disabled:bg-stone-400 text-primary-foreground text-xs uppercase tracking-widest font-medium transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Reserving Inventory...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Place Order ({formatInr(totalInr)})</span>
                </>
              )}
            </button>

            {/* Reassurance notes */}
            <div className="space-y-2 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-champagne-dark flex-shrink-0" />
                <span>Encrypted with TLS 1.3 | Server GST Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-champagne-dark flex-shrink-0" />
                <span>Insured Dispatch via Delhivery & Blue Dart</span>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Online Payment Simulator Modal */}
      {pendingPaymentData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-modal-title"
        >
          <div
            className="absolute inset-0 bg-charcoal/70 backdrop-blur-xs transition-opacity"
            onClick={() => {
              if (!isVerifying) setPendingPaymentData(null);
            }}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-md bg-card rounded-xs shadow-2xl p-7 space-y-6 z-10 border border-border text-card-foreground animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 border border-border text-foreground flex items-center justify-center">
                <CreditCard className="w-5 h-5 stroke-[1.5]" />
              </div>
              <h3 id="payment-modal-title" className="font-serif text-xl font-normal text-foreground">
                Payment Gateway Authorization
              </h3>
              <p className="text-xs text-muted-foreground">
                Order Reference: <strong className="font-mono text-foreground">{pendingPaymentData.orderNumber}</strong>
              </p>
            </div>

            <div className="p-4 bg-stone-50 rounded-xs border border-stone-200/80 text-xs space-y-2.5">
              <div className="flex justify-between items-baseline">
                <span className="text-muted-foreground">Amount Due:</span>
                <span className="font-serif text-base font-bold text-foreground">
                  {formatInr(pendingPaymentData.amountPaise / 100)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Gateway Session:</span>
                <span className="font-mono text-[11px] text-foreground truncate max-w-[190px]">
                  {pendingPaymentData.gatewayOrderId}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Payment Provider:</span>
                <span className="font-medium text-foreground">
                  {pendingPaymentData.paymentMethod} (UPI / RuPay / Cards)
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleVerifyMockPayment(false)}
                disabled={isVerifying}
                className="w-full py-3.5 bg-primary hover:bg-charcoal disabled:bg-stone-400 text-primary-foreground text-xs uppercase tracking-widest font-medium transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Cryptographic Signature...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Authorize & Finalize Payment</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleVerifyMockPayment(true)}
                disabled={isVerifying}
                className="w-full py-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-rose-700 transition font-medium"
              >
                Simulate Payment Failure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
