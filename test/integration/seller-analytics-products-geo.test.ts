import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { resolveDateRange } from '@/modules/analytics/date-utils';
import {
  getSellerProductPerformance,
  getSellerProductAffinityRules,
} from '@/modules/analytics/product-analytics-service';
import {
  getSellerGeographicAnalytics,
  getSellerMarketBenchmarking,
} from '@/modules/analytics/geo-benchmark-service';

describe('Seller Product Performance, Affinity & Geographic Analytics Integration Tests', () => {
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

  it('aggregates product-level performance, turnover, and profitability', async () => {
    const dateRange = resolveDateRange('90d');
    const { products, inventorySummary } = await getSellerProductPerformance(seller1Id, dateRange);

    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBeGreaterThan(0);

    for (const prod of products) {
      expect(prod).toHaveProperty('productId');
      expect(prod).toHaveProperty('productName');
      expect(prod).toHaveProperty('sku');
      expect(prod).toHaveProperty('unitsSold');
      expect(prod).toHaveProperty('revenueRupees');
      expect(prod).toHaveProperty('averageSellingPriceRupees');
      expect(prod).toHaveProperty('stockQuantity');
      expect(prod).toHaveProperty('stockRisk');
      expect(['HEALTHY', 'LOW_STOCK', 'OVERSTOCK', 'OUT_OF_STOCK']).toContain(prod.stockRisk);
    }

    expect(inventorySummary).toBeDefined();
    expect(inventorySummary.totalInventoryUnits).toBeGreaterThan(0);
    if (inventorySummary.isCostDataConfigured) {
      expect(inventorySummary.totalInventoryValueRupees).toBeGreaterThan(0);
      expect(typeof inventorySummary.grossMarginReturnOnInvestment).toBe('number');
    }
  });

  it('computes product basket association rules (Apriori)', async () => {
    const affinity = await getSellerProductAffinityRules(seller1Id);

    expect(affinity).toBeDefined();
    expect(affinity.analyzedOrdersCount).toBeGreaterThan(0);
    expect(Array.isArray(affinity.rules)).toBe(true);

    for (const rule of affinity.rules) {
      expect(rule).toHaveProperty('support');
      expect(rule).toHaveProperty('confidence');
      expect(rule).toHaveProperty('lift');
      expect(rule.lift).toBeGreaterThanOrEqual(1.0);
      expect(rule.confidence).toBeGreaterThan(0);
      expect(rule).toHaveProperty('recommendedBundleLabel');
    }
  });

  it('aggregates geographic sales while strictly preserving customer privacy', async () => {
    const dateRange = resolveDateRange('90d');
    const geo = await getSellerGeographicAnalytics(seller1Id, dateRange);

    expect(geo).toBeDefined();
    expect(Array.isArray(geo.locations)).toBe(true);
    expect(Array.isArray(geo.stateAggregates)).toBe(true);

    for (const loc of geo.locations) {
      expect(loc).toHaveProperty('city');
      expect(loc).toHaveProperty('state');
      expect(loc).toHaveProperty('orderCount');
      expect(loc).toHaveProperty('revenueRupees');
      expect(loc).toHaveProperty('cancellationRatePct');
      expect(loc).toHaveProperty('isPromising');

      // Crucial privacy verification: No PII exposed
      expect(loc).not.toHaveProperty('streetLine1');
      expect(loc).not.toHaveProperty('phoneNumber');
      expect(loc).not.toHaveProperty('recipientName');
      expect(loc).not.toHaveProperty('customerEmail');
    }
  });

  it('computes platform category benchmarking and growth opportunity analysis', async () => {
    const dateRange = resolveDateRange('90d');
    const benchmarks = await getSellerMarketBenchmarking(seller1Id, dateRange);

    expect(benchmarks).toBeDefined();
    expect(Array.isArray(benchmarks)).toBe(true);

    for (const bm of benchmarks) {
      expect(bm).toHaveProperty('categoryName');
      expect(bm).toHaveProperty('sellerRevenueRupees');
      expect(bm).toHaveProperty('sellerCategorySharePct');
      expect(bm).toHaveProperty('growthOpportunityAssessment');
      expect(bm.benchmarkSource).toBe('AGGREGATED_PLATFORM');
      expect(bm.growthOpportunityAssessment.length).toBeGreaterThan(10);
    }
  });
});
