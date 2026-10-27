import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import { getCatalogCategories } from '@/modules/catalog/queries';
import {
  getCachedCategories,
  setCachedCategories,
  invalidateCatalogCache,
} from '@/modules/catalog/cache';
import { redis } from '@/lib/redis';

describe('Catalog Caching Layer (Redis Integration Tests)', () => {
  let isRedisAvailable = false;

  beforeAll(async () => {
    try {
      if (redis) {
        const pingRes = await Promise.race([
          redis.ping(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000)),
        ]);
        isRedisAvailable = pingRes === 'PONG';
      }
    } catch {
      isRedisAvailable = false;
    }
  });

  beforeEach(async () => {
    if (isRedisAvailable) {
      await invalidateCatalogCache();
    }
  });

  afterAll(async () => {
    if (isRedisAvailable) {
      await invalidateCatalogCache();
    }
  });

  it('stores and retrieves category hierarchy from Redis cache', async (ctx) => {
    if (!isRedisAvailable) {
      ctx.skip();
      return;
    }

    const mockCategories = [
      {
        id: 'cat-cache-test-1',
        name: 'Haute Horlogerie',
        slug: 'haute-horlogerie',
        imageUrl: null,
        sortOrder: 1,
        productCount: 5,
      },
    ];

    // Store in cache
    await setCachedCategories(mockCategories, 60);

    // Retrieve from cache
    const cached = await getCachedCategories();
    expect(cached).not.toBeNull();
    expect(cached?.length).toBe(1);
    expect(cached?.[0].slug).toBe('haute-horlogerie');
  });

  it('populates cache on getCatalogCategories and serves subsequent queries from cache', async (ctx) => {
    // 1. Initial query populates cache from database
    const categoriesFromDb = await getCatalogCategories();
    expect(categoriesFromDb.length).toBeGreaterThan(0);

    if (!isRedisAvailable) {
      ctx.skip();
      return;
    }

    // 2. Verify Redis now holds the key
    const inCache = await getCachedCategories();
    expect(inCache).not.toBeNull();
    expect(inCache?.length).toBe(categoriesFromDb.length);

    // 3. Invalidate cache
    await invalidateCatalogCache();
    const afterInvalidation = await getCachedCategories();
    expect(afterInvalidation).toBeNull();
  });

  it('clears Redis keys when invalidateCatalogCache is called', async (ctx) => {
    if (!isRedisAvailable) {
      ctx.skip();
      return;
    }

    await setCachedCategories([
      {
        id: 'cat-temp',
        name: 'Temp Category',
        slug: 'temp-category',
        imageUrl: null,
        sortOrder: 0,
        productCount: 0,
      },
    ]);

    expect(await getCachedCategories()).not.toBeNull();
    await invalidateCatalogCache();
    expect(await getCachedCategories()).toBeNull();
  });
});
