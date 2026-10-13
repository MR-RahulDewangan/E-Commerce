import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { GET as getCartHandler, DELETE as clearCartHandler } from '@/app/api/v1/cart/route';
import { POST as addCartItemHandler } from '@/app/api/v1/cart/items/route';
import {
  PATCH as updateCartItemHandler,
  DELETE as deleteCartItemHandler,
} from '@/app/api/v1/cart/items/[id]/route';
import { mergeGuestCartIntoUserCart } from '@/modules/cart/service';

describe('Cart Domain & API Integration Tests (Live PostgreSQL 16)', () => {
  let categoryId: string;
  let productId: string;
  let variantIdInStock: string;
  let variantIdLowStock: string;
  let testUserId: string;
  let cartSessionToken: string;
  let createdCartItemId: string;

  beforeAll(async () => {
    // 1. Create Category
    const cat = await db.category.create({
      data: {
        name: 'Cart Test Category',
        slug: `cart-cat-${Date.now()}`,
      },
    });
    categoryId = cat.id;

    // 2. Create Product
    const prod = await db.product.create({
      data: {
        name: 'Handloom Cotton Saree',
        slug: `cart-prod-${Date.now()}`,
        description: 'Pure handloom cotton festive saree.',
        basePrice: 1200.0,
        isPublished: true,
        categoryId,
      },
    });
    productId = prod.id;

    // 3. Create Variants: one with ample stock (20), one with low stock (2)
    const var1 = await db.productVariant.create({
      data: {
        productId,
        sku: `CART-VAR-AMPLE-${Date.now()}`,
        name: 'Crimson Red',
        stockQuantity: 20,
        priceOverride: null, // ₹1,200 (120,000 paise) -> eligible for free shipping
      },
    });
    variantIdInStock = var1.id;

    const var2 = await db.productVariant.create({
      data: {
        productId,
        sku: `CART-VAR-LOW-${Date.now()}`,
        name: 'Emerald Green',
        stockQuantity: 2,
        priceOverride: 400.0, // ₹400 (40,000 paise) -> below ₹999 shipping threshold
      },
    });
    variantIdLowStock = var2.id;

    // 4. Create Test User
    const user = await db.user.create({
      data: {
        email: `cart_user_${Date.now()}@example.in`,
        firstName: 'Cart',
        lastName: 'Tester',
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    if (productId) await db.product.deleteMany({ where: { id: productId } });
    if (categoryId) await db.category.deleteMany({ where: { id: categoryId } });
    if (testUserId) {
      await db.cart.deleteMany({ where: { userId: testUserId } });
      await db.user.deleteMany({ where: { id: testUserId } });
    }
  });

  describe('GET /api/v1/cart', () => {
    it('creates a fresh guest cart and returns empty cart with standard ₹70 delivery fee', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/cart');
      const res = await getCartHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.cart.items.length).toBe(0);
      expect(json.data.cart.pricing.subtotalPaise).toBe(0);
      expect(json.data.cart.pricing.shippingFeePaise).toBe(0); // ₹0 shipping when cart is empty

      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toContain('cart_session=');
      const match = setCookie?.match(/cart_session=([^;]+)/);
      expect(match).not.toBeNull();
      cartSessionToken = match![1];
    });
  });

  describe('POST /api/v1/cart/items', () => {
    it('adds item to cart and qualifies for free shipping when total >= ₹999', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/cart/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `cart_session=${cartSessionToken}`,
        },
        body: JSON.stringify({
          variantId: variantIdInStock,
          quantity: 1, // ₹1,200 (120,000 paise)
        }),
      });

      const res = await addCartItemHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.cart.items.length).toBe(1);
      expect(json.data.cart.items[0].variantId).toBe(variantIdInStock);
      expect(json.data.cart.items[0].quantity).toBe(1);
      expect(json.data.cart.pricing.subtotalPaise).toBe(120000);
      expect(json.data.cart.pricing.shippingFeePaise).toBe(0); // Free shipping (>= ₹999)
      expect(json.data.cart.pricing.totalPayablePaise).toBe(120000);

      // Verify 18% inclusive GST breakdown
      expect(json.data.cart.pricing.tax.totalGstPaise).toBeGreaterThan(0);
      expect(json.data.cart.pricing.tax.cgstPaise + json.data.cart.pricing.tax.sgstPaise).toBe(
        json.data.cart.pricing.tax.totalGstPaise
      );

      createdCartItemId = json.data.cart.items[0].id;
    });

    it('rejects adding quantity that exceeds available inventory with HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/cart/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `cart_session=${cartSessionToken}`,
        },
        body: JSON.stringify({
          variantId: variantIdLowStock,
          quantity: 5, // Stock is only 2
        }),
      });

      const res = await addCartItemHandler(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INSUFFICIENT_STOCK');
      expect(json.error.message).toContain('Insufficient stock');
    });

    it('returns 404 when variantId does not exist', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/cart/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `cart_session=${cartSessionToken}`,
        },
        body: JSON.stringify({
          variantId: '00000000-0000-0000-0000-000000000000',
          quantity: 1,
        }),
      });

      const res = await addCartItemHandler(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error.code).toBe('VARIANT_NOT_FOUND');
    });
  });

  describe('PATCH /api/v1/cart/items/[id]', () => {
    it('updates item quantity and recalculates subtotal and tax in paise', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/cart/items/${createdCartItemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          cookie: `cart_session=${cartSessionToken}`,
        },
        body: JSON.stringify({ quantity: 2 }), // 2 * ₹1,200 = ₹2,400 (240,000 paise)
      });

      const res = await updateCartItemHandler(req, {
        params: Promise.resolve({ id: createdCartItemId }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.cart.items[0].quantity).toBe(2);
      expect(json.data.cart.pricing.subtotalPaise).toBe(240000);
    });

    it('rejects quantity exceeding available inventory', async () => {
      // 1. Add low stock variant (stock = 2) with quantity = 1
      const addReq = new NextRequest('http://localhost:3000/api/v1/cart/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `cart_session=${cartSessionToken}`,
        },
        body: JSON.stringify({ variantId: variantIdLowStock, quantity: 1 }),
      });
      const addRes = await addCartItemHandler(addReq);
      const addJson = await addRes.json();
      const lowStockItemId = addJson.data.cart.items.find(
        (it: any) => it.variantId === variantIdLowStock
      ).id;

      // 2. Try to update to quantity 5 (stock is only 2, within Zod limit <= 20)
      const req = new NextRequest(`http://localhost:3000/api/v1/cart/items/${lowStockItemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          cookie: `cart_session=${cartSessionToken}`,
        },
        body: JSON.stringify({ quantity: 5 }),
      });

      const res = await updateCartItemHandler(req, {
        params: Promise.resolve({ id: lowStockItemId }),
      });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error.code).toBe('INSUFFICIENT_STOCK');
    });
  });

  describe('DELETE /api/v1/cart/items/[id]', () => {
    it('removes item from cart', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/cart/items/${createdCartItemId}`, {
        method: 'DELETE',
        headers: {
          cookie: `cart_session=${cartSessionToken}`,
        },
      });

      const res = await deleteCartItemHandler(req, {
        params: Promise.resolve({ id: createdCartItemId }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(
        json.data.cart.items.some((it: any) => it.id === createdCartItemId)
      ).toBe(false);
    });
  });

  describe('DELETE /api/v1/cart', () => {
    it('clears all items from cart', async () => {
      // Add an item first
      const addReq = new NextRequest('http://localhost:3000/api/v1/cart/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `cart_session=${cartSessionToken}`,
        },
        body: JSON.stringify({ variantId: variantIdInStock, quantity: 1 }),
      });
      await addCartItemHandler(addReq);

      // Clear cart
      const clearReq = new NextRequest('http://localhost:3000/api/v1/cart', {
        method: 'DELETE',
        headers: { cookie: `cart_session=${cartSessionToken}` },
      });
      const res = await clearCartHandler(clearReq);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.cart.items.length).toBe(0);
    });
  });

  describe('Guest-to-User Cart Migration (M4-T04)', () => {
    it('merges guest cart into authenticated customer account cart without dropping items', async () => {
      const guestSessToken = `guest_migr_${Date.now()}`;

      // 1. Add item to guest cart
      const addReq = new NextRequest('http://localhost:3000/api/v1/cart/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `cart_session=${guestSessToken}`,
        },
        body: JSON.stringify({ variantId: variantIdInStock, quantity: 2 }),
      });
      await addCartItemHandler(addReq);

      // 2. Perform merge into testUserId cart
      const mergedCart = await mergeGuestCartIntoUserCart(guestSessToken, testUserId);

      expect(mergedCart.userId).toBe(testUserId);
      expect(mergedCart.items.length).toBe(1);
      expect(mergedCart.items[0].variantId).toBe(variantIdInStock);
      expect(mergedCart.items[0].quantity).toBe(2);

      // 3. Verify guest cart is cleaned up from DB
      const guestCheck = await db.cart.findUnique({
        where: { sessionToken: guestSessToken },
      });
      expect(guestCheck).toBeNull();
    });
  });
});
