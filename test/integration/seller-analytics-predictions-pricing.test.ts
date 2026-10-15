import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { getSellerDemandForecasts } from '@/modules/analytics/forecast-service';
import { getSellerChurnPrediction } from '@/modules/analytics/churn-service';
import {
  generateSellerPricingRecommendations,
  applyOrRejectPricingRecommendation,
} from '@/modules/analytics/pricing-service';

describe('Seller Predictive Intelligence & Dynamic Pricing Integration Tests', () => {
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

  it('generates demand forecasts with uncertainty bounds and stockout/overstock flags', async () => {
    const forecasts = await getSellerDemandForecasts(seller1Id, 14);

    expect(Array.isArray(forecasts)).toBe(true);
    expect(forecasts.length).toBeGreaterThan(0);

    for (const fc of forecasts) {
      expect(fc).toHaveProperty('productId');
      expect(fc).toHaveProperty('productName');
      expect(fc).toHaveProperty('sku');
      expect(fc).toHaveProperty('horizonDays', 14);
      expect(fc).toHaveProperty('isDataSufficient');
      expect(fc).toHaveProperty('generatedAt');
      expect(fc).toHaveProperty('stockoutRisk');
      expect(fc).toHaveProperty('overstockRisk');

      if (fc.isDataSufficient) {
        expect(fc.forecastPoints.length).toBe(14);
        for (const point of fc.forecastPoints) {
          expect(point).toHaveProperty('date');
          expect(point).toHaveProperty('predictedUnits');
          expect(point).toHaveProperty('lowerBound');
          expect(point).toHaveProperty('upperBound');
          expect(point.upperBound).toBeGreaterThanOrEqual(point.lowerBound);
          expect(point.predictedUnits).toBeGreaterThanOrEqual(0);
        }
      } else {
        expect(fc.limitationReason).toBeDefined();
      }
    }
  }, 20000);

  it('evaluates customer churn risk stratification', async () => {
    const churn = await getSellerChurnPrediction(seller1Id, 180);

    expect(churn).toBeDefined();
    expect(churn.totalCustomers).toBeGreaterThan(0);
    expect(typeof churn.highRiskCount).toBe('number');
    expect(typeof churn.mediumRiskCount).toBe('number');
    expect(typeof churn.lowRiskCount).toBe('number');
    expect(churn.highRiskCount + churn.mediumRiskCount + churn.lowRiskCount).toBe(churn.totalCustomers);

    expect(Array.isArray(churn.riskDistribution)).toBe(true);
    expect(Array.isArray(churn.suggestedRetentionActions)).toBe(true);
    expect(churn.suggestedRetentionActions.length).toBeGreaterThan(0);
  });

  it('generates dynamic pricing recommendations without mutating live product prices', async () => {
    const recommendations = await generateSellerPricingRecommendations(seller1Id, {
      targetMarginPct: 35,
      minMarginFloorPct: 15,
    });

    expect(Array.isArray(recommendations)).toBe(true);

    for (const rec of recommendations) {
      expect(rec.status).toBe('PENDING_APPROVAL');
      expect(rec.suggestedPriceRupees).not.toBe(rec.currentPriceRupees);
      expect(rec.reasoning.length).toBeGreaterThan(15);
      expect(['VELOCITY_CLEARANCE', 'MARGIN_OPTIMIZER', 'DEMAND_SURGE']).toContain(rec.strategy);

      // Verify live variant price in DB remains unchanged at this stage
      const variant = await db.productVariant.findUnique({
        where: { id: rec.variantId },
      });
      const currentDbPrice = Number(variant?.priceOverride || 0);
      if (currentDbPrice > 0) {
        expect(currentDbPrice).toBe(rec.currentPriceRupees);
      }
    }
  });

  it('applies pricing recommendation ONLY upon explicit seller approval', async () => {
    const recommendations = await generateSellerPricingRecommendations(seller1Id);
    if (recommendations.length === 0) return;

    const targetRec = recommendations[0];

    // Explicit approval
    const result = await applyOrRejectPricingRecommendation(seller1Id, targetRec.id, 'APPROVE');
    expect(result.success).toBe(true);
    expect(result.newPrice).toBe(targetRec.suggestedPriceRupees);

    // Verify live DB price override has now been updated
    const updatedVariant = await db.productVariant.findUnique({
      where: { id: targetRec.variantId },
    });
    expect(Number(updatedVariant?.priceOverride)).toBe(targetRec.suggestedPriceRupees);

    // Verify recommendation marked as APPLIED
    const updatedRec = await db.pricingRecommendation.findUnique({
      where: { id: targetRec.id },
    });
    expect(updatedRec?.status).toBe('APPLIED');
    expect(updatedRec?.appliedAt).toBeDefined();
  });

  it('rejects cross-seller approval attempts', async () => {
    const recommendations = await generateSellerPricingRecommendations(seller1Id);
    if (recommendations.length === 0) return;

    const targetRec = recommendations[0];

    // Attempt approval using Seller 2 credentials on Seller 1's recommendation
    await expect(
      applyOrRejectPricingRecommendation(seller2Id, targetRec.id, 'APPROVE')
    ).rejects.toThrow();
  });
});
