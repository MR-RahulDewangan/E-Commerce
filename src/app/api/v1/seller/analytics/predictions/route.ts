import { NextRequest } from 'next/server';
import { requireSellerOrAdmin } from '@/modules/auth/guards';
import { getSellerProfile } from '@/modules/seller/service';
import { apiError, apiSuccess } from '@/lib/api-response';
import { demandForecastQuerySchema } from '@/modules/analytics/validation';
import { getSellerDemandForecasts } from '@/modules/analytics/forecast-service';
import { getSellerChurnPrediction } from '@/modules/analytics/churn-service';

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
    const parsedQuery = demandForecastQuerySchema.safeParse({
      horizonDays: searchParams.get('horizonDays') || 30,
      productId: searchParams.get('productId') || undefined,
    });

    if (!parsedQuery.success) {
      return apiError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid forecast query parameters.',
        details: parsedQuery.error.issues.map((i) => ({
          field: i.path.join('.'),
          issue: i.message,
        })),
        status: 400,
      });
    }

    const { horizonDays, productId } = parsedQuery.data;

    const [forecasts, churn] = await Promise.all([
      getSellerDemandForecasts(seller.id, horizonDays, productId),
      getSellerChurnPrediction(seller.id),
    ]);

    return apiSuccess({
      forecasts,
      churn,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return apiError({
        code: error.code || 'AUTH_ERROR',
        message: error.message,
        status: error.statusCode,
      });
    }

    console.error('Failed to generate seller predictions:', error);
    return apiError({
      code: 'INTERNAL_ERROR',
      message: 'Failed to generate predictive intelligence.',
      status: 500,
    });
  }
}
