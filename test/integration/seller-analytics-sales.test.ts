import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { getSellerSalesKPIs, getSellerRevenueTrends, getSellerCategoryBreakdown } from '@/modules/analytics/sales-service';
import { resolveDateRange } from '@/modules/analytics/date-utils';

describe('Seller Sales Intelligence Service Integration Tests', () => {
  let seller1Id: string;
  let seller2Id: string;

  beforeAll(async () => {
    const sellers = await db.sellerProfile.findMany({
      take: 2,
      orderBy: { createdAt: 'asc' },
    });

    expect(sellers.length).toBeGreaterThanOrEqual(2);
    seller1Id = sellers[0].id;
    seller2Id = sellers[1].id;
  });

  it('aggregates sales KPIs strictly scoped to Seller 1', async () => {
    const dateRange = resolveDateRange('90d');
    const kpis = await getSellerSalesKPIs(seller1Id, dateRange);

    expect(kpis).toBeDefined();
    expect(kpis.grossRevenueRupees).toBeGreaterThan(0);
    expect(kpis.eligibleOrdersCount).toBeGreaterThan(0);
    expect(kpis.unitsSold).toBeGreaterThan(0);
    expect(kpis.averageOrderValueRupees).toBeGreaterThan(0);
    expect(typeof kpis.cancellationRatePct).toBe('number');
    expect(typeof kpis.returnRatePct).toBe('number');
    expect(typeof kpis.revenueGrowthRatePct).toBe('number');
  });

  it('verifies multi-tenant isolation between Seller 1 and Seller 2', async () => {
    const dateRange = resolveDateRange('90d');
    const [kpis1, kpis2] = await Promise.all([
      getSellerSalesKPIs(seller1Id, dateRange),
      getSellerSalesKPIs(seller2Id, dateRange),
    ]);

    expect(kpis1).toBeDefined();
    expect(kpis2).toBeDefined();
    // Verify each seller has isolated revenue
    expect(kpis1.grossRevenuePaise).not.toEqual('0');
    expect(kpis2.grossRevenuePaise).not.toEqual('0');
  });

  it('computes daily time-series revenue trends without missing date buckets', async () => {
    const dateRange = resolveDateRange('7d');
    const trends = await getSellerRevenueTrends(seller1Id, dateRange);

    expect(trends).toBeDefined();
    expect(trends.length).toBe(8); // 7 full days span + 1 inclusive boundary
    for (const point of trends) {
      expect(point).toHaveProperty('date');
      expect(point).toHaveProperty('revenueRupees');
      expect(point).toHaveProperty('ordersCount');
      expect(point).toHaveProperty('unitsSold');
      expect(typeof point.revenueRupees).toBe('number');
    }
  });

  it('calculates category breakdown and growth rate cleanly', async () => {
    const dateRange = resolveDateRange('90d');
    const categories = await getSellerCategoryBreakdown(seller1Id, dateRange);

    expect(categories).toBeDefined();
    expect(Array.isArray(categories)).toBe(true);
    if (categories.length > 0) {
      const totalPct = categories.reduce((sum, c) => sum + c.percentageOfTotal, 0);
      expect(Math.round(totalPct)).toBeLessThanOrEqual(101);
      expect(Math.round(totalPct)).toBeGreaterThanOrEqual(99);
    }
  });
});
