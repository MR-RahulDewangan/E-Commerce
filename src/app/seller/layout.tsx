import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/modules/auth/session';
import { getSellerProfile } from '@/modules/seller/service';
import { SellerSidebar } from '@/components/seller/SellerSidebar';

export const metadata = {
  title: 'Seller Portal | Multi-Vendor Marketplace',
  description: 'Merchant dashboard for catalog management, stock adjustments, and order tracking.',
};

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (!user) {
    redirect('/login?callbackUrl=/seller');
  }

  if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-zinc-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h1 className="text-xl font-bold text-zinc-900">Seller Access Required</h1>
          <p className="text-sm text-zinc-600">
            A verified Seller account or Administrator role is required to access the marketplace merchant portal.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/"
              className="inline-block px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
            >
              Return to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const profile = await getSellerProfile(user.id);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col lg:flex-row">
      <SellerSidebar
        storeName={profile?.storeName}
        storeSlug={profile?.storeSlug}
        isVerified={profile?.isVerified}
      />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
