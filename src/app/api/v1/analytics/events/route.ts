import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { analyticsEventIngestSchema } from '@/modules/analytics/validation';
import { recordAnalyticsEvent } from '@/modules/analytics/funnel-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = analyticsEventIngestSchema.safeParse(body);

    if (!parsed.success) {
      return apiError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid analytics event payload.',
        details: parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          issue: i.message,
        })),
        status: 400,
      });
    }

    const recorded = await recordAnalyticsEvent(parsed.data);

    return apiSuccess({ recorded }, 201);
  } catch (error) {
    console.error('Error ingesting analytics event:', error);
    // Return success to never break client beacons
    return apiSuccess({ recorded: false }, 200);
  }
}
