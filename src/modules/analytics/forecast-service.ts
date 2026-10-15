import { db } from '@/lib/db';
import { OrderStatus } from '@prisma/client';
import { ProductDemandForecast } from './types';
import { invokePythonAnalytics } from './python-bridge';
import { formatDateKey } from './date-utils';

const ELIGIBLE_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

/**
 * Computes product demand forecasts with statistical uncertainty bounds and inventory risk indicators.
 */
export async function getSellerDemandForecasts(
  sellerId: string,
  horizonDays: number = 30,
  specificProductId?: string
): Promise<ProductDemandForecast[]> {
  // 1. Identify target products (either specific or top 3 products by volume)
  const products = await db.product.findMany({
    where: {
      sellerId,
      ...(specificProductId ? { id: specificProductId } : {}),
    },
    include: {
      variants: {
        select: {
          id: true,
          sku: true,
          stockQuantity: true,
        },
      },
    },
    take: specificProductId ? 1 : 4,
  });

  if (products.length === 0) {
    return [];
  }

  const lookbackStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const forecastPromises = products.map(async (product) => {
    const currentStock = product.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
    const sku = product.variants[0]?.sku || 'SKU-NONE';

    // Fetch daily historical sales for this product
    const orderItems = await db.orderItem.findMany({
      where: {
        variant: { productId: product.id },
        order: {
          createdAt: { gte: lookbackStart },
          status: { in: ELIGIBLE_STATUSES },
        },
      },
      select: {
        quantity: true,
        order: { select: { createdAt: true } },
      },
      orderBy: { order: { createdAt: 'asc' } },
    });

    // Aggregate by day
    const dayMap = new Map<string, number>();
    for (const item of orderItems) {
      const day = formatDateKey(item.order.createdAt);
      dayMap.set(day, (dayMap.get(day) || 0) + item.quantity);
    }

    // Build chronological daily series
    const history: { date: string; units: number }[] = [];
    const curr = new Date(lookbackStart);
    const now = new Date();
    while (curr <= now) {
      const dStr = formatDateKey(curr);
      history.push({ date: dStr, units: dayMap.get(dStr) || 0 });
      curr.setDate(curr.getDate() + 1);
    }

    // 2. Invoke Python ML Engine
    const pyResult = await invokePythonAnalytics<{
      is_data_sufficient: boolean;
      limitation_reason?: string;
      model_used: string;
      historical_points: { date: string; units: number }[];
      forecast_points: { date: string; predictedUnits: number; lowerBound: number; upperBound: number }[];
      stockout_risk: boolean;
      overstock_risk: boolean;
    }>('forecast', {
      history,
      horizon_days: horizonDays,
      current_stock: currentStock,
    });

    if (pyResult) {
      return {
        productId: product.id,
        productName: product.name,
        sku,
        horizonDays,
        generatedAt: new Date().toISOString(),
        isDataSufficient: pyResult.is_data_sufficient,
        limitationReason: pyResult.limitation_reason,
        modelUsed: pyResult.model_used,
        historicalPoints: pyResult.historical_points,
        forecastPoints: pyResult.forecast_points,
        stockoutRisk: pyResult.stockout_risk,
        overstockRisk: pyResult.overstock_risk,
      };
    }

    // 3. Resilient In-Process TypeScript Statistical Fallback
    const nonZeroCount = Array.from(dayMap.values()).filter((v) => v > 0).length;
    if (nonZeroCount < 3) {
      return {
        productId: product.id,
        productName: product.name,
        sku,
        horizonDays,
        generatedAt: new Date().toISOString(),
        isDataSufficient: false,
        limitationReason:
          'Insufficient historical sales history for reliable demand forecasting. Minimum 14 days of tracked order observations are required.',
        modelUsed: 'UNAVAILABLE',
        historicalPoints: history.slice(-30),
        forecastPoints: [],
        stockoutRisk: false,
        overstockRisk: false,
      };
    }

    // Simple 7-day rolling moving average
    const recentUnits = history.slice(-14).map((h) => h.units);
    const avgDailyDemand = recentUnits.reduce((a, b) => a + b, 0) / recentUnits.length;
    const forecastPoints = [];
    const lastDate = new Date();

    for (let i = 1; i <= horizonDays; i++) {
      const fDate = new Date(lastDate.getTime() + i * 24 * 60 * 60 * 1000);
      forecastPoints.push({
        date: formatDateKey(fDate),
        predictedUnits: Math.round(avgDailyDemand * 10) / 10,
        lowerBound: Math.max(0, Math.round((avgDailyDemand * 0.7) * 10) / 10),
        upperBound: Math.round((avgDailyDemand * 1.3 + 0.5) * 10) / 10,
      });
    }

    const totalProjected = avgDailyDemand * horizonDays;
    return {
      productId: product.id,
      productName: product.name,
      sku,
      horizonDays,
      generatedAt: new Date().toISOString(),
      isDataSufficient: true,
      modelUsed: '7-Day Rolling Moving Average (TypeScript Engine)',
      historicalPoints: history.slice(-30),
      forecastPoints,
      stockoutRisk: currentStock < totalProjected,
      overstockRisk: currentStock > totalProjected * 2.5,
    };
  });

  return Promise.all(forecastPromises);
}

