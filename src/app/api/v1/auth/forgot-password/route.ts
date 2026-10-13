import { NextRequest } from 'next/server';
import { createPasswordResetToken } from '@/modules/auth/password-reset';
import { apiSuccess, apiError } from '@/lib/api-response';
import { z } from 'zod';

const ForgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address format.'),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => null);
    const parsed = ForgotPasswordSchema.safeParse(rawBody);

    if (!parsed.success) {
      return apiError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid email address.',
        status: 422,
      });
    }

    const token = await createPasswordResetToken(parsed.data.email);

    // Generic response to prevent account enumeration
    return apiSuccess(
      {
        data: {
          message: 'If the account exists, a password reset link has been generated.',
          // Expose resetToken in non-production for testing convenience
          ...(process.env.NODE_ENV !== 'production' && token ? { resetToken: token } : {}),
        },
      },
      200
    );
  } catch (error) {
    console.error('Unhandled forgot-password error:', error);
    return apiError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to initiate password reset.',
      status: 500,
    });
  }
}
