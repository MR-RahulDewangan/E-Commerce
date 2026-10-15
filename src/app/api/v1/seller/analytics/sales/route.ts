import { NextRequest } from 'next/server';
import { requireSellerOrAdmin } from '@/modules/auth/guards';
import { getSellerProfile } from '@/modules/seller/service';
import { apiError, apiSuccess } from '@/lib/api-response';
import { dateRangeQuerySchema } from '@/modules/analytics/validation';
import { resolveDateRange } from '@/modules/analytics/date-utils';
import {
  getSellerSalesKPIs,
  getSellerRevenueTrends,
  getSellerCategoryBreakdown,
  getSellerOrderDistributions,
} from '@/modules/analytics/sales-service';

export async function GET(req: NextRequest) {
  try {
    const user = await requireSellerOrAdmin(req);
    const seller = await getSellerProfile(user.id);

    if (!seller) {
      return apiError({
        code: 'SELLER_PROFILE_NOT_FOUND',
        message: 'No registered seller profile found for current user.',
        status: 404,
      });
    }

    const { searchParams } = new URL(req.url);
    const parsedQuery = dateRangeQuerySchema.safeParse({
      range: searchParams.get('range') || '30d',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    });

    if (!parsedQuery.success) {
      return apiError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid date range query parameters.',
        details: parsedQuery.error.issues.map((i) => ({
          field: i.path.join('.'),
          issue: i.message,
        })),
        status: 400,
      });
    }

    const { range, startDate, endDate } = parsedQuery.data;
    const resolvedRange = resolveDateRange(range, startDate, endDate);

    const [kpis, trends, categories, distributions] = await Promise.all([
      getSellerSalesKPIs(seller.id, resolvedRange),
      getSellerRevenueTrends(seller.id, resolvedRange),
      getSellerCategoryBreakdown(seller.id, resolvedRange),
      getSellerOrderDistributions(seller.id, resolvedRange),
    ]);

    return apiSuccess({
      period: {
        preset: range,
        startDate: resolvedRange.startDate.toISOString(),
        endDate: resolvedRange.endDate.toISOString(),
        days: resolvedRange.daysDiff,
      },
      kpis,
      trends,
      categories,
      distributions,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return apiError({
        code: error.code || 'AUTH_ERROR',
        message: error.message,
        status: error.statusCode,
      });
    }

    console.error('Failed to retrieve seller sales analytics:', error);
    return apiError({
      code: 'INTERNAL_ERROR',
      message: 'Failed to aggregate seller sales intelligence.',
      status: 500,
    });
  }
}
