import { db } from '@/lib/db';
import { OrderStatus } from '@prisma/client';
import { RFMAnalysisResult, RFMSegmentKey, RFMSegmentSummary } from './types';

const ELIGIBLE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

interface RawCustomerData {
  customerIdentifier: string; // Internal anonymized hash/key
  lastOrderDate: Date;
  orderCount: number;
  totalMonetary: number;
}

const SEGMENT_METADATA: Record<
  RFMSegmentKey,
  {
    name: string;
    description: string;
    actions: string[];
  }
> = {
  CHAMPIONS: {
    name: 'Champions',
    description: 'Frequent buyers who spend significantly and purchased very recently.',
    actions: [
      'Reward with VIP exclusive previews and limited artisan drops',
      'Provide dedicated priority concierge and zero-friction returns',
      'Invite to co-design and craft feedback panels',
    ],
  },
  LOYAL_CUSTOMERS: {
    name: 'Loyal Customers',
    description: 'Consistent, repeat buyers with healthy lifetime value and steady engagement.',
    actions: [
      'Recommend tailored bundles based on previous basket affinities',
      'Offer early-bird festive discounts during Indian festive peaks (Diwali, Eid)',
      'Incentivize referral sharing with friend-and-family gift credits',
    ],
  },
  POTENTIAL_LOYALISTS: {
    name: 'Potential Loyalists',
    description: 'Recent customers with above-average spending and 1-2 completed purchases.',
    actions: [
      'Highlight complimentary product accessories to drive second purchase',
      'Offer tier-upgrade discount vouchers on their next order',
      'Engage with artisan backstory and sustainable craft heritage notes',
    ],
  },
  NEW_CUSTOMERS: {
    name: 'New Customers',
    description: 'First-time buyers with recent purchases who need nurturing.',
    actions: [
      'Deliver friendly onboarding check-in and post-delivery satisfaction survey',
      'Provide a 10% next-purchase welcome incentive valid for 21 days',
      'Share care guides for handloom and handmade craft preservation',
    ],
  },
  AT_RISK: {
    name: 'At Risk',
    description: 'Past high-value or frequent buyers who have not purchased in over 90 days.',
    actions: [
      'Send personalized win-back emails featuring seasonal new arrivals',
      'Offer a tailored reactivation credit with a limited redemption window',
      'Gather feedback on whether fulfillment or pricing drove dormancy',
    ],
  },
  HIBERNATING: {
    name: 'Hibernating',
    description: 'Low frequency, low monetary customers who have been inactive for a prolonged period.',
    actions: [
      'Include in major clearance and seasonal end-of-season markdown campaigns',
      'Test aggressive re-engagement pricing or festival coupon codes',
      'Prune communication frequency to protect sender domain reputation',
    ],
  },
};

/**
 * Executes a server-authoritative RFM analysis strictly isolated to a seller's orders.
 */
export async function getSellerRFMAnalysis(
  sellerId: string,
  analysisWindowDays: number = 365
): Promise<RFMAnalysisResult> {
  const windowStart = new Date(Date.now() - analysisWindowDays * 24 * 60 * 60 * 1000);

  // 1. Fetch all eligible order items belonging to this seller
  const sellerOrderItems = await db.orderItem.findMany({
    where: {
      variant: {
        product: { sellerId },
      },
      order: {
        createdAt: { gte: windowStart },
        status: { in: ELIGIBLE_ORDER_STATUSES },
      },
    },
    select: {
      unitPrice: true,
      quantity: true,
      order: {
        select: {
          id: true,
          customerEmail: true,
          userId: true,
          createdAt: true,
        },
      },
    },
  });

  if (sellerOrderItems.length === 0) {
    return {
      analysisPeriodDays: analysisWindowDays,
      totalAnalyzedCustomers: 0,
      overallRepeatPurchaseRatePct: 0,
      segments: Object.keys(SEGMENT_METADATA).map((k) => ({
        segmentKey: k as RFMSegmentKey,
        segmentName: SEGMENT_METADATA[k as RFMSegmentKey].name,
        description: SEGMENT_METADATA[k as RFMSegmentKey].description,
        customerCount: 0,
        percentageOfCustomers: 0,
        totalRevenueRupees: 0,
        averageMonetaryRupees: 0,
        recommendedActions: SEGMENT_METADATA[k as RFMSegmentKey].actions,
      })),
    };
  }

  // 2. Aggregate by customer identifier (userId || customerEmail)
  const customerMap = new Map<string, {
    orders: Map<string, { date: Date; amount: number }>;
  }>();

  for (const item of sellerOrderItems) {
    const custId = item.order.userId || item.order.customerEmail.toLowerCase().trim();
    if (!customerMap.has(custId)) {
      customerMap.set(custId, { orders: new Map() });
    }
    const custRecord = customerMap.get(custId)!;
    const orderId = item.order.id;

    if (!custRecord.orders.has(orderId)) {
      custRecord.orders.set(orderId, { date: item.order.createdAt, amount: 0 });
    }
    const orderEntry = custRecord.orders.get(orderId)!;
    orderEntry.amount += Number(item.unitPrice) * item.quantity;
  }

  const now = new Date();
  const customerMetrics: RawCustomerData[] = [];

  for (const [custId, data] of customerMap.entries()) {
    let latestDate = new Date(0);
    let totalSpend = 0;

    for (const order of data.orders.values()) {
      totalSpend += order.amount;
      if (order.date > latestDate) {
        latestDate = order.date;
      }
    }

    customerMetrics.push({
      customerIdentifier: custId,
      lastOrderDate: latestDate,
      orderCount: data.orders.size,
      totalMonetary: totalSpend,
    });
  }

  // 3. Score Recency, Frequency, Monetary
  // Calculate Monetary thresholds (medians or quantiles)
  const monetaryValues = customerMetrics.map((c) => c.totalMonetary).sort((a, b) => a - b);
  const medianMonetary = monetaryValues[Math.floor(monetaryValues.length / 2)] || 1000;
  const highMonetaryThreshold = monetaryValues[Math.floor(monetaryValues.length * 0.75)] || 3000;

  let repeatCustomerCount = 0;
  const segmentBuckets: Record<RFMSegmentKey, { count: number; totalRevenue: number }> = {
    CHAMPIONS: { count: 0, totalRevenue: 0 },
    LOYAL_CUSTOMERS: { count: 0, totalRevenue: 0 },
    POTENTIAL_LOYALISTS: { count: 0, totalRevenue: 0 },
    NEW_CUSTOMERS: { count: 0, totalRevenue: 0 },
    AT_RISK: { count: 0, totalRevenue: 0 },
    HIBERNATING: { count: 0, totalRevenue: 0 },
  };

  for (const c of customerMetrics) {
    const recencyDays = Math.max(
      0,
      Math.floor((now.getTime() - c.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const freq = c.orderCount;
    const mon = c.totalMonetary;

    if (freq > 1) {
      repeatCustomerCount++;
    }

    // Assign Segment based on clear, deterministic rules
    let segment: RFMSegmentKey;

    if (recencyDays <= 30 && freq >= 3 && mon >= highMonetaryThreshold) {
      segment = 'CHAMPIONS';
    } else if (freq >= 3 || (recencyDays <= 60 && freq >= 2 && mon >= medianMonetary)) {
      segment = 'LOYAL_CUSTOMERS';
    } else if (recencyDays <= 45 && freq >= 1 && mon >= medianMonetary) {
      segment = 'POTENTIAL_LOYALISTS';
    } else if (recencyDays <= 30 && freq === 1) {
      segment = 'NEW_CUSTOMERS';
    } else if (recencyDays > 60 && (freq >= 2 || mon >= highMonetaryThreshold)) {
      segment = 'AT_RISK';
    } else {
      segment = 'HIBERNATING';
    }

    segmentBuckets[segment].count++;
    segmentBuckets[segment].totalRevenue += mon;
  }

  const totalAnalyzedCustomers = customerMetrics.length;
  const overallRepeatPurchaseRatePct =
    totalAnalyzedCustomers > 0
      ? Math.round((repeatCustomerCount / totalAnalyzedCustomers) * 1000) / 10
      : 0;

  const segments: RFMSegmentSummary[] = (Object.keys(SEGMENT_METADATA) as RFMSegmentKey[]).map(
    (key) => {
      const b = segmentBuckets[key];
      const count = b.count;
      const pct =
        totalAnalyzedCustomers > 0
          ? Math.round((count / totalAnalyzedCustomers) * 1000) / 10
          : 0;
      const avgMon = count > 0 ? Math.round((b.totalRevenue / count) * 100) / 100 : 0;

      return {
        segmentKey: key,
        segmentName: SEGMENT_METADATA[key].name,
        description: SEGMENT_METADATA[key].description,
        customerCount: count,
        percentageOfCustomers: pct,
        totalRevenueRupees: Math.round(b.totalRevenue * 100) / 100,
        averageMonetaryRupees: avgMon,
        recommendedActions: SEGMENT_METADATA[key].actions,
      };
    }
  );

  return {
    analysisPeriodDays: analysisWindowDays,
    totalAnalyzedCustomers,
    overallRepeatPurchaseRatePct,
    segments,
  };
}
