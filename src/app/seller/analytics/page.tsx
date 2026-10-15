import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/modules/auth/session';
import { getSellerProfile } from '@/modules/seller/service';
import { SellerAnalyticsWorkspace } from '@/components/seller/analytics/SellerAnalyticsWorkspace';

export const revalidate = 0; // Dynamic server component

export default async function SellerAnalyticsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (!user) {
    redirect('/login?callbackUrl=/seller/analytics');
  }

  const profile = await getSellerProfile(user.id);
  if (!profile) {
    redirect('/seller/profile');
  }

  return <SellerAnalyticsWorkspace storeName={profile.storeName} />;
}
