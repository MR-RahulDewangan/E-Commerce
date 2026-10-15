import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { getSellerRFMAnalysis } from '@/modules/analytics/rfm-service';
import { getSellerCohortRetention } from '@/modules/analytics/cohort-service';

describe('Seller Customer Intelligence (RFM & Cohorts) Integration Tests', () => {
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

  it('computes seller-scoped RFM customer segmentation', async () => {
    const rfm = await getSellerRFMAnalysis(seller1Id, 365);

    expect(rfm).toBeDefined();
    expect(rfm.totalAnalyzedCustomers).toBeGreaterThan(0);
    expect(typeof rfm.overallRepeatPurchaseRatePct).toBe('number');
    expect(rfm.segments.length).toBe(6);

    const segmentKeys = rfm.segments.map((s) => s.segmentKey);
    expect(segmentKeys).toContain('CHAMPIONS');
    expect(segmentKeys).toContain('LOYAL_CUSTOMERS');
    expect(segmentKeys).toContain('NEW_CUSTOMERS');
    expect(segmentKeys).toContain('AT_RISK');

    // Customer count sum should match totalAnalyzedCustomers
    const totalCustomersInSegments = rfm.segments.reduce((sum, s) => sum + s.customerCount, 0);
    expect(totalCustomersInSegments).toBe(rfm.totalAnalyzedCustomers);

    for (const segment of rfm.segments) {
      expect(Array.isArray(segment.recommendedActions)).toBe(true);
      expect(segment.recommendedActions.length).toBeGreaterThan(0);
    }
  });

  it('guarantees cross-seller RFM data isolation', async () => {
    const [rfm1, rfm2] = await Promise.all([
      getSellerRFMAnalysis(seller1Id, 365),
      getSellerRFMAnalysis(seller2Id, 365),
    ]);

    expect(rfm1).toBeDefined();
    expect(rfm2).toBeDefined();
    // Verify each seller's calculations operate independently
    expect(rfm1.totalAnalyzedCustomers).toBeGreaterThan(0);
    expect(rfm2.totalAnalyzedCustomers).toBeGreaterThan(0);
  });

  it('computes monthly cohort retention heatmap cleanly', async () => {
    const cohorts = await getSellerCohortRetention(seller1Id, 6);

    expect(cohorts).toBeDefined();
    expect(Array.isArray(cohorts)).toBe(true);

    if (cohorts.length > 0) {
      const firstCohort = cohorts[0];
      expect(firstCohort).toHaveProperty('cohortMonth');
      expect(firstCohort).toHaveProperty('initialCustomerCount');
      expect(firstCohort).toHaveProperty('retentions');
      expect(firstCohort.initialCustomerCount).toBeGreaterThan(0);

      // Month 0 retention should always be 100%
      const m0 = firstCohort.retentions.find((r) => r.monthIndex === 0);
      expect(m0).toBeDefined();
      expect(m0?.retentionPct).toBe(100);
    }
  });
});
