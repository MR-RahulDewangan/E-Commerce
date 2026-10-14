import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import {
  listCatalogProducts,
  getCatalogProductBySlug,
  getCatalogCategories,
} from '@/modules/catalog/queries';
import { invalidateCatalogCache } from '@/modules/catalog/cache';

describe('Catalog Query Integration Tests (Live PostgreSQL 16)', () => {
  const catSlug = `test-cat-${Date.now()}`;
  const publishedSlug = `test-pub-product-${Date.now()}`;
  const draftSlug = `test-draft-product-${Date.now()}`;

  let createdCategoryId: string;
  let createdPublishedProductId: string;
  let createdDraftProductId: string;

  beforeAll(async () => {
    // 1. Create test category
    const cat = await db.category.create({
      data: {
        name: 'Test Category For Catalog Query',
        slug: catSlug,
        sortOrder: 99,
      },
    });
    createdCategoryId = cat.id;

    await invalidateCatalogCache();

    // 2. Create published product with variants and image
    const pubProduct = await db.product.create({
      data: {
        name: 'Test Handloom Festive Kurta',
        slug: publishedSlug,
        description: 'Authentic pure cotton weave with traditional embroidery.',
        basePrice: 1299.00,
        isPublished: true,
        isFeatured: true,
        categoryId: createdCategoryId,
        images: {
          create: [
            {
              url: 'https://cdn.example.in/test-kurta.jpg',
              altText: 'Front view of kurta',
              sortOrder: 0,
            },
          ],
        },
        variants: {
          create: [
            {
              sku: `TEST-SKU-M-${Date.now()}`,
              name: 'Medium',
              stockQuantity: 15,
              attributes: { size: 'M', color: 'Blue' },
              weightGrams: 350,
            },
            {
              sku: `TEST-SKU-XL-${Date.now()}`,
              name: 'Extra Large',
              priceOverride: 1499.00,
              stockQuantity: 0,
              attributes: { size: 'XL', color: 'Blue' },
              weightGrams: 400,
            },
          ],
        },
      },
    });
    createdPublishedProductId = pubProduct.id;

    // 3. Create unpublished (draft) product
    const draftProduct = await db.product.create({
      data: {
        name: 'Test Unpublished Draft Item',
        slug: draftSlug,
        description: 'Draft item that should not be visible publicly.',
        basePrice: 2999.00,
        isPublished: false,
        isFeatured: false,
        categoryId: createdCategoryId,
      },
    });
    createdDraftProductId = draftProduct.id;
  });

  afterAll(async () => {
    // Clean up created records
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

  describe('listCatalogProducts against Live Database', () => {
    it('returns published product and excludes draft products', async () => {
      const result = await listCatalogProducts({
        category: catSlug,
      });

      expect(result.pagination.totalItems).toBe(1);
      expect(result.items.length).toBe(1);
      expect(result.items[0].slug).toBe(publishedSlug);
      expect(result.items[0].name).toBe('Test Handloom Festive Kurta');
      expect(result.items[0].basePrice).toBe(1299);
      expect(result.items[0].inStock).toBe(true);
      expect(result.items[0].totalStock).toBe(15);
      expect(result.items[0].variantCount).toBe(2);
      expect(result.items[0].primaryImage).toBe('https://cdn.example.in/test-kurta.jpg');
    });

    it('filters products by keyword search', async () => {
      const result = await listCatalogProducts({
        category: catSlug,
        search: 'embroidery',
      });

      expect(result.items.length).toBe(1);
      expect(result.items[0].slug).toBe(publishedSlug);
    });

    it('filters products by price range', async () => {
      // Matching price range (1299 is between 1000 and 1500)
      const matching = await listCatalogProducts({
        category: catSlug,
        minPrice: 1000,
        maxPrice: 1500,
      });
      expect(matching.items.length).toBe(1);

      // Outside price range
      const nonMatching = await listCatalogProducts({
        category: catSlug,
        minPrice: 100,
        maxPrice: 500,
      });
      expect(nonMatching.items.length).toBe(0);
    });

    it('handles non-existent category gracefully', async () => {
      const result = await listCatalogProducts({
        category: 'completely-non-existent-category-slug',
      });

      expect(result.items.length).toBe(0);
      expect(result.pagination.totalItems).toBe(0);
    });
  });

  describe('getCatalogProductBySlug against Live Database', () => {
    it('retrieves detailed published product with variants and images', async () => {
      const product = await getCatalogProductBySlug(publishedSlug);

      expect(product).not.toBeNull();
      expect(product?.slug).toBe(publishedSlug);
      expect(product?.basePrice).toBe(1299);
      expect(product?.variants.length).toBe(2);

      const mVariant = product?.variants.find((v) => v.name === 'Medium');
      expect(mVariant).toBeDefined();
      expect(mVariant?.effectivePrice).toBe(1299); // inherits basePrice
      expect(mVariant?.inStock).toBe(true);

      const xlVariant = product?.variants.find((v) => v.name === 'Extra Large');
      expect(xlVariant).toBeDefined();
      expect(xlVariant?.effectivePrice).toBe(1499); // overrides basePrice
      expect(xlVariant?.inStock).toBe(false); // stock is 0
    });

    it('returns null for unpublished (draft) product even if slug matches', async () => {
      const product = await getCatalogProductBySlug(draftSlug);
      expect(product).toBeNull();
    });

    it('returns null for unknown product slug', async () => {
      const product = await getCatalogProductBySlug('nonexistent-product-slug');
      expect(product).toBeNull();
    });
  });

  describe('getCatalogCategories against Live Database', () => {
    it('accurately counts published products excluding drafts', async () => {
      const categories = await getCatalogCategories({ skipCache: true });
      const testCat = categories.find((c) => c.slug === catSlug);

      expect(testCat).toBeDefined();
      // Should count only 1 product (the published one), ignoring the draft
      expect(testCat?.productCount).toBe(1);
    });
  });
});
