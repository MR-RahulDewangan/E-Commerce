import { db } from '@/lib/db';
import { OrderStatus } from '@prisma/client';
import { CohortData, CohortMonthRetention } from './types';

const ELIGIBLE_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

/**
 * Calculates monthly customer retention cohorts relative to their first eligible purchase with this seller.
 */
export async function getSellerCohortRetention(
  sellerId: string,
  lookbackMonths: number = 6
): Promise<CohortData[]> {
  const lookbackDate = new Date();
  lookbackDate.setMonth(lookbackDate.getMonth() - lookbackMonths);
  lookbackDate.setDate(1);
  lookbackDate.setHours(0, 0, 0, 0);

  // 1. Fetch all eligible order dates per customer for this seller
  const items = await db.orderItem.findMany({
    where: {
      variant: {
        product: { sellerId },
      },
      order: {
        status: { in: ELIGIBLE_STATUSES },
      },
    },
    select: {
      order: {
        select: {
          customerEmail: true,
          userId: true,
          createdAt: true,
        },
      },
    },
  });

  if (items.length === 0) {
    return [];
  }

  // 2. Map customer -> list of order months
  const customerPurchaseMonths = new Map<string, Date[]>();
  for (const item of items) {
    const custId = item.order.userId || item.order.customerEmail.toLowerCase().trim();
    if (!customerPurchaseMonths.has(custId)) {
      customerPurchaseMonths.set(custId, []);
    }
    customerPurchaseMonths.get(custId)!.push(item.order.createdAt);
  }

  // 3. For each customer, determine cohort month (first purchase date) and active subsequent months
  const cohortMap = new Map<string, { customers: Set<string>; subsequentOrders: Map<string, Set<string>> }>();

  const currentYearMonth = `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;

  for (const [custId, dates] of customerPurchaseMonths.entries()) {
    dates.sort((a, b) => a.getTime() - b.getTime());
    const firstDate = dates[0];
    const cohortYearMonth = `${firstDate.getFullYear()}-${(firstDate.getMonth() + 1).toString().padStart(2, '0')}`;

    if (firstDate < lookbackDate) {
      continue;
    }

    if (!cohortMap.has(cohortYearMonth)) {
      cohortMap.set(cohortYearMonth, {
        customers: new Set(),
        subsequentOrders: new Map(),
      });
    }

    const cohortEntry = cohortMap.get(cohortYearMonth)!;
    cohortEntry.customers.add(custId);

    // Record activity across subsequent calendar months
    for (const d of dates) {
      const purchaseYearMonth = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      const monthsDiff =
        (d.getFullYear() - firstDate.getFullYear()) * 12 + (d.getMonth() - firstDate.getMonth());

      if (monthsDiff >= 0 && monthsDiff <= 5) {
        const diffKey = `M${monthsDiff}`;
        if (!cohortEntry.subsequentOrders.has(diffKey)) {
          cohortEntry.subsequentOrders.set(diffKey, new Set());
        }
        cohortEntry.subsequentOrders.get(diffKey)!.add(custId);
      }
    }
  }

  // 4. Format into structured CohortData
  const sortedCohortMonths = Array.from(cohortMap.keys()).sort();
  const result: CohortData[] = [];

  for (const cohortMonth of sortedCohortMonths) {
    const entry = cohortMap.get(cohortMonth)!;
    const initialSize = entry.customers.size;
    const retentions: CohortMonthRetention[] = [];

    // Up to 6 months tracking (M0 through M5)
    for (let m = 0; m <= 5; m++) {
      const diffKey = `M${m}`;
      const activeCustomers = entry.subsequentOrders.get(diffKey)?.size || 0;
      const pct = initialSize > 0 ? Math.round((activeCustomers / initialSize) * 1000) / 10 : 0;

      retentions.push({
        monthIndex: m,
        periodLabel: m === 0 ? 'Month 0' : `+${m} mo`,
        retainedCount: activeCustomers,
        retentionPct: pct,
      });
    }

    result.push({
      cohortMonth,
      initialCustomerCount: initialSize,
      isIncomplete: cohortMonth === currentYearMonth,
      retentions,
    });
  }

  return result;
}
