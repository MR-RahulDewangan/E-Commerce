'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-zinc-900">Your cart is empty</h2>
        <p className="text-xs text-zinc-500">Please add items to your cart before proceeding to checkout.</p>
        <Link
          href="/products"
          className="inline-block px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-bold"
        >
          Browse Catalog
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center gap-2">
        <Link
          href="/cart"
          className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 font-semibold"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Cart
        </Link>
      </div>

      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
          Secure Indian Checkout
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          Atomic inventory reservation hold active. 18% inclusive GST tax invoicing.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleCreateOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Inputs (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Customer Contact & Shipping Address */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <h2 className="font-extrabold text-sm sm:text-base text-zinc-900 flex items-center gap-2 border-b border-zinc-100 pb-3">
              <MapPin className="w-4 h-4 text-emerald-600" /> 1. Shipping Address & Contact Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Recipient Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pooja Sharma"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Mobile Phone Number (10 digits) *
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-zinc-300 bg-zinc-50 text-zinc-500 text-xs font-semibold">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs border border-zinc-300 rounded-r-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">
                  Required for courier dispatch notifications via SMS.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Address Line 1 (Flat, House No, Building, Street) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Flat 402, Lotus Apartments, 12th Cross"
                  value={streetLine1}
                  onChange={(e) => setStreetLine1(e.target.value)}
                  className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Address Line 2 (Area, Landmark - Optional)
                </label>
                <input
                  type="text"
                  placeholder="Indiranagar 100ft Road"
                  value={streetLine2}
                  onChange={(e) => setStreetLine2(e.target.value)}
                  className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  City / District *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Bengaluru"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  State / Union Territory *
                </label>
                <select
                  value={stateProvince}
                  onChange={(e) => setStateProvince(e.target.value)}
                  className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
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
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  PIN Code (6 digits) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="560038"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Payment Method Selection */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <h2 className="font-extrabold text-sm sm:text-base text-zinc-900 flex items-center gap-2 border-b border-zinc-100 pb-3">
              <CreditCard className="w-4 h-4 text-emerald-600" /> 2. Payment Method
            </h2>

            <div className="space-y-3">
              {/* Online Payment (UPI / Cards / Netbanking) */}
              <label
                className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition ${
                  paymentMethod === 'MOCK'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500'
                    : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="MOCK"
                  checked={paymentMethod === 'MOCK'}
                  onChange={() => setPaymentMethod('MOCK')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-zinc-900">
                      Online Payment (UPI, Credit/Debit Cards, RuPay, Netbanking)
                    </span>
                    <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      Instant Confirmation
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Zero payment gateway surcharge. Seamless 100% encrypted checkout with instant dispatch reservation.
                  </p>
                </div>
              </label>

              {/* Cash On Delivery (COD) */}
              <label
                className={`flex items-start gap-3 p-4 border rounded-xl transition ${
                  !isCodAllowed
                    ? 'opacity-50 cursor-not-allowed bg-zinc-50 border-zinc-200'
                    : paymentMethod === 'COD'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500 cursor-pointer'
                    : 'border-zinc-200 hover:border-zinc-300 cursor-pointer'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="COD"
                  disabled={!isCodAllowed}
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-zinc-700" />
                    <span className="font-bold text-xs sm:text-sm text-zinc-900">
                      Cash on Delivery (COD)
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Pay with cash or UPI QR upon delivery at your doorstep.
                  </p>
                  {!isCodAllowed && (
                    <p className="text-[11px] font-bold text-rose-600">
                      ⚠️ Cash on Delivery is only available for orders up to ₹5,000.
                    </p>
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Order Summary & Submit (1 Col) */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4 sticky top-24">
            <h2 className="text-base font-extrabold text-zinc-900 border-b border-zinc-100 pb-3">
              Order Review
            </h2>

            {/* Line items snippet */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 text-xs">
              {cart.items.map((it) => (
                <div key={it.id} className="flex justify-between items-center gap-2">
                  <span className="truncate text-zinc-700">
                    {it.quantity}x {it.productName} ({it.name})
                  </span>
                  <span className="font-bold text-zinc-900 flex-shrink-0">
                    {formatInr(it.totalPriceInr)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-200 pt-3 space-y-2 text-xs sm:text-sm text-zinc-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-zinc-900">{formatInr(subtotalInr)}</span>
              </div>

              <div className="flex justify-between">
                <span>Delivery Charge</span>
                <span className="font-semibold">
                  {shippingFeeInr === 0 ? (
                    <span className="text-emerald-700 font-bold">FREE</span>
                  ) : (
                    formatInr(shippingFeeInr)
                  )}
                </span>
              </div>

              <div className="flex justify-between text-zinc-500">
                <span>Inclusive 18% GST</span>
                <span>{formatInr(gstInr)}</span>
              </div>

              <div className="border-t border-zinc-200 pt-3 flex justify-between text-base font-extrabold text-zinc-900">
                <span>Total Payable</span>
                <span className="text-emerald-700">{formatInr(totalInr)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Reserving Inventory...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" /> Place Order ({formatInr(totalInr)})
                </>
              )}
            </button>

            <div className="space-y-2 pt-2 text-[11px] text-zinc-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Encrypted with TLS 1.3 | Server GST Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>Dispatched via Delhivery & Blue Dart</span>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Online Payment Simulator Modal */}
      {pendingPaymentData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" />

          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-5 z-10 border border-zinc-200">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900">Payment Gateway Authorization</h3>
              <p className="text-xs text-zinc-500">
                Order: <strong className="text-zinc-800">{pendingPaymentData.orderNumber}</strong>
              </p>
            </div>

            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500">Amount Due:</span>
                <span className="font-bold text-zinc-900 text-sm">
                  {formatInr(pendingPaymentData.amountPaise / 100)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Gateway Session:</span>
                <span className="font-mono text-zinc-700 truncate max-w-[180px]">
                  {pendingPaymentData.gatewayOrderId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Payment Provider:</span>
                <span className="font-semibold text-emerald-700">
                  {pendingPaymentData.paymentMethod} (UPI / RuPay / Cards)
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleVerifyMockPayment(false)}
                disabled={isVerifying}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl text-xs sm:text-sm shadow transition flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying Cryptographic Signature...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Authorize & Finalize Payment
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleVerifyMockPayment(true)}
                disabled={isVerifying}
                className="w-full py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 transition"
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
