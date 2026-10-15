import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { PricingRecommendationItem } from './types';

export interface GeneratePricingOptions {
  targetMarginPct?: number;
  minMarginFloorPct?: number;
}

/**
 * Generates explainable, constrained pricing recommendations for a seller's catalog.
 * Crucial guarantee: NEVER changes live prices directly. Recommendations are created
 * in PENDING_APPROVAL status and require explicit merchant authorization.
 */
export async function generateSellerPricingRecommendations(
  sellerId: string,
  options: GeneratePricingOptions = {}
): Promise<PricingRecommendationItem[]> {
  const targetMargin = options.targetMarginPct ?? 35;
  const minMarginFloor = options.minMarginFloorPct ?? 15;

  // 1. Fetch seller products and variants
  const products = await db.product.findMany({
    where: { sellerId },
    include: {
      variants: true,
      category: { select: { name: true } },
    },
  });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // 2. Fetch 30-day sales velocity per variant
  const recentItems = await db.orderItem.findMany({
    where: {
      variant: { product: { sellerId } },
      order: {
        createdAt: { gte: thirtyDaysAgo },
        status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
      },
    },
    select: {
      variantId: true,
      quantity: true,
    },
  });

  const salesCountMap = new Map<string, number>();
  for (const item of recentItems) {
    salesCountMap.set(item.variantId, (salesCountMap.get(item.variantId) || 0) + item.quantity);
  }

  const generatedItems: PricingRecommendationItem[] = [];

  for (const product of products) {
    for (const variant of product.variants) {
      const currentPrice = Number(variant.priceOverride || product.basePrice);
      const costPrice = variant.costPrice != null ? Number(variant.costPrice) : null;
      const stock = variant.stockQuantity;
      const unitsSold30d = salesCountMap.get(variant.id) || 0;
      const dailyVelocity = unitsSold30d / 30;

      // Cannot generate margin-safe recommendations without a reliable cost price
      if (costPrice === null || costPrice <= 0) {
        continue;
      }

      const currentMarginPct = Math.round(((currentPrice - costPrice) / currentPrice) * 1000) / 10;
      let strategy: 'VELOCITY_CLEARANCE' | 'MARGIN_OPTIMIZER' | 'DEMAND_SURGE' | null = null;
      let suggestedPrice = currentPrice;
      let reasoning = '';

      // Rule 1: High stock + low velocity -> Clearance markdown recommendation
      if (stock >= 15 && dailyVelocity < 0.2) {
        strategy = 'VELOCITY_CLEARANCE';
        // Suggest 8-12% markdown, ensuring we do not drop below minMarginFloor
        const potentialPrice = Math.round(currentPrice * 0.90);
        const potentialMargin = ((potentialPrice - costPrice) / potentialPrice) * 100;

        if (potentialMargin >= minMarginFloor) {
          suggestedPrice = potentialPrice;
          reasoning = `High inventory levels (${stock} units) with slow turnover (estimated >${Math.round(stock / Math.max(0.05, dailyVelocity))} days remaining). A 10% markdown to ₹${suggestedPrice} will accelerate velocity while maintaining a ${Math.round(potentialMargin)}% gross margin (well above the ${minMarginFloor}% floor).`;
        }
      }
      // Rule 2: Low stock + high velocity -> Scarcity demand surge recommendation
      else if (stock <= 6 && dailyVelocity >= 0.5) {
        strategy = 'DEMAND_SURGE';
        const potentialPrice = Math.round(currentPrice * 1.08);
        suggestedPrice = potentialPrice;
        reasoning = `Strong buyer demand (${unitsSold30d} units sold in past 30 days) with imminent stockout risk in ${Math.round(stock / dailyVelocity)} days. A modest 8% price increase to ₹${suggestedPrice} captures artisan scarcity value and optimizes margin.`;
      }
      // Rule 3: Steady sales + sub-target margin -> Margin optimization recommendation
      else if (unitsSold30d >= 3 && currentMarginPct < targetMargin - 5) {
        strategy = 'MARGIN_OPTIMIZER';
        // Compute price that achieves target margin: Price = Cost / (1 - TargetMargin / 100)
        const targetPrice = Math.round(costPrice / (1 - targetMargin / 100));
        if (targetPrice > currentPrice && targetPrice <= currentPrice * 1.15) {
          suggestedPrice = targetPrice;
          reasoning = `Current gross margin of ${currentMarginPct}% is below your store target of ${targetMargin}%. Realignment to ₹${suggestedPrice} achieves your target margin of ${targetMargin}% on an established product with steady demand.`;
        }
      }

      if (strategy && suggestedPrice !== currentPrice) {
        // Upsert recommendation into database
        const existing = await db.pricingRecommendation.findFirst({
          where: {
            variantId: variant.id,
            status: 'PENDING_APPROVAL',
          },
        });

        let savedRecord;
        const metricsSnapshot = {
          currentStock: stock,
          unitsSold30d,
          dailyVelocity,
          currentMarginPct,
          costPrice,
        };

        if (existing) {
          savedRecord = await db.pricingRecommendation.update({
            where: { id: existing.id },
            data: {
              currentPrice: new Prisma.Decimal(currentPrice),
              suggestedPrice: new Prisma.Decimal(suggestedPrice),
              strategy,
              reasoning,
              metricsSnapshot,
            },
          });
        } else {
          savedRecord = await db.pricingRecommendation.create({
            data: {
              sellerId,
              productId: product.id,
              variantId: variant.id,
              currentPrice: new Prisma.Decimal(currentPrice),
              suggestedPrice: new Prisma.Decimal(suggestedPrice),
              minMarginPct: new Prisma.Decimal(minMarginFloor),
              strategy,
              reasoning,
              metricsSnapshot,
              status: 'PENDING_APPROVAL',
            },
          });
        }

        const priceDeltaRupees = suggestedPrice - currentPrice;
        const priceDeltaPct = Math.round((priceDeltaRupees / currentPrice) * 1000) / 10;

        generatedItems.push({
          id: savedRecord.id,
          productId: product.id,
          variantId: variant.id,
          productName: product.name,
          variantName: variant.name,
          sku: variant.sku,
          currentPriceRupees: currentPrice,
          suggestedPriceRupees: suggestedPrice,
          priceDeltaRupees,
          priceDeltaPct,
          minMarginPct: minMarginFloor,
          strategy,
          reasoning,
          metricsSnapshot,
          status: savedRecord.status as any,
          createdAt: savedRecord.createdAt.toISOString(),
        });
      }
    }
  }

  return generatedItems;
}

/**
 * Retrieves pending recommendations and historical pricing audits for this seller.
 */
export async function getSellerPricingRecommendations(
  sellerId: string
): Promise<PricingRecommendationItem[]> {
  const records = await db.pricingRecommendation.findMany({
    where: { sellerId },
    include: {
      product: { select: { name: true } },
      variant: { select: { name: true, sku: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return records.map((r) => {
    const curr = Number(r.currentPrice);
    const sugg = Number(r.suggestedPrice);
    const delta = sugg - curr;
    const deltaPct = curr > 0 ? Math.round((delta / curr) * 1000) / 10 : 0;

    return {
      id: r.id,
      productId: r.productId,
      variantId: r.variantId,
      productName: r.product.name,
      variantName: r.variant.name,
      sku: r.variant.sku,
      currentPriceRupees: curr,
      suggestedPriceRupees: sugg,
      priceDeltaRupees: delta,
      priceDeltaPct: deltaPct,
      minMarginPct: r.minMarginPct != null ? Number(r.minMarginPct) : null,
      strategy: r.strategy as any,
      reasoning: r.reasoning,
      metricsSnapshot: (r.metricsSnapshot as any) || {},
      status: r.status as any,
      createdAt: r.createdAt.toISOString(),
    };
  });
}

/**
 * Executes a human-in-the-loop pricing action.
 * If approved, atomically updates ProductVariant.priceOverride and marks recommendation as APPLIED.
 */
export async function applyOrRejectPricingRecommendation(
  sellerId: string,
  recommendationId: string,
  action: 'APPROVE' | 'REJECT'
): Promise<{ success: boolean; newPrice?: number; message: string }> {
  const rec = await db.pricingRecommendation.findUnique({
    where: { id: recommendationId },
  });

  if (!rec || rec.sellerId !== sellerId) {
    throw new Error('Pricing recommendation not found or unauthorized.');
  }

  if (rec.status !== 'PENDING_APPROVAL') {
    throw new Error(`Recommendation has already been resolved with status: ${rec.status}`);
  }

  if (action === 'REJECT') {
    await db.pricingRecommendation.update({
      where: { id: recommendationId },
      data: { status: 'REJECTED' },
    });
    return { success: true, message: 'Pricing recommendation successfully dismissed.' };
  }

  // Explicit approval: atomic transaction
  const newPrice = Number(rec.suggestedPrice);

  await db.$transaction([
    db.productVariant.update({
      where: { id: rec.variantId },
      data: {
        priceOverride: new Prisma.Decimal(newPrice),
      },
    }),
    db.pricingRecommendation.update({
      where: { id: recommendationId },
      data: {
        status: 'APPLIED',
        appliedAt: new Date(),
      },
    }),
  ]);

  return {
    success: true,
    newPrice,
    message: `Price successfully updated to ₹${newPrice}.`,
  };
}
