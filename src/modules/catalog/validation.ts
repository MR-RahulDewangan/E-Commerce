import { z } from 'zod';

export const productListQuerySchema = z
  .object({
    category: z.string().trim().min(1).optional(),
    search: z.string().trim().max(100).optional(),
    minPrice: z.coerce.number().min(0, 'minPrice must be non-negative').optional(),
    maxPrice: z.coerce.number().min(0, 'maxPrice must be non-negative').optional(),
    sort: z
      .enum(['newest', 'price_asc', 'price_desc'], {
        errorMap: () => ({ message: "sort must be one of: 'newest', 'price_asc', 'price_desc'" }),
      })
      .default('newest'),
    page: z.coerce.number().int().min(1, 'page must be at least 1').default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1, 'limit must be at least 1')
      .max(100, 'limit cannot exceed 100')
      .default(24),
    isFeatured: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((val) => val === true || val === 'true')
      .optional(),
  })
  .refine(
    (data) => {
      if (data.minPrice !== undefined && data.maxPrice !== undefined) {
        return data.maxPrice >= data.minPrice;
      }
      return true;
    },
    {
      message: 'maxPrice must be greater than or equal to minPrice',
      path: ['maxPrice'],
    }
  );

export type ProductListQueryParams = Record<string, unknown>;
export type ParsedProductListQueryParams = z.infer<typeof productListQuerySchema>;

export const productSlugSchema = z
  .string({ required_error: 'Product slug is required' })
  .trim()
  .min(1, 'Product slug cannot be empty')
  .max(150, 'Product slug cannot exceed 150 characters');

export const adminCreateProductSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(255),
  slug: z.string().trim().min(2).max(255).optional(),
  categoryId: z.string().uuid('Invalid category ID'),
  description: z.string().trim().min(5, 'Description must be at least 5 characters'),
  basePrice: z.coerce.number().min(0, 'Base price must be non-negative'),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  images: z
    .array(
      z.object({
        url: z.string().url('Must be a valid URL'),
        altText: z.string().optional(),
      })
    )
    .default([]),
  variants: z
    .array(
      z.object({
        sku: z.string().trim().min(2, 'SKU must be at least 2 characters').max(100),
        name: z.string().trim().min(1, 'Variant name is required').max(150),
        priceOverride: z.coerce.number().min(0).nullable().optional(),
        stockQuantity: z.coerce.number().int().min(0, 'Stock cannot be negative').default(0),
        attributes: z.record(z.any()).default({}),
        weightGrams: z.coerce.number().int().min(0).default(0),
      })
    )
    .min(1, 'At least one variant is required'),
});

export const adminUpdateProductSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  slug: z.string().trim().min(2).max(255).optional(),
  categoryId: z.string().uuid('Invalid category ID').optional(),
  description: z.string().trim().min(5).optional(),
  basePrice: z.coerce.number().min(0).optional(),
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  images: z
    .array(
      z.object({
        url: z.string().url('Must be a valid URL'),
        altText: z.string().optional(),
      })
    )
    .optional(),
  variants: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        sku: z.string().trim().min(2).max(100),
        name: z.string().trim().min(1).max(150),
        priceOverride: z.coerce.number().min(0).nullable().optional(),
        stockQuantity: z.coerce.number().int().min(0).default(0),
        attributes: z.record(z.any()).default({}),
        weightGrams: z.coerce.number().int().min(0).default(0),
      })
    )
    .optional(),
});
