import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { GET as getWishlistHandler, POST as addWishlistHandler } from '@/app/api/v1/wishlist/route';
import { DELETE as removeWishlistHandler } from '@/app/api/v1/wishlist/items/[id]/route';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/modules/auth/session';
import { Role } from '@prisma/client';

describe('Wishlist API Integration Tests (Live PostgreSQL 16)', () => {
  let categoryId: string;
  let productId: string;
  let variantId: string;
  let testUserId: string;
  let authCookie: string;

  beforeAll(async () => {
    // 1. Create User & Auth token
    const user = await db.user.create({
      data: {
        email: `wishlist-tester-${Date.now()}@example.in`,
        firstName: 'Divya',
        lastName: 'Nair',
        role: Role.CUSTOMER,
      },
    });
    testUserId = user.id;

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    });
    authCookie = `${SESSION_COOKIE_NAME}=${token}`;

    // 2. Create Category & Product with Variant
    const category = await db.category.create({
      data: {
        name: 'Wishlist Test Category',
        slug: `wishlist-cat-${Date.now()}`,
      },
    });
    categoryId = category.id;

    const product = await db.product.create({
      data: {
        name: 'Kalamkari Silk Dupatta',
        slug: `kalamkari-dupatta-${Date.now()}`,
        description: 'Authentic hand-painted Kalamkari silk dupatta.',
        basePrice: 850.0,
        isPublished: true,
        categoryId,
      },
    });
    productId = product.id;

    const variant = await db.productVariant.create({
      data: {
        productId,
        sku: `KALAMKARI-VAR-${Date.now()}`,
        name: 'Multi-color Motif',
        stockQuantity: 12,
      },
    });
    variantId = variant.id;
  });

  afterAll(async () => {
    await db.wishlistItem.deleteMany({ where: { variantId } });
    await db.wishlist.deleteMany({ where: { userId: testUserId } });
    await db.productVariant.deleteMany({ where: { id: variantId } });
    await db.product.deleteMany({ where: { id: productId } });
    await db.category.deleteMany({ where: { id: categoryId } });
    await db.user.deleteMany({ where: { id: testUserId } });
  });

  it('rejects unauthenticated requests to wishlist endpoints', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/wishlist', {
      method: 'GET',
    });
    const res = await getWishlistHandler(req);
    expect(res.status).toBe(401);
  });

  it('adds an item to wishlist and prevents duplicate entries', async () => {
    const addReq = new NextRequest('http://localhost:3000/api/v1/wishlist', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: authCookie,
      },
      body: JSON.stringify({ variantId }),
    });

    const addRes = await addWishlistHandler(addReq);
    expect(addRes.status).toBe(201);

    // Duplicate add should succeed idempotently
    const addDupReq = new NextRequest('http://localhost:3000/api/v1/wishlist', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: authCookie,
      },
      body: JSON.stringify({ variantId }),
    });
    const addDupRes = await addWishlistHandler(addDupReq);
    expect(addDupRes.status).toBe(201);
  });

  it('retrieves user wishlist with detailed variant & product information', async () => {
    const getReq = new NextRequest('http://localhost:3000/api/v1/wishlist', {
      method: 'GET',
      headers: { cookie: authCookie },
    });

    const getRes = await getWishlistHandler(getReq);
    expect(getRes.status).toBe(200);
    const data = await getRes.json();
    expect(data.data.count).toBe(1);
    expect(data.data.items[0].variantId).toBe(variantId);
    expect(data.data.items[0].productName).toBe('Kalamkari Silk Dupatta');
    expect(data.data.items[0].priceInr).toBe(850.0);
    expect(data.data.items[0].isAvailable).toBe(true);
  });

  it('removes an item from wishlist', async () => {
    const delReq = new NextRequest(`http://localhost:3000/api/v1/wishlist/items/${variantId}`, {
      method: 'DELETE',
      headers: { cookie: authCookie },
    });

    const delRes = await removeWishlistHandler(delReq, { params: Promise.resolve({ id: variantId }) });
    expect(delRes.status).toBe(200);

    // Check wishlist is now empty
    const checkReq = new NextRequest('http://localhost:3000/api/v1/wishlist', {
      method: 'GET',
      headers: { cookie: authCookie },
    });
    const checkRes = await getWishlistHandler(checkReq);
    const checkData = await checkRes.json();
    expect(checkData.data.count).toBe(0);
  });
});
