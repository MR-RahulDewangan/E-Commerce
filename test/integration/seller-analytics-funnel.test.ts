import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { recordAnalyticsEvent, getSellerConversionFunnel } from '@/modules/analytics/funnel-service';
import { resolveDateRange } from '@/modules/analytics/date-utils';

describe('Behavioral Event Ingestion & Conversion Funnel Integration Tests', () => {
  let sellerId: string;
  let productId: string;

  beforeAll(async () => {
    const seller = await db.sellerProfile.findFirst({
      include: { products: true },
    });
    expect(seller).toBeDefined();
    sellerId = seller!.id;
    productId = seller!.products[0].id;
  });

  it('records a behavioral event with automatic seller attribution', async () => {
    const testSession = `test_sess_${Date.now()}`;
    const result = await recordAnalyticsEvent({
      eventType: 'PRODUCT_VIEW',
      sessionId: testSession,
      productId,
      metadata: { test: true },
    });

    expect(result).toBe(true);

    const saved = await db.analyticsEvent.findFirst({
      where: { sessionId: testSession },
    });

    expect(saved).toBeDefined();
    expect(saved?.sellerId).toBe(sellerId);
    expect(saved?.eventType).toBe('PRODUCT_VIEW');
  });

  it('computes seller conversion funnel stages and drops', async () => {
    const dateRange = resolveDateRange('30d');
    const funnel = await getSellerConversionFunnel(sellerId, dateRange);

    expect(funnel).toBeDefined();
    expect(funnel.stages.length).toBe(5);
    expect(funnel.stages[0].stageKey).toBe('HOMEPAGE');
    expect(funnel.stages[1].stageKey).toBe('PRODUCT_VIEW');
    expect(funnel.stages[2].stageKey).toBe('ADD_TO_CART');
    expect(funnel.stages[3].stageKey).toBe('CHECKOUT_INITIATED');
    expect(funnel.stages[4].stageKey).toBe('PURCHASE_COMPLETED');

    for (const stage of funnel.stages) {
      expect(typeof stage.uniqueSessions).toBe('number');
      expect(typeof stage.conversionRateFromPreviousPct).toBe('number');
      expect(typeof stage.dropOffRatePct).toBe('number');
    }

    expect(funnel.summary).toHaveProperty('overallConversionRatePct');
    expect(funnel.summary).toHaveProperty('completedPurchases');
    expect(Array.isArray(funnel.topViewedProducts)).toBe(true);
  });
});
