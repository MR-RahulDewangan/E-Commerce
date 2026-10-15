import { db } from '@/lib/db';
import { OrderStatus } from '@prisma/client';
import { ResolvedDateRange, GeographicDataPoint, MarketBenchmark } from './types';

const ELIGIBLE_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

/**
 * Aggregates order geographic distribution across Indian states and cities.
 * Enforces strict PII privacy: zero street addresses, recipient names, or phone numbers are exposed.
 */
export async function getSellerGeographicAnalytics(
  sellerId: string,
  dateRange: ResolvedDateRange
): Promise<{
  locations: GeographicDataPoint[];
  stateAggregates: {
    state: string;
    orderCount: number;
    revenueRupees: number;
    pctOfRevenue: number;
  }[];
  topPromisingMarkets: string[];
}> {
  const { startDate, endDate } = dateRange;

  // Fetch all orders containing seller's items
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
      shippingAddressSnapshot: true,
      items: {
        where: {
          variant: { product: { sellerId } },
        },
        select: {
          unitPrice: true,
          quantity: true,
        },
      },
    },
  });

  if (orders.length === 0) {
    return {
      locations: [],
      stateAggregates: [],
      topPromisingMarkets: [],
    };
  }

  // Aggregate by City & State
  const cityMap = new Map<
    string,
    {
      state: string;
      city: string;
      totalOrders: number;
      eligibleOrders: number;
      cancelledOrders: number;
      revenue: number;
    }
  >();

  let totalSellerRevenue = 0;

  for (const o of orders) {
    const address = o.shippingAddressSnapshot as Record<string, any>;
    const state = address?.stateProvince || 'Unknown State';
    const city = address?.city || 'Unknown City';
    const key = `${city}___${state}`;

    if (!cityMap.has(key)) {
      cityMap.set(key, {
        state,
        city,
        totalOrders: 0,
        eligibleOrders: 0,
        cancelledOrders: 0,
        revenue: 0,
      });
    }

    const rec = cityMap.get(key)!;
    rec.totalOrders++;

    if (o.status === OrderStatus.CANCELLED) {
      rec.cancelledOrders++;
    }

    if (ELIGIBLE_STATUSES.includes(o.status)) {
      rec.eligibleOrders++;
      const orderSellerRev = o.items.reduce(
        (sum, item) => sum + Number(item.unitPrice) * item.quantity,
        0
      );
      rec.revenue += orderSellerRev;
      totalSellerRevenue += orderSellerRev;
    }
  }

  const overallAOV =
    orders.length > 0 ? totalSellerRevenue / Math.max(1, orders.length) : 0;

  const locations: GeographicDataPoint[] = [];
  const stateMap = new Map<string, { orderCount: number; revenue: number }>();

  for (const rec of cityMap.values()) {
    const aov =
      rec.eligibleOrders > 0
        ? Math.round((rec.revenue / rec.eligibleOrders) * 100) / 100
        : 0;
    const cancelRate =
      rec.totalOrders > 0
        ? Math.round((rec.cancelledOrders / rec.totalOrders) * 1000) / 10
        : 0;

    // A city is considered promising if it exhibits steady order traction, healthy AOV, and low cancellations
    const isPromising = rec.totalOrders >= 2 && cancelRate <= 15 && aov >= overallAOV * 0.8;

    locations.push({
      state: rec.state,
      city: rec.city,
      orderCount: rec.totalOrders,
      revenueRupees: Math.round(rec.revenue * 100) / 100,
      averageOrderValueRupees: aov,
      cancellationRatePct: cancelRate,
      isPromising,
    });

    // Update state aggregate
    if (!stateMap.has(rec.state)) {
      stateMap.set(rec.state, { orderCount: 0, revenue: 0 });
    }
    const stateRec = stateMap.get(rec.state)!;
    stateRec.orderCount += rec.totalOrders;
    stateRec.revenue += rec.revenue;
  }

  // Sort locations by revenue descending
  locations.sort((a, b) => b.revenueRupees - a.revenueRupees);

  const stateAggregates = Array.from(stateMap.entries())
    .map(([state, data]) => ({
      state,
      orderCount: data.orderCount,
      revenueRupees: Math.round(data.revenue * 100) / 100,
      pctOfRevenue:
        totalSellerRevenue > 0
          ? Math.round((data.revenue / totalSellerRevenue) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.revenueRupees - a.revenueRupees);

  const topPromisingMarkets = locations
    .filter((l) => l.isPromising)
    .slice(0, 5)
    .map((l) => `${l.city}, ${l.state}`);

  return {
    locations,
    stateAggregates,
    topPromisingMarkets,
  };
}

/**
 * Computes category intelligence comparing seller performance against
 * aggregated, anonymized BharatStore marketplace benchmark data.
 */
export async function getSellerMarketBenchmarking(
  sellerId: string,
  dateRange: ResolvedDateRange
): Promise<MarketBenchmark[]> {
  const { startDate, endDate } = dateRange;

  // 1. Fetch total sales across categories for THIS seller
  const sellerItems = await db.orderItem.findMany({
    where: {
      variant: {
        product: { sellerId },
      },
      order: {
        createdAt: { gte: startDate, lte: endDate },
        status: { in: ELIGIBLE_STATUSES },
      },
    },
    select: {
      unitPrice: true,
      quantity: true,
      variant: {
        select: {
          product: {
            select: {
              category: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  // 2. Fetch platform-wide sales across categories for the benchmark (anonymized)
  const platformItems = await db.orderItem.findMany({
    where: {
      order: {
        createdAt: { gte: startDate, lte: endDate },
        status: { in: ELIGIBLE_STATUSES },
      },
    },
    select: {
      unitPrice: true,
      quantity: true,
      variant: {
        select: {
          product: {
            select: {
              category: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  let totalSellerRevenue = 0;
  const sellerCatMap = new Map<string, { name: string; revenue: number }>();

  for (const item of sellerItems) {
    const cat = item.variant.product.category;
    const rev = Number(item.unitPrice) * item.quantity;
    totalSellerRevenue += rev;

    if (!sellerCatMap.has(cat.id)) {
      sellerCatMap.set(cat.id, { name: cat.name, revenue: 0 });
    }
    sellerCatMap.get(cat.id)!.revenue += rev;
  }

  let totalPlatformRevenue = 0;
  const platformCatMap = new Map<string, { name: string; revenue: number }>();

  for (const item of platformItems) {
    const cat = item.variant.product.category;
    const rev = Number(item.unitPrice) * item.quantity;
    totalPlatformRevenue += rev;

    if (!platformCatMap.has(cat.id)) {
      platformCatMap.set(cat.id, { name: cat.name, revenue: 0 });
    }
    platformCatMap.get(cat.id)!.revenue += rev;
  }

  const reportingPeriod = `${dateRange.startDate.toISOString().split('T')[0]} to ${dateRange.endDate.toISOString().split('T')[0]}`;

  const benchmarks: MarketBenchmark[] = [];

  for (const [catId, sellerData] of sellerCatMap.entries()) {
    const platData = platformCatMap.get(catId);
    const platCatRev = platData?.revenue || 0;

    const sellerSharePct =
      totalSellerRevenue > 0
        ? Math.round((sellerData.revenue / totalSellerRevenue) * 1000) / 10
        : 0;

    const platSharePct =
      totalPlatformRevenue > 0 && platCatRev > 0
        ? Math.round((platCatRev / totalPlatformRevenue) * 1000) / 10
        : null;

    let growthOpportunityAssessment = 'Stable market presence.';
    if (platSharePct !== null) {
      if (sellerSharePct >= platSharePct * 1.3) {
        growthOpportunityAssessment = `Core competitive strength: Your store captures ${sellerSharePct}% of sales in ${sellerData.name}, outperforming the platform average of ${platSharePct}%. Consider introducing premium variants.`;
      } else if (sellerSharePct < platSharePct * 0.7) {
        growthOpportunityAssessment = `Under-penetrated opportunity: ${sellerData.name} drives ${platSharePct}% of marketplace revenue platform-wide, but only ${sellerSharePct}% of your catalog. Expanding catalog depth here offers rapid expansion.`;
      } else {
        growthOpportunityAssessment = `Aligned with platform baseline demand (${platSharePct}%). Maintain steady stock availability.`;
      }
    }

    benchmarks.push({
      categoryName: sellerData.name,
      sellerRevenueRupees: Math.round(sellerData.revenue * 100) / 100,
      sellerCategorySharePct: sellerSharePct,
      platformCategorySharePct: platSharePct,
      benchmarkSource: 'AGGREGATED_PLATFORM',
      reportingPeriod,
      growthOpportunityAssessment,
    });
  }

  return benchmarks.sort((a, b) => b.sellerRevenueRupees - a.sellerRevenueRupees);
}
