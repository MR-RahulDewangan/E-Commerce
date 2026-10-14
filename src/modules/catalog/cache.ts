import { redis } from '@/lib/redis';
import type { CatalogCategoryWithCount, CatalogListResult } from './queries';

const CACHE_KEYS = {
  CATEGORIES: 'catalog:categories:all',
  POPULAR_PRODUCTS: 'catalog:products:popular',
  FEATURED_PRODUCTS: 'catalog:products:featured',
  PRODUCT_PREFIX: 'catalog:products:',
};

const DEFAULT_TTL_SECONDS = 3600; // 1 hour TTL

/**
 * Retrieves cached categories tree from Redis if available.
 */
export async function getCachedCategories(): Promise<CatalogCategoryWithCount[] | null> {
  if (!redis) return null;
  try {
    const data = await redis.get(CACHE_KEYS.CATEGORIES);
    if (!data) return null;
    return JSON.parse(data) as CatalogCategoryWithCount[];
  } catch (error) {
    console.warn('[Cache] Error retrieving cached categories:', error);
    return null;
  }
}

/**
 * Stores categories in Redis with TTL.
 */
export async function setCachedCategories(
  categories: CatalogCategoryWithCount[],
  ttlSeconds = DEFAULT_TTL_SECONDS
): Promise<void> {
  if (!redis) return;
  try {
    await redis.setex(CACHE_KEYS.CATEGORIES, ttlSeconds, JSON.stringify(categories));
  } catch (error) {
    console.warn('[Cache] Error saving categories to cache:', error);
  }
}

/**
 * Retrieves cached featured products from Redis if available.
 */
export async function getCachedFeaturedProducts(): Promise<CatalogListResult | null> {
  if (!redis) return null;
  try {
    const data = await redis.get(CACHE_KEYS.FEATURED_PRODUCTS);
    if (!data) return null;
    return JSON.parse(data) as CatalogListResult;
  } catch (error) {
    console.warn('[Cache] Error retrieving cached featured products:', error);
    return null;
  }
}

/**
 * Stores featured products in Redis with TTL.
 */
export async function setCachedFeaturedProducts(
  result: CatalogListResult,
  ttlSeconds = DEFAULT_TTL_SECONDS
): Promise<void> {
  if (!redis) return;
  try {
    await redis.setex(CACHE_KEYS.FEATURED_PRODUCTS, ttlSeconds, JSON.stringify(result));
  } catch (error) {
    console.warn('[Cache] Error saving featured products to cache:', error);
  }
}

/**
 * Invalidates category and catalog caches upon product or category mutations.
 */
export async function invalidateCatalogCache(): Promise<void> {
  if (!redis) return;
  try {
    const keys = [
      CACHE_KEYS.CATEGORIES,
      CACHE_KEYS.POPULAR_PRODUCTS,
      CACHE_KEYS.FEATURED_PRODUCTS,
    ];
    await redis.del(...keys);
  } catch (error) {
    console.warn('[Cache] Error invalidating catalog cache:', error);
  }
}
