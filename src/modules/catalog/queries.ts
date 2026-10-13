import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import {
  productListQuerySchema,
  productSlugSchema,
  ProductListQueryParams,
} from './validation';
import {
  CatalogListResult,
  CatalogProductListItem,
  CatalogProductDetail,
  CatalogCategorySummary,
  CatalogVariantDetail,
  CatalogImageDetail,
} from './types';

export type {
  CatalogListResult,
  CatalogProductListItem,
  CatalogProductDetail,
  CatalogCategorySummary,
  CatalogVariantDetail,
  CatalogImageDetail,
};
export type ProductSortOption = 'newest' | 'price_asc' | 'price_desc';

/**
 * Retrieves a paginated list of published products according to search, category,
 * price filtering, and sorting parameters.
 */
export async function listCatalogProducts(
  rawParams: ProductListQueryParams = {}
): Promise<CatalogListResult> {
  const params = productListQuerySchema.parse(rawParams);

  const { page, limit, sort, category, search, minPrice, maxPrice, isFeatured } = params;

  // 1. Build Prisma Where Clause
  // Strictly enforce isPublished: true so draft/unpublished items are never exposed
  const where: Prisma.ProductWhereInput = {
    isPublished: true,
  };

  if (category) {
    where.category = {
      slug: category,
    };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.basePrice = {};
    if (minPrice !== undefined) {
      where.basePrice.gte = minPrice;
    }
    if (maxPrice !== undefined) {
      where.basePrice.lte = maxPrice;
    }
  }

  if (isFeatured !== undefined) {
    where.isFeatured = isFeatured;
  }

  // 2. Build Prisma OrderBy Clause
  let orderBy: Prisma.ProductOrderByWithRelationInput;
  switch (sort) {
    case 'price_asc':
      orderBy = { basePrice: 'asc' };
      break;
    case 'price_desc':
      orderBy = { basePrice: 'desc' };
      break;
    case 'newest':
    default:
      orderBy = { createdAt: 'desc' };
      break;
  }

  // 3. Execute count and findMany in parallel to prevent N+1 queries
  const skip = (page - 1) * limit;

  const [totalItems, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
          select: {
            url: true,
          },
        },
        variants: {
          select: {
            stockQuantity: true,
          },
        },
      },
    }),
  ]);

  // 4. Transform results into typed format
  const items: CatalogProductListItem[] = products.map((prod) => {
    const totalStock = prod.variants.reduce((acc, v) => acc + v.stockQuantity, 0);
    const inStock = totalStock > 0;
    const primaryImage = prod.images.length > 0 ? prod.images[0].url : null;

    return {
      id: prod.id,
      name: prod.name,
      slug: prod.slug,
      description: prod.description,
      basePrice: Number(prod.basePrice),
      category: prod.category,
      primaryImage,
      inStock,
      totalStock,
      variantCount: prod.variants.length,
      isFeatured: prod.isFeatured,
      createdAt: prod.createdAt.toISOString(),
    };
  });

  const totalPages = Math.ceil(totalItems / limit);

  return {
    items,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Retrieves full details for a single published product by slug,
 * including all variants, attributes, images, and live inventory status.
 */
export async function getCatalogProductBySlug(
  rawSlug: string
): Promise<CatalogProductDetail | null> {
  const slug = productSlugSchema.parse(rawSlug);

  const product = await db.product.findFirst({
    where: {
      slug,
      isPublished: true, // Never return draft products to public callers
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      images: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          url: true,
          altText: true,
          sortOrder: true,
        },
      },
      variants: {
        orderBy: { name: 'asc' },
        select: {
          id: true,
          sku: true,
          name: true,
          priceOverride: true,
          stockQuantity: true,
          attributes: true,
          weightGrams: true,
        },
      },
    },
  });

  if (!product) {
    return null;
  }

  const basePriceNum = Number(product.basePrice);
  const totalStock = product.variants.reduce((acc, v) => acc + v.stockQuantity, 0);

  const variants = product.variants.map((v) => {
    const priceOverrideNum = v.priceOverride !== null ? Number(v.priceOverride) : null;
    const effectivePrice = priceOverrideNum !== null ? priceOverrideNum : basePriceNum;

    return {
      id: v.id,
      sku: v.sku,
      name: v.name,
      priceOverride: priceOverrideNum,
      effectivePrice,
      stockQuantity: v.stockQuantity,
      inStock: v.stockQuantity > 0,
      attributes: (v.attributes as Record<string, any>) || {},
      weightGrams: v.weightGrams,
    };
  });

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    basePrice: basePriceNum,
    isFeatured: product.isFeatured,
    category: product.category,
    images: product.images,
    variants,
    totalStock,
    inStock: totalStock > 0,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export interface CatalogCategoryWithCount extends CatalogCategorySummary {
  imageUrl: string | null;
  sortOrder: number;
  productCount: number;
}

/**
 * Retrieves all published categories with their active product counts.
 */
export async function getCatalogCategories(): Promise<CatalogCategoryWithCount[]> {
  const categories = await db.category.findMany({
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      sortOrder: true,
      _count: {
        select: {
          products: {
            where: { isPublished: true },
          },
        },
      },
    },
  });

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    imageUrl: cat.imageUrl,
    sortOrder: cat.sortOrder,
    productCount: cat._count.products,
  }));
}

export const queryProducts = listCatalogProducts;
export const getProductBySlug = getCatalogProductBySlug;
