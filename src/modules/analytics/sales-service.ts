import { db } from '@/lib/db';
import { OrderStatus } from '@prisma/client';
import {
  SalesKPIs,
  TimeSeriesTrendPoint,
  CategoryBreakdown,
  ResolvedDateRange,
} from './types';
import { generateDailySeries, formatDateKey } from './date-utils';

const ELIGIBLE_SALES_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

/**
 * Aggregates all top-level sales KPIs for an authorized seller within a date range,
 * comparing against the previous equivalent period.
 */
export async function getSellerSalesKPIs(
  sellerId: string,
  dateRange: ResolvedDateRange
): Promise<SalesKPIs> {
  const { startDate, endDate, previousStartDate, previousEndDate } = dateRange;

  // 1. Fetch eligible order items for the current period
  const currentItems = await db.orderItem.findMany({
    where: {
      variant: {
        product: { sellerId },
      },
      order: {
        createdAt: { gte: startDate, lte: endDate },
        status: { in: ELIGIBLE_SALES_STATUSES },
      },
    },
    select: {
      unitPrice: true,
      costPriceSnapshot: true,
      quantity: true,
      orderId: true,
      variant: {
        select: {
          costPrice: true,
        },
      },
    },
  });

  // 2. Fetch eligible order items for the previous equivalent period
  const previousItems = await db.orderItem.findMany({
    where: {
      variant: {
        product: { sellerId },
      },
      order: {
        createdAt: { gte: previousStartDate, lte: previousEndDate },
        status: { in: ELIGIBLE_SALES_STATUSES },
      },
    },
    select: {
      unitPrice: true,
      quantity: true,
      orderId: true,
    },
  });

  // 3. Current period financial aggregations
  let grossRevenueRupees = 0;
  let unitsSold = 0;
  const uniqueOrderIds = new Set<string>();
  let grossProfitRupees: number | null = 0;
  let unconfiguredCostItemsCount = 0;

  for (const item of currentItems) {
    const itemRev = Number(item.unitPrice) * item.quantity;
    grossRevenueRupees += itemRev;
    unitsSold += item.quantity;
    uniqueOrderIds.add(item.orderId);

    const costPerUnit = item.costPriceSnapshot != null 
      ? Number(item.costPriceSnapshot) 
      : (item.variant.costPrice != null ? Number(item.variant.costPrice) : null);

    if (costPerUnit !== null) {
      grossProfitRupees = (grossProfitRupees || 0) + (Number(item.unitPrice) - costPerUnit) * item.quantity;
    } else {
      unconfiguredCostItemsCount++;
    }
  }

  // If more than 50% of sold items have no cost configured, treat profit as unreliably partial
  const isProfitReliable = currentItems.length > 0 && unconfiguredCostItemsCount === 0;
  if (!isProfitReliable && unconfiguredCostItemsCount === currentItems.length) {
    grossProfitRupees = null;
  }

  const eligibleOrdersCount = uniqueOrderIds.size;
  const averageOrderValueRupees =
    eligibleOrdersCount > 0 ? Math.round((grossRevenueRupees / eligibleOrdersCount) * 100) / 100 : 0;

  const grossMarginPct =
    grossProfitRupees !== null && grossRevenueRupees > 0
      ? Math.round((grossProfitRupees / grossRevenueRupees) * 1000) / 10
      : null;

  // Previous period calculations
  let previousPeriodRevenueRupees = 0;
  for (const item of previousItems) {
    previousPeriodRevenueRupees += Number(item.unitPrice) * item.quantity;
  }

  let revenueGrowthRatePct = 0;
  if (previousPeriodRevenueRupees > 0) {
    revenueGrowthRatePct =
      Math.round(((grossRevenueRupees - previousPeriodRevenueRupees) / previousPeriodRevenueRupees) * 1000) / 10;
  } else if (grossRevenueRupees > 0) {
    revenueGrowthRatePct = 100.0;
  }

  // 4. Cancellation & Return Rates
  const [totalOrdersPlacedCount, cancelledOrdersCount, refundedOrdersCount] = await Promise.all([
    db.order.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        items: {
          some: {
            variant: { product: { sellerId } },
          },
        },
      },
    }),
    db.order.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: OrderStatus.CANCELLED,
        items: {
          some: {
            variant: { product: { sellerId } },
          },
        },
      },
    }),
    db.order.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: OrderStatus.REFUNDED,
        items: {
          some: {
            variant: { product: { sellerId } },
          },
        },
      },
    }),
  ]);

  const cancellationRatePct =
    totalOrdersPlacedCount > 0
      ? Math.round((cancelledOrdersCount / totalOrdersPlacedCount) * 1000) / 10
      : 0;

  const returnRatePct =
    totalOrdersPlacedCount > 0
      ? Math.round((refundedOrdersCount / totalOrdersPlacedCount) * 1000) / 10
      : 0;

  // 5. Total Inventory Valuation
  const sellerVariants = await db.productVariant.findMany({
    where: {
      product: { sellerId },
    },
    select: {
      stockQuantity: true,
      costPrice: true,
      priceOverride: true,
      product: {
        select: { basePrice: true },
      },
    },
  });

  let totalInventoryValueRupees: number | null = 0;
  let uncostedVariantsCount = 0;

  for (const v of sellerVariants) {
    if (v.costPrice !== null) {
      totalInventoryValueRupees = (totalInventoryValueRupees || 0) + Number(v.costPrice) * v.stockQuantity;
    } else {
      uncostedVariantsCount++;
    }
  }

  const isInventoryValueReliable = sellerVariants.length > 0 && uncostedVariantsCount === 0;
  if (uncostedVariantsCount === sellerVariants.length) {
    totalInventoryValueRupees = null;
  }

  return {
    grossRevenueRupees: Math.round(grossRevenueRupees * 100) / 100,
    grossRevenuePaise: (BigInt(Math.round(grossRevenueRupees * 100))).toString(),
    eligibleOrdersCount,
    unitsSold,
    averageOrderValueRupees,
    previousPeriodRevenueRupees: Math.round(previousPeriodRevenueRupees * 100) / 100,
    revenueGrowthRatePct,
    cancellationRatePct,
    returnRatePct,
    grossProfitRupees: grossProfitRupees !== null ? Math.round(grossProfitRupees * 100) / 100 : null,
    grossMarginPct,
    totalInventoryValueRupees: totalInventoryValueRupees !== null ? Math.round(totalInventoryValueRupees * 100) / 100 : null,
    isProfitReliable,
    isInventoryValueReliable,
  };
}

/**
 * Returns daily revenue and order volume trends for the seller.
 */
export async function getSellerRevenueTrends(
  sellerId: string,
  dateRange: ResolvedDateRange
): Promise<TimeSeriesTrendPoint[]> {
  const { startDate, endDate } = dateRange;
  const daysList = generateDailySeries(startDate, endDate);

  // Fetch all eligible order items with their order creation timestamp
  const items = await db.orderItem.findMany({
    where: {
      variant: {
        product: { sellerId },
      },
      order: {
        createdAt: { gte: startDate, lte: endDate },
        status: { in: ELIGIBLE_SALES_STATUSES },
      },
    },
    select: {
      unitPrice: true,
      quantity: true,
      orderId: true,
      order: {
        select: {
          createdAt: true,
        },
      },
    },
  });

  // Aggregate by date key
  const dayMap = new Map<string, { revenue: number; orders: Set<string>; units: number }>();
  for (const dateKey of daysList) {
    dayMap.set(dateKey, { revenue: 0, orders: new Set<string>(), units: 0 });
  }

  for (const item of items) {
    const key = formatDateKey(item.order.createdAt);
    const existing = dayMap.get(key);
    if (existing) {
      existing.revenue += Number(item.unitPrice) * item.quantity;
      existing.units += item.quantity;
      existing.orders.add(item.orderId);
    }
  }

  return daysList.map((date) => {
    const entry = dayMap.get(date)!;
    return {
      date,
      revenueRupees: Math.round(entry.revenue * 100) / 100,
      ordersCount: entry.orders.size,
      unitsSold: entry.units,
    };
  });
}

/**
 * Returns sales distribution across product categories for this seller.
 */
export async function getSellerCategoryBreakdown(
  sellerId: string,
  dateRange: ResolvedDateRange
): Promise<CategoryBreakdown[]> {
  const { startDate, endDate, previousStartDate, previousEndDate } = dateRange;

  // Current period items
  const currentItems = await db.orderItem.findMany({
    where: {
      variant: {
        product: { sellerId },
      },
      order: {
        createdAt: { gte: startDate, lte: endDate },
        status: { in: ELIGIBLE_SALES_STATUSES },
      },
    },
    select: {
      unitPrice: true,
      quantity: true,
      variant: {
        select: {
          product: {
            select: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Previous period items for category growth
  const prevItems = await db.orderItem.findMany({
    where: {
      variant: {
        product: { sellerId },
      },
      order: {
        createdAt: { gte: previousStartDate, lte: previousEndDate },
        status: { in: ELIGIBLE_SALES_STATUSES },
      },
    },
    select: {
      unitPrice: true,
      quantity: true,
      variant: {
        select: {
          product: {
            select: { categoryId: true },
          },
        },
      },
    },
  });

  const prevRevMap = new Map<string, number>();
  for (const item of prevItems) {
    const catId = item.variant.product.categoryId;
    prevRevMap.set(catId, (prevRevMap.get(catId) || 0) + Number(item.unitPrice) * item.quantity);
  }

  let totalSellerRevenue = 0;
  const catMap = new Map<string, { id: string; name: string; slug: string; revenue: number; units: number }>();

  for (const item of currentItems) {
    const cat = item.variant.product.category;
    const rev = Number(item.unitPrice) * item.quantity;
    totalSellerRevenue += rev;

    if (!catMap.has(cat.id)) {
      catMap.set(cat.id, { id: cat.id, name: cat.name, slug: cat.slug, revenue: 0, units: 0 });
    }
    const record = catMap.get(cat.id)!;
    record.revenue += rev;
    record.units += item.quantity;
  }

  const result: CategoryBreakdown[] = [];
  for (const cat of catMap.values()) {
    const prevRev = prevRevMap.get(cat.id) || 0;
    let growthRatePct = 0;
    if (prevRev > 0) {
      growthRatePct = Math.round(((cat.revenue - prevRev) / prevRev) * 1000) / 10;
    } else if (cat.revenue > 0) {
      growthRatePct = 100.0;
    }

    result.push({
      categoryId: cat.id,
      categoryName: cat.name,
      categorySlug: cat.slug,
      revenueRupees: Math.round(cat.revenue * 100) / 100,
      percentageOfTotal:
        totalSellerRevenue > 0
          ? Math.round((cat.revenue / totalSellerRevenue) * 1000) / 10
          : 0,
      unitsSold: cat.units,
      growthRatePct,
    });
  }

  // Sort descending by revenue
  return result.sort((a, b) => b.revenueRupees - a.revenueRupees);
}

/**
 * Returns distribution of orders by OrderStatus and PaymentProvider for this seller.
 */
export async function getSellerOrderDistributions(
  sellerId: string,
  dateRange: ResolvedDateRange
) {
  const { startDate, endDate } = dateRange;

  const orders = await db.order.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      items: {
        some: {
          variant: { product: { sellerId } },
        },
      },
    },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
    },
  });

  const statusCounts: Record<string, number> = {};
  const paymentCounts: Record<string, number> = {};

  for (const o of orders) {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    paymentCounts[o.paymentMethod] = (paymentCounts[o.paymentMethod] || 0) + 1;
  }

  return {
    totalOrders: orders.length,
    statusDistribution: Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      pct: orders.length > 0 ? Math.round((count / orders.length) * 1000) / 10 : 0,
    })),
    paymentDistribution: Object.entries(paymentCounts).map(([method, count]) => ({
      method,
      count,
      pct: orders.length > 0 ? Math.round((count / orders.length) * 1000) / 10 : 0,
    })),
  };
}
