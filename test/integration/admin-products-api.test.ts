import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { createSessionToken } from '@/modules/auth/session';
import { POST as createProductHandler, GET as listProductsHandler } from '@/app/api/v1/admin/products/route';
import { GET as getProductHandler, PUT as updateProductHandler, DELETE as deleteProductHandler } from '@/app/api/v1/admin/products/[id]/route';
import { GET as storefrontGetProductHandler } from '@/app/api/v1/products/[slug]/route';

describe('Admin Product & Variant CRUD Integration Tests (Live PostgreSQL 16)', () => {
  let adminToken: string;
  let categoryId: string;
  let createdProductId: string;
  const uniquePrefix = `adm_prod_${Date.now()}`;

  beforeAll(async () => {
    adminToken = await createSessionToken({
      id: 'usr_admin_crud',
      email: 'admin.crud@example.in',
      role: 'ADMIN',
      firstName: 'Admin',
      lastName: 'User',
    });

    const category = await db.category.create({
      data: {
        name: 'Admin Test Category',
        slug: `adm-cat-${Date.now()}`,
      },
    });
    categoryId = category.id;
  });

  afterAll(async () => {
    if (createdProductId) {
      await db.productImage.deleteMany({ where: { productId: createdProductId } });
      await db.productVariant.deleteMany({ where: { productId: createdProductId } });
      await db.product.deleteMany({ where: { id: createdProductId } });
    }
    if (categoryId) {
      await db.category.deleteMany({ where: { id: categoryId } });
    }
  });

  it('creates a new published product with 2 multi-variants and images via POST /api/v1/admin/products', async () => {
    const slug = `artisan-pashmina-${uniquePrefix}`.replace(/_/g, '-');
    const payload = {
      name: `Artisan Pashmina Shawl ${uniquePrefix}`,
      slug,
      categoryId,
      description: 'Authentic 100% fine Kashmiri wool pashmina shawl handcrafted by master artisans.',
      basePrice: 4999.0,
      isPublished: true,
      isFeatured: true,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&q=80&w=800',
          altText: 'Kashmiri Pashmina Shawl',
        },
      ],
      variants: [
        {
          sku: `PASH-MAROON-${uniquePrefix}`,
          name: 'Classic Maroon',
          priceOverride: null,
          stockQuantity: 15,
          attributes: { color: 'Maroon', weave: 'Diamond' },
        },
        {
          sku: `PASH-GOLD-${uniquePrefix}`,
          name: 'Royal Gold Embroidery',
          priceOverride: 5499.0, // ₹500 override
          stockQuantity: 8,
          attributes: { color: 'Gold', weave: 'Zari Border' },
        },
      ],
    };

    const req = new NextRequest('http://localhost:3000/api/v1/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(payload),
    });

    const res = await createProductHandler(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    createdProductId = body.data.id;

    expect(body.success).toBe(true);
    expect(body.data.name).toBe(payload.name);
    expect(body.data.slug).toBe(payload.slug);
    expect(body.data.variants.length).toBe(2);
    expect(body.data.images.length).toBe(1);
  });

  it('immediately surfaces the created product and its 2 variants in the customer storefront catalog', async () => {
    const slug = `artisan-pashmina-${uniquePrefix}`.replace(/_/g, '-');
    const req = new NextRequest(`http://localhost:3000/api/v1/products/${slug}`);

    const res = await storefrontGetProductHandler(req, {
      params: Promise.resolve({ slug }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.product.id).toBe(createdProductId);
    expect(body.data.product.basePrice).toBe(4999.0);
    expect(body.data.product.variants.length).toBe(2);

    const goldVariant = body.data.product.variants.find((v: any) => v.name.includes('Gold'));
    expect(goldVariant).toBeDefined();
    expect(goldVariant.effectivePrice).toBe(5499.0);
    expect(goldVariant.stockQuantity).toBe(8);
  });

  it('retrieves the full product via GET /api/v1/admin/products/:id', async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/admin/products/${createdProductId}`, {
      headers: { authorization: `Bearer ${adminToken}` },
    });

    const res = await getProductHandler(req, {
      params: Promise.resolve({ id: createdProductId }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(createdProductId);
    expect(body.data.variants.length).toBe(2);
  });

  it('updates product pricing and variant details via PUT /api/v1/admin/products/:id', async () => {
    const updatePayload = {
      basePrice: 5299.0,
      description: 'Updated description with enhanced dry clean instructions.',
    };

    const req = new NextRequest(`http://localhost:3000/api/v1/admin/products/${createdProductId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(updatePayload),
    });

    const res = await updateProductHandler(req, {
      params: Promise.resolve({ id: createdProductId }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.basePrice).toBe(5299.0);
    expect(body.data.description).toBe(updatePayload.description);
  });

  it('rejects duplicate SKU creation with HTTP 409', async () => {
    const duplicatePayload = {
      name: 'Another Shawl',
      categoryId,
      description: 'Another item reusing an active SKU.',
      basePrice: 1999.0,
      variants: [
        {
          sku: `PASH-MAROON-${uniquePrefix}`, // Duplicate of existing
          name: 'Conflicting Variant',
          stockQuantity: 5,
        },
      ],
    };

    const req = new NextRequest('http://localhost:3000/api/v1/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(duplicatePayload),
    });

    const res = await createProductHandler(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe('SKU_CONFLICT');
  });

  it('unpublishes or deletes product via DELETE /api/v1/admin/products/:id', async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/admin/products/${createdProductId}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    const res = await deleteProductHandler(req, {
      params: Promise.resolve({ id: createdProductId }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify product no longer exists
    const checkDb = await db.product.findUnique({
      where: { id: createdProductId },
    });
    expect(checkDb).toBeNull();
    createdProductId = ''; // cleared for afterAll
  });
});
