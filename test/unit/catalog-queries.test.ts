import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import {
  listCatalogProducts,
  getCatalogProductBySlug,
  getCatalogCategories,
} from '@/modules/catalog/queries';
import { productListQuerySchema } from '@/modules/catalog/validation';
import { Decimal } from '@prisma/client/runtime/library';

vi.mock('@/lib/db', () => ({
  db: {
    product: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
    },
  },
}));

describe('Catalog Query Validation & Logic (Unit Tests with Mocked DB)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validation Schemas', () => {
    it('sets default values for page (1), limit (24), and sort (newest)', () => {
      const parsed = productListQuerySchema.parse({});
      expect(parsed.page).toBe(1);
      expect(parsed.limit).toBe(24);
      expect(parsed.sort).toBe('newest');
    });

    it('enforces maximum limit cap of 100', () => {
      const result = productListQuerySchema.safeParse({ limit: 150 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('cannot exceed 100');
      }
    });

    it('rejects maxPrice less than minPrice', () => {
      const result = productListQuerySchema.safeParse({
        minPrice: 1000,
        maxPrice: 500,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('greater than or equal to minPrice');
      }
    });

    it('accepts valid price range and category slug', () => {
      const result = productListQuerySchema.safeParse({
        category: 'ethnic-wear',
        minPrice: 500,
        maxPrice: 2000,
        sort: 'price_asc',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('listCatalogProducts', () => {
    it('queries published products with pagination and calculates total stock', async () => {
      vi.mocked(db.product.count).mockResolvedValue(1);
      vi.mocked(db.product.findMany).mockResolvedValue([
        {
          id: 'prod_1',
          name: 'Handloom Cotton Kurta',
          slug: 'handloom-cotton-kurta',
          description: '100% pure cotton',
          basePrice: new Decimal('1499.00'),
          isPublished: true,
          isFeatured: true,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
          categoryId: 'cat_1',
          category: { id: 'cat_1', name: 'Kurtas', slug: 'kurtas' },
          images: [{ url: 'https://cdn.example.in/kurta-1.jpg' }],
          variants: [{ stockQuantity: 5 }, { stockQuantity: 3 }],
        } as any,
      ]);

      const result = await listCatalogProducts({ page: 1, limit: 10 });

      expect(db.product.count).toHaveBeenCalledWith({
        where: { isPublished: true },
      });
      expect(db.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isPublished: true },
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'desc' },
        })
      );

      expect(result.items.length).toBe(1);
      expect(result.items[0].name).toBe('Handloom Cotton Kurta');
      expect(result.items[0].basePrice).toBe(1499);
      expect(result.items[0].inStock).toBe(true);
      expect(result.items[0].totalStock).toBe(8);
      expect(result.items[0].primaryImage).toBe('https://cdn.example.in/kurta-1.jpg');
      expect(result.pagination.totalPages).toBe(1);
    });

    it('applies category and price filters to where clause', async () => {
      vi.mocked(db.product.count).mockResolvedValue(0);
      vi.mocked(db.product.findMany).mockResolvedValue([]);

      await listCatalogProducts({
        category: 'sarees',
        minPrice: 2000,
        maxPrice: 8000,
        sort: 'price_desc',
      });

      expect(db.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isPublished: true,
            category: { slug: 'sarees' },
            basePrice: { gte: 2000, lte: 8000 },
          },
          orderBy: { basePrice: 'desc' },
        })
      );
    });
  });

  describe('getCatalogProductBySlug', () => {
    it('returns formatted product details with variant effective prices', async () => {
      vi.mocked(db.product.findFirst).mockResolvedValue({
        id: 'prod_2',
        name: 'Silk Blend Sherwani',
        slug: 'silk-blend-sherwani',
        description: 'Wedding festive wear',
        basePrice: new Decimal('4999.00'),
        isPublished: true,
        isFeatured: false,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        categoryId: 'cat_2',
        category: { id: 'cat_2', name: 'Festive', slug: 'festive' },
        images: [{ id: 'img_1', url: 'https://cdn.example.in/sherwani.jpg', altText: 'Front', sortOrder: 0 }],
        variants: [
          {
            id: 'var_1',
            sku: 'SHER-M',
            name: 'Medium',
            priceOverride: null, // Inherits base price 4999
            stockQuantity: 4,
            attributes: { size: 'M' },
            weightGrams: 800,
          },
          {
            id: 'var_2',
            sku: 'SHER-XL',
            name: 'Extra Large',
            priceOverride: new Decimal('5499.00'), // Overrides base price
            stockQuantity: 0,
            attributes: { size: 'XL' },
            weightGrams: 900,
          },
        ],
      } as any);

      const product = await getCatalogProductBySlug('silk-blend-sherwani');

      expect(product).not.toBeNull();
      expect(product?.name).toBe('Silk Blend Sherwani');
      expect(product?.basePrice).toBe(4999);
      expect(product?.variants[0].effectivePrice).toBe(4999);
      expect(product?.variants[0].inStock).toBe(true);
      expect(product?.variants[1].effectivePrice).toBe(5499);
      expect(product?.variants[1].inStock).toBe(false);
      expect(product?.totalStock).toBe(4);
    });

    it('returns null when product does not exist or is unpublished', async () => {
      vi.mocked(db.product.findFirst).mockResolvedValue(null);

      const product = await getCatalogProductBySlug('nonexistent-product');
      expect(product).toBeNull();
      expect(db.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: 'nonexistent-product', isPublished: true },
        })
      );
    });
  });

  describe('getCatalogCategories', () => {
    it('returns categories with published product counts', async () => {
      vi.mocked(db.category.findMany).mockResolvedValue([
        {
          id: 'cat_1',
          name: 'Ethnic Wear',
          slug: 'ethnic-wear',
          imageUrl: 'https://cdn.example.in/cat1.jpg',
          sortOrder: 1,
          _count: { products: 12 },
        } as any,
      ]);

      const categories = await getCatalogCategories();
      expect(categories.length).toBe(1);
      expect(categories[0].name).toBe('Ethnic Wear');
      expect(categories[0].productCount).toBe(12);
    });
  });
});
