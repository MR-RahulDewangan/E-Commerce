import { describe, it, expect, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import { createSessionToken } from '@/modules/auth/session';
import { db } from '@/lib/db';
import { GET as getSales } from '@/app/api/v1/seller/analytics/sales/route';
import { GET as getCustomers } from '@/app/api/v1/seller/analytics/customers/route';
import { GET as getGeographic } from '@/app/api/v1/seller/analytics/geographic/route';
import { GET as getFunnel } from '@/app/api/v1/seller/analytics/funnel/route';
import { GET as getProducts } from '@/app/api/v1/seller/analytics/products/route';
import { GET as getPricing, POST as postPricing } from '@/app/api/v1/seller/analytics/pricing/route';
import { POST as postEvents } from '@/app/api/v1/analytics/events/route';

describe('Seller Analytics API Security & Authorization Integration Tests', () => {
  let customerToken: string;
  let sellerToken: string;
  let sellerUser: any;
  let sellerProfile: any;

  beforeAll(async () => {
    sellerUser = await db.user.findUnique({
      where: { email: 'seller.kashmir@ecommerce.example.in' },
      include: { sellerProfile: true },
    });

    expect(sellerUser).toBeDefined();
    sellerProfile = sellerUser.sellerProfile;
    expect(sellerProfile).toBeDefined();

    customerToken = await createSessionToken({
      id: 'cust_sec_test',
      email: 'customer.test@example.in',
      role: 'CUSTOMER',
      firstName: 'Customer',
      lastName: 'Security',
    });

    sellerToken = await createSessionToken({
      id: sellerUser.id,
      email: sellerUser.email,
      role: 'SELLER',
      firstName: sellerUser.firstName,
      lastName: sellerUser.lastName,
    });
  });

  it('rejects unauthenticated requests with HTTP 401 Unauthorized', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/seller/analytics/sales');
    const res = await getSales(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('blocks CUSTOMER role from seller analytics endpoints with HTTP 403 Forbidden', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/seller/analytics/sales', {
      headers: { Cookie: `session_token=${customerToken}` },
    });
    const res = await getSales(req);
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('allows authenticated SELLER role to access sales intelligence with valid response', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/seller/analytics/sales?range=30d', {
      headers: { Cookie: `session_token=${sellerToken}` },
    });
    const res = await getSales(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body).toHaveProperty('kpis');
    expect(body).toHaveProperty('trends');
    expect(body).toHaveProperty('categories');
    expect(body).toHaveProperty('distributions');
  });

  it('allows authenticated SELLER to access customer intelligence (RFM & Cohorts)', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/seller/analytics/customers', {
      headers: { Cookie: `session_token=${sellerToken}` },
    });
    const res = await getCustomers(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body).toHaveProperty('rfm');
    expect(body).toHaveProperty('cohorts');
  });

  it('allows authenticated SELLER to access geographic insights & benchmarks', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/seller/analytics/geographic', {
      headers: { Cookie: `session_token=${sellerToken}` },
    });
    const res = await getGeographic(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body).toHaveProperty('locations');
    expect(body).toHaveProperty('stateAggregates');
    expect(body).toHaveProperty('benchmarks');
  });

  it('allows authenticated SELLER to access behavioral conversion funnel', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/seller/analytics/funnel', {
      headers: { Cookie: `session_token=${sellerToken}` },
    });
    const res = await getFunnel(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body).toHaveProperty('stages');
    expect(body).toHaveProperty('summary');
  });

  it('allows authenticated SELLER to access product performance & affinity rules', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/seller/analytics/products', {
      headers: { Cookie: `session_token=${sellerToken}` },
    });
    const res = await getProducts(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body).toHaveProperty('products');
    expect(body).toHaveProperty('inventorySummary');
    expect(body).toHaveProperty('affinity');
  });

  it('handles public behavioral event ingestion and rejects invalid schemas', async () => {
    // Valid event
    const validReq = new NextRequest('http://localhost:3000/api/v1/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'HOMEPAGE_VIEW',
        sessionId: 'session_sec_valid_123',
        metadata: { source: 'organic' },
      }),
    });
    const validRes = await postEvents(validReq);
    expect(validRes.status).toBe(201);

    // Invalid eventType
    const invalidReq = new NextRequest('http://localhost:3000/api/v1/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'INVALID_EVENT_TYPE',
        sessionId: 'short',
      }),
    });
    const invalidRes = await postEvents(invalidReq);
    expect(invalidRes.status).toBe(400);
    const invalidBody = await invalidRes.json();
    expect(invalidBody.success).toBe(false);
    expect(invalidBody.error.code).toBe('VALIDATION_ERROR');
  });
});
