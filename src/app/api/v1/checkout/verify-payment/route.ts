import { NextRequest } from 'next/server';
import { VerifyPaymentSchema } from '@/modules/checkout/validation';
import { verifyCheckoutPayment, CheckoutError } from '@/modules/checkout/service';
import { InvalidOrderStateTransitionError } from '@/modules/order/state-machine';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => null);
    if (!rawBody) {
      return apiError({
        code: 'INVALID_JSON_BODY',
        message: 'Request body must be a valid JSON object.',
        status: 400,
      });
    }

    const validation = VerifyPaymentSchema.safeParse(rawBody);
    if (!validation.success) {
      const details = validation.error.errors.map((e) => ({
        field: e.path.join('.'),
        issue: e.message,
      }));
      return apiError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid payment verification payload.',
        details,
        status: 422,
      });
    }

    const result = await verifyCheckoutPayment(validation.data);

    return apiSuccess({ data: result }, 200);
  } catch (error) {
    if (error instanceof CheckoutError) {
      return apiError({
        code: error.code,
        message: error.message,
        status: error.statusCode,
      });
    }

    if (error instanceof InvalidOrderStateTransitionError) {
      return apiError({
        code: 'INVALID_ORDER_STATE',
        message: error.message,
        status: 400,
      });
    }

    console.error('Unhandled checkout payment verification error:', error);
    return apiError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to verify payment.',
      status: 500,
    });
  }
}
