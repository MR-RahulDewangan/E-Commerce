import { describe, it, expect, afterAll } from 'vitest';
import { db } from '@/lib/db';

describe('Database Connectivity & Schema Integrity', () => {
  afterAll(async () => {
    await db.$disconnect();
  });

  it('connects to live PostgreSQL database and executes queries', async () => {
    const result = await db.$queryRaw<Array<{ result: number }>>`SELECT 1 + 1 AS result;`;
    expect(result).toHaveLength(1);
    expect(result[0].result).toBe(2);
  });

  it('verifies all expected application tables are accessible via Prisma', async () => {
    const [userCount, productCount, orderCount, categoryCount] = await Promise.all([
      db.user.count(),
      db.product.count(),
      db.order.count(),
      db.category.count(),
    ]);

    expect(userCount).toBeGreaterThanOrEqual(0);
    expect(productCount).toBeGreaterThanOrEqual(0);
    expect(orderCount).toBeGreaterThanOrEqual(0);
    expect(categoryCount).toBeGreaterThanOrEqual(0);
  });

  it('can create and delete a record to verify transaction and table constraints', async () => {
    const testCategory = await db.category.create({
      data: {
        name: 'Test Category',
        slug: 'test-category-' + Date.now(),
      },
    });

    expect(testCategory.id).toBeDefined();

    const fetched = await db.category.findUnique({
      where: { id: testCategory.id },
    });
    expect(fetched?.name).toBe('Test Category');

    await db.category.delete({
      where: { id: testCategory.id },
    });

    const deleted = await db.category.findUnique({
      where: { id: testCategory.id },
    });
    expect(deleted).toBeNull();
  });
});
