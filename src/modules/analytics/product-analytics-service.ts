import { db } from '@/lib/db';
import { OrderStatus } from '@prisma/client';
import {
  ResolvedDateRange,
  ProductPerformanceItem,
  ProductAffinityRule,
  InventoryValuationMetrics,
} from './types';

const ELIGIBLE_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

/**
 * Computes product-level performance metrics, velocity, stock risks, and profitability.
 */
export async function getSellerProductPerformance(
  sellerId: string,
  dateRange: ResolvedDateRange
): Promise<{
  products: ProductPerformanceItem[];
  inventorySummary: InventoryValuationMetrics;
}> {
  const { startDate, endDate, daysDiff } = dateRange;

  // 1. Fetch all products belonging to this seller with variants and category
  const sellerProducts = await db.product.findMany({
    where: { sellerId },
    include: {
      category: { select: { name: true } },
      variants: true,
    },
  });

  if (sellerProducts.length === 0) {
    return {
      products: [],
      inventorySummary: {
        totalInventoryUnits: 0,
        totalInventoryValueRupees: null,
        grossMarginReturnOnInvestment: null,
        isCostDataConfigured: false,
        unconfiguredCostVariantsCount: 0,
        notes: 'No products registered for this merchant.',
      },
    };
  }

  // 2. Fetch all order items for this seller within the date range
  const orderItems = await db.orderItem.findMany({
    where: {
      variant: { product: { sellerId } },
      order: {
        createdAt: { gte: startDate, lte: endDate },
      },
    },
    select: {
      unitPrice: true,
      costPriceSnapshot: true,
      quantity: true,
      variantId: true,
      variant: {
        select: {
          productId: true,
          costPrice: true,
        },
      },
      order: {
        select: {
          status: true,
        },
      },
    },
  });

  // Aggregate by product ID
  interface ProdAgg {
    unitsSold: number;
    revenue: number;
    costTotal: number;
    hasCost: boolean;
    cancelledUnits: number;
    refundedUnits: number;
    totalOrderedUnits: number;
  }

  const prodAggMap = new Map<string, ProdAgg>();
  for (const p of sellerProducts) {
    prodAggMap.set(p.id, {
      unitsSold: 0,
      revenue: 0,
      costTotal: 0,
      hasCost: true,
      cancelledUnits: 0,
      refundedUnits: 0,
      totalOrderedUnits: 0,
    });
  }

  for (const item of orderItems) {
    const prodId = item.variant.productId;
    const agg = prodAggMap.get(prodId);
    if (!agg) continue;

    agg.totalOrderedUnits += item.quantity;

    if (item.order.status === OrderStatus.CANCELLED) {
      agg.cancelledUnits += item.quantity;
    } else if (item.order.status === OrderStatus.REFUNDED) {
      agg.refundedUnits += item.quantity;
    } else if (ELIGIBLE_STATUSES.includes(item.order.status)) {
      const itemRev = Number(item.unitPrice) * item.quantity;
      agg.revenue += itemRev;
      agg.unitsSold += item.quantity;

      const unitCost =
        item.costPriceSnapshot != null
          ? Number(item.costPriceSnapshot)
          : item.variant.costPrice != null
          ? Number(item.variant.costPrice)
          : null;

      if (unitCost !== null) {
        agg.costTotal += unitCost * item.quantity;
      } else {
        agg.hasCost = false;
      }
    }
  }

  // Calculate product metrics
  let totalGrossProfitAllProducts = 0;
  let totalCostOfSoldItems = 0;
  let totalInventoryUnits = 0;
  let totalInventoryValue: number | null = 0;
  let unconfiguredCostVariantsCount = 0;

  const productPerformanceItems: ProductPerformanceItem[] = [];

  for (const p of sellerProducts) {
    const agg = prodAggMap.get(p.id)!;
    const currentStock = p.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
    totalInventoryUnits += currentStock;

    // Check variant cost config
    let pCostValuation = 0;
    for (const v of p.variants) {
      if (v.costPrice !== null) {
        pCostValuation += Number(v.costPrice) * v.stockQuantity;
      } else {
        unconfiguredCostVariantsCount++;
      }
    }

    if (totalInventoryValue !== null) {
      totalInventoryValue += pCostValuation;
    }

    const asp =
      agg.unitsSold > 0 ? Math.round((agg.revenue / agg.unitsSold) * 100) / 100 : Number(p.basePrice);

    const dailyVelocity = agg.unitsSold / Math.max(1, daysDiff);
    const daysOfInventoryRemaining =
      dailyVelocity > 0 ? Math.round(currentStock / dailyVelocity) : (currentStock > 0 ? 999 : 0);

    const inventoryTurnover =
      currentStock > 0 ? Math.round((agg.unitsSold / currentStock) * 100) / 100 : null;

    const cancelRate =
      agg.totalOrderedUnits > 0
        ? Math.round((agg.cancelledUnits / agg.totalOrderedUnits) * 1000) / 10
        : 0;

    const returnRate =
      agg.totalOrderedUnits > 0
        ? Math.round((agg.refundedUnits / agg.totalOrderedUnits) * 1000) / 10
        : 0;

    // Stock Risk Classification
    let stockRisk: 'HEALTHY' | 'LOW_STOCK' | 'OVERSTOCK' | 'OUT_OF_STOCK' = 'HEALTHY';
    if (currentStock === 0) {
      stockRisk = 'OUT_OF_STOCK';
    } else if (daysOfInventoryRemaining <= 14 || currentStock <= 5) {
      stockRisk = 'LOW_STOCK';
    } else if (daysOfInventoryRemaining >= 120 && currentStock > 25) {
      stockRisk = 'OVERSTOCK';
    }

    // Profitability
    let grossMarginPct: number | null = null;
    let costPriceRupees: number | null = null;

    if (agg.hasCost && agg.revenue > 0) {
      const profit = agg.revenue - agg.costTotal;
      grossMarginPct = Math.round((profit / agg.revenue) * 1000) / 10;
      costPriceRupees = agg.unitsSold > 0 ? Math.round((agg.costTotal / agg.unitsSold) * 100) / 100 : null;
      totalGrossProfitAllProducts += profit;
      totalCostOfSoldItems += agg.costTotal;
    }

    productPerformanceItems.push({
      productId: p.id,
      productName: p.name,
      productSlug: p.slug,
      sku: p.variants[0]?.sku || 'SKU-NONE',
      categoryName: p.category.name,
      unitsSold: agg.unitsSold,
      revenueRupees: Math.round(agg.revenue * 100) / 100,
      averageSellingPriceRupees: asp,
      stockQuantity: currentStock,
      inventoryTurnover,
      daysOfInventoryRemaining,
      cancellationRatePct: cancelRate,
      returnRatePct: returnRate,
      stockRisk,
      costPriceRupees,
      grossMarginPct,
    });
  }

  // Sort by revenue descending
  productPerformanceItems.sort((a, b) => b.revenueRupees - a.revenueRupees);

  // GMROI calculation: Gross Margin Earned / Average Inventory Cost
  const isCostDataConfigured = unconfiguredCostVariantsCount === 0;
  if (!isCostDataConfigured) {
    totalInventoryValue = null;
  }

  let gmroi: number | null = null;
  if (isCostDataConfigured && totalInventoryValue !== null && totalInventoryValue > 0) {
    gmroi = Math.round((totalGrossProfitAllProducts / totalInventoryValue) * 100) / 100;
  }

  return {
    products: productPerformanceItems,
    inventorySummary: {
      totalInventoryUnits,
      totalInventoryValueRupees: totalInventoryValue !== null ? Math.round(totalInventoryValue * 100) / 100 : null,
      grossMarginReturnOnInvestment: gmroi,
      isCostDataConfigured,
      unconfiguredCostVariantsCount,
      notes: isCostDataConfigured
        ? 'Valuation based on explicit unit cost prices configured for all catalog variants.'
        : `Cost prices missing for ${unconfiguredCostVariantsCount} variant(s). GMROI and inventory valuation require complete cost records.`,
    },
  };
}

/**
 * Computes market basket association rules (Apriori algorithm) for bundle recommendations.
 * Calculates Support, Confidence, and Lift.
 */
export async function getSellerProductAffinityRules(
  sellerId: string,
  minSupport: number = 0.01,
  minConfidence: number = 0.05
): Promise<{
  rules: ProductAffinityRule[];
  analyzedOrdersCount: number;
  isDataSufficient: boolean;
  limitationReason?: string;
}> {
  // 1. Fetch eligible orders that contain items from this seller
  const ordersWithSellerItems = await db.order.findMany({
    where: {
      status: { in: ELIGIBLE_STATUSES },
      items: {
        some: {
          variant: { product: { sellerId } },
        },
      },
    },
    select: {
      id: true,
      items: {
        where: {
          variant: { product: { sellerId } },
        },
        select: {
          variant: {
            select: {
              sku: true,
              product: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  const totalOrders = ordersWithSellerItems.length;

  if (totalOrders < 5) {
    return {
      rules: [],
      analyzedOrdersCount: totalOrders,
      isDataSufficient: false,
      limitationReason:
        'Insufficient transaction volume for statistically reliable basket affinity rules. Minimum 5 multi-item orders required.',
    };
  }

  // 2. Map orders to sets of product names / SKUs
  const itemCounts = new Map<string, { name: string; sku: string; count: number }>();
  const pairCounts = new Map<string, { count: number; a: string; b: string }>();

  for (const order of ordersWithSellerItems) {
    const uniqueProductsInOrder = new Map<string, { name: string; sku: string }>();
    for (const item of order.items) {
      const p = item.variant.product;
      uniqueProductsInOrder.set(p.id, { name: p.name, sku: item.variant.sku });
    }

    const prodIds = Array.from(uniqueProductsInOrder.keys());

    // Single item counts
    for (const id of prodIds) {
      if (!itemCounts.has(id)) {
        const itemInfo = uniqueProductsInOrder.get(id)!;
        itemCounts.set(id, { name: itemInfo.name, sku: itemInfo.sku, count: 0 });
      }
      itemCounts.get(id)!.count++;
    }

    // Pairwise co-occurrences
    for (let i = 0; i < prodIds.length; i++) {
      for (let j = i + 1; j < prodIds.length; j++) {
        const idA = prodIds[i];
        const idB = prodIds[j];
        const key = idA < idB ? `${idA}___${idB}` : `${idB}___${idA}`;

        if (!pairCounts.has(key)) {
          pairCounts.set(key, { count: 0, a: idA, b: idB });
        }
        pairCounts.get(key)!.count++;
      }
    }
  }

  // 3. Generate Association Rules: A -> B and B -> A
  const rules: ProductAffinityRule[] = [];

  for (const pair of pairCounts.values()) {
    const itemA = itemCounts.get(pair.a);
    const itemB = itemCounts.get(pair.b);
    if (!itemA || !itemB) continue;

    // Support(A and B) = count(A & B) / N
    const supportAB = pair.count / totalOrders;
    if (supportAB < minSupport) continue;

    const supportA = itemA.count / totalOrders;
    const supportB = itemB.count / totalOrders;

    // Rule A -> B: Confidence = P(A & B) / P(A)
    const confidenceAtoB = supportA > 0 ? supportAB / supportA : 0;
    // Lift = Confidence / P(B)
    const liftAtoB = supportB > 0 ? confidenceAtoB / supportB : 0;

    if (confidenceAtoB >= minConfidence && liftAtoB >= 1.0) {
      rules.push({
        antecedentNames: [itemA.name],
        consequentNames: [itemB.name],
        antecedentSkus: [itemA.sku],
        consequentSkus: [itemB.sku],
        support: Math.round(supportAB * 1000) / 1000,
        confidence: Math.round(confidenceAtoB * 1000) / 1000,
        lift: Math.round(liftAtoB * 100) / 100,
        recommendedBundleLabel: `${itemA.name} + ${itemB.name} Bundle`,
      });
    }

    // Rule B -> A: Confidence = P(A & B) / P(B)
    const confidenceBtoA = supportB > 0 ? supportAB / supportB : 0;
    const liftBtoA = supportA > 0 ? confidenceBtoA / supportA : 0;

    if (confidenceBtoA >= minConfidence && liftBtoA >= 1.0) {
      rules.push({
        antecedentNames: [itemB.name],
        consequentNames: [itemA.name],
        antecedentSkus: [itemB.sku],
        consequentSkus: [itemA.sku],
        support: Math.round(supportAB * 1000) / 1000,
        confidence: Math.round(confidenceBtoA * 1000) / 1000,
        lift: Math.round(liftBtoA * 100) / 100,
        recommendedBundleLabel: `${itemB.name} + ${itemA.name} Bundle`,
      });
    }
  }

  // Sort by Lift descending (strongest affinity first)
  rules.sort((a, b) => b.lift - a.lift);

  return {
    rules: rules.slice(0, 10),
    analyzedOrdersCount: totalOrders,
    isDataSufficient: rules.length > 0 || totalOrders >= 10,
    limitationReason:
      rules.length === 0
        ? 'No product pairs exceeded the statistical minimum support and confidence thresholds yet.'
        : undefined,
  };
}
