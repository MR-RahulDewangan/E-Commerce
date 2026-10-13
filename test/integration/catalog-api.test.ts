import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { GET as listProductsHandler } from '@/app/api/v1/products/route';
import { GET as getProductBySlugHandler } from '@/app/api/v1/products/[slug]/route';
import { GET as listCategoriesHandler } from '@/app/api/v1/categories/route';

describe('Catalog REST API Integration Tests (Live PostgreSQL 16)', () => {
  const catSlug = `api-cat-${Date.now()}`;
  const pubSlug = `api-pub-${Date.now()}`;
  const draftSlug = `api-draft-${Date.now()}`;

  let createdCategoryId: string;
  let createdPublishedProductId: string;
  let createdDraftProductId: string;

  beforeAll(async () => {
    // 1. Create test category
    const cat = await db.category.create({
      data: {
        name: 'API Test Category',
        slug: catSlug,
        sortOrder: 1,
      },
    });
    createdCategoryId = cat.id;

    // 2. Create published product
    const pub = await db.product.create({
      data: {
        name: 'API Handloom Cotton Kurta',
        slug: pubSlug,
        description: 'Authentic pure cotton weave with traditional embroidery.',
        basePrice: 1599.0,
        isPublished: true,
        categoryId: createdCategoryId,
        images: {
          create: [{ url: 'https://cdn.example.in/kurta-api.jpg', sortOrder: 0 }],
        },
        variants: {
          create: [
            {
              sku: `API-SKU-M-${Date.now()}`,
              name: 'Medium',
              stockQuantity: 10,
              attributes: { size: 'M' },
            },
          ],
        },
      },
    });
    createdPublishedProductId = pub.id;

    // 3. Create draft product
    const draft = await db.product.create({
      data: {
        name: 'API Draft Unpublished Item',
        slug: draftSlug,
        description: 'Draft item that must not be returned via public API.',
        basePrice: 2499.0,
        isPublished: false,
        categoryId: createdCategoryId,
      },
    });
    createdDraftProductId = draft.id;
  });

  afterAll(async () => {
    if (createdPublishedProductId) {
      await db.product.deleteMany({ where: { id: createdPublishedProductId } });
    }
    if (createdDraftProductId) {
      await db.product.deleteMany({ where: { id: createdDraftProductId } });
    }
    if (createdCategoryId) {
      await db.category.deleteMany({ where: { id: createdCategoryId } });
    }
  });

  describe('GET /api/v1/products', () => {
    it('returns 200 with paginated product list conforming to specification', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products?category=${catSlug}&limit=10`
      );
      const res = await listProductsHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.items).toBeDefined();
      expect(json.data.items.length).toBe(1);
      expect(json.data.items[0].slug).toBe(pubSlug);
      expect(json.data.items[0].basePrice).toBe(1599);
      expect(json.data.pagination.page).toBe(1);
      expect(json.data.pagination.totalItems).toBe(1);
    });

    it('rejects invalid query parameters with HTTP 400 VALIDATION_ERROR', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/v1/products?minPrice=5000&maxPrice=1000'
      );
      const res = await listProductsHandler(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/products/[slug]', () => {
    it('returns 200 with full product document for published product', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/products/${pubSlug}`);
      const res = await getProductBySlugHandler(req, {
        params: Promise.resolve({ slug: pubSlug }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.product).toBeDefined();
      expect(json.data.product.slug).toBe(pubSlug);
      expect(json.data.product.basePrice).toBe(1599);
      expect(json.data.product.variants.length).toBe(1);
    });

    it('returns 404 PRODUCT_NOT_FOUND for unpublished draft product', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/products/${draftSlug}`);
      const res = await getProductBySlugHandler(req, {
        params: Promise.resolve({ slug: draftSlug }),
      });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('returns 404 PRODUCT_NOT_FOUND for non-existent slug', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/products/does-not-exist');
      const res = await getProductBySlugHandler(req, {
        params: Promise.resolve({ slug: 'does-not-exist' }),
      });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('PRODUCT_NOT_FOUND');
    });
  });

  describe('GET /api/v1/categories', () => {
    it('returns 200 with categories list', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/categories');
      const res = await listCategoriesHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.categories)).toBe(true);
      const found = json.data.categories.find((c: any) => c.slug === catSlug);
      expect(found).toBeDefined();
      expect(found.productCount).toBe(1);
    });
  });
});
