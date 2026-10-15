import { NextRequest } from 'next/server';
import { requireSellerOrAdmin } from '@/modules/auth/guards';
import { getSellerProfile } from '@/modules/seller/service';
import { apiError, apiSuccess } from '@/lib/api-response';
import {
  getSellerPricingRecommendations,
  generateSellerPricingRecommendations,
  applyOrRejectPricingRecommendation,
} from '@/modules/analytics/pricing-service';
import { pricingApprovalSchema, generatePricingSchema } from '@/modules/analytics/validation';

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

    const recommendations = await getSellerPricingRecommendations(seller.id);

    // If none exist yet, automatically generate recommendations for the seller
    if (recommendations.length === 0) {
      const generated = await generateSellerPricingRecommendations(seller.id);
      return apiSuccess({ recommendations: generated });
    }

    return apiSuccess({ recommendations });
  } catch (error: any) {
    if (error.statusCode) {
      return apiError({
        code: error.code || 'AUTH_ERROR',
        message: error.message,
        status: error.statusCode,
      });
    }

    console.error('Failed to retrieve pricing recommendations:', error);
    return apiError({
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve pricing recommendations.',
      status: 500,
    });
  }
}

export async function POST(req: NextRequest) {
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

    const body = await req.json();

    // Check if this is an approval/rejection action or a generate request
    if (body.action === 'APPROVE' || body.action === 'REJECT') {
      const parsedApproval = pricingApprovalSchema.safeParse(body);
      if (!parsedApproval.success) {
        return apiError({
          code: 'VALIDATION_ERROR',
          message: 'Invalid pricing approval parameters.',
          details: parsedApproval.error.issues.map((i) => ({
            field: i.path.join('.'),
            issue: i.message,
          })),
          status: 400,
        });
      }

      const result = await applyOrRejectPricingRecommendation(
        seller.id,
        parsedApproval.data.recommendationId,
        parsedApproval.data.action
      );

      return apiSuccess(result);
    }

    // Otherwise generate fresh recommendations
    const parsedGen = generatePricingSchema.safeParse(body);
    const options = parsedGen.success ? parsedGen.data : {};
    const generated = await generateSellerPricingRecommendations(seller.id, options);

    return apiSuccess({
      generatedCount: generated.length,
      recommendations: generated,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return apiError({
        code: error.code || 'AUTH_ERROR',
        message: error.message,
        status: error.statusCode,
      });
    }

    console.error('Failed to process pricing recommendation:', error);
    return apiError({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to process pricing recommendation.',
      status: 500,
    });
  }
}
