import { NextRequest } from 'next/server';
import { requireSellerOrAdmin } from '@/modules/auth/guards';
import { getSellerProfile } from '@/modules/seller/service';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getSellerRFMAnalysis } from '@/modules/analytics/rfm-service';
import { getSellerCohortRetention } from '@/modules/analytics/cohort-service';

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
    const lookbackDays = parseInt(searchParams.get('windowDays') || '365', 10);

    const [rfm, cohorts] = await Promise.all([
      getSellerRFMAnalysis(seller.id, lookbackDays),
      getSellerCohortRetention(seller.id, 6),
    ]);

    return apiSuccess({
      rfm,
      cohorts,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return apiError({
        code: error.code || 'AUTH_ERROR',
        message: error.message,
        status: error.statusCode,
      });
    }

    console.error('Failed to aggregate seller customer intelligence:', error);
    return apiError({
      code: 'INTERNAL_ERROR',
      message: 'Failed to aggregate seller customer intelligence.',
      status: 500,
    });
  }
}
