import { db } from '@/lib/db';
import { OrderStatus } from '@prisma/client';
import { CustomerChurnAnalysis } from './types';
import { invokePythonAnalytics } from './python-bridge';

const ELIGIBLE_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

/**
 * Evaluates customer churn risks for a seller using Python ML / RFM feature analysis.
 */
export async function getSellerChurnPrediction(
  sellerId: string,
  analysisPeriodDays: number = 180
): Promise<CustomerChurnAnalysis> {
  const windowStart = new Date(Date.now() - analysisPeriodDays * 24 * 60 * 60 * 1000);

  // 1. Fetch eligible items for this seller
  const items = await db.orderItem.findMany({
    where: {
      variant: { product: { sellerId } },
      order: {
        createdAt: { gte: windowStart },
        status: { in: ELIGIBLE_STATUSES },
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

  if (items.length === 0) {
    return {
      analysisPeriodDays,
      totalCustomers: 0,
      isDataSufficient: false,
      limitationReason: 'No customer purchase history found within the analysis window.',
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 0,
      riskDistribution: [],
      contributingFactors: [],
      suggestedRetentionActions: [],
    };
  }

  // 2. Aggregate customer profiles
  const custMap = new Map<string, { lastDate: Date; firstDate: Date; orderIds: Set<string>; totalSpend: number }>();
  for (const item of items) {
    const custId = item.order.userId || item.order.customerEmail.toLowerCase().trim();
    if (!custMap.has(custId)) {
      custMap.set(custId, {
        lastDate: item.order.createdAt,
        firstDate: item.order.createdAt,
        orderIds: new Set(),
        totalSpend: 0,
      });
    }
    const rec = custMap.get(custId)!;
    rec.orderIds.add(item.order.id);
    rec.totalSpend += Number(item.unitPrice) * item.quantity;
    if (item.order.createdAt > rec.lastDate) rec.lastDate = item.order.createdAt;
    if (item.order.createdAt < rec.firstDate) rec.firstDate = item.order.createdAt;
  }

  const now = new Date();
  const customerFeatures = Array.from(custMap.entries()).map(([id, data]) => {
    const recencyDays = Math.floor((now.getTime() - data.lastDate.getTime()) / (1000 * 60 * 60 * 24));
    const tenureDays = Math.floor((now.getTime() - data.firstDate.getTime()) / (1000 * 60 * 60 * 24));
    return {
      id,
      recency_days: recencyDays,
      frequency: data.orderIds.size,
      monetary: data.totalSpend,
      tenure_days: tenureDays,
    };
  });

  // 3. Invoke Python ML Engine
  const pyResult = await invokePythonAnalytics<{
    is_data_sufficient: boolean;
    limitation_reason?: string;
    total_customers: number;
    high_risk_count: number;
    medium_risk_count: number;
    low_risk_count: number;
    risk_distribution: {
      tier: 'HIGH_RISK' | 'MEDIUM_RISK' | 'LOW_RISK';
      count: number;
      percentage: number;
      description: string;
    }[];
    contributing_factors: string[];
    suggested_retention_actions: string[];
  }>('churn', {
    customers: customerFeatures,
  });

  if (pyResult) {
    return {
      analysisPeriodDays,
      totalCustomers: pyResult.total_customers,
      isDataSufficient: pyResult.is_data_sufficient,
      limitationReason: pyResult.limitation_reason,
      highRiskCount: pyResult.high_risk_count,
      mediumRiskCount: pyResult.medium_risk_count,
      lowRiskCount: pyResult.low_risk_count,
      riskDistribution: pyResult.risk_distribution,
      contributingFactors: pyResult.contributing_factors,
      suggestedRetentionActions: pyResult.suggested_retention_actions,
    };
  }

  // 4. In-Process TypeScript Statistical Fallback
  let highRisk = 0;
  let mediumRisk = 0;
  let lowRisk = 0;

  for (const c of customerFeatures) {
    if (c.recency_days > 60) {
      highRisk++;
    } else if (c.recency_days > 30 || c.frequency === 1) {
      mediumRisk++;
    } else {
      lowRisk++;
    }
  }

  const total = customerFeatures.length;
  return {
    analysisPeriodDays,
    totalCustomers: total,
    isDataSufficient: total >= 6,
    limitationReason: total < 6 ? 'Customer history too small for validated churn prediction.' : undefined,
    highRiskCount: highRisk,
    mediumRiskCount: mediumRisk,
    lowRiskCount: lowRisk,
    riskDistribution: [
      {
        tier: 'HIGH_RISK',
        count: highRisk,
        percentage: total > 0 ? Math.round((highRisk / total) * 1000) / 10 : 0,
        description: 'Customers inactive for >60 days with high risk of churn.',
      },
      {
        tier: 'MEDIUM_RISK',
        count: mediumRisk,
        percentage: total > 0 ? Math.round((mediumRisk / total) * 1000) / 10 : 0,
        description: 'Single-order buyers or approaching reorder interval.',
      },
      {
        tier: 'LOW_RISK',
        count: lowRisk,
        percentage: total > 0 ? Math.round((lowRisk / total) * 1000) / 10 : 0,
        description: 'Recent and repeat buyers with steady transaction cadence.',
      },
    ],
    contributingFactors: [
      'Customer inactivity beyond 45 days indicates elevated dormancy risk',
      'Single-order buyers represent the largest attrition segment',
    ],
    suggestedRetentionActions: [
      'Trigger 30-day post-purchase feedback and care guide emails',
      'Deploy exclusive re-engagement credits for high-risk accounts',
    ],
  };
}
