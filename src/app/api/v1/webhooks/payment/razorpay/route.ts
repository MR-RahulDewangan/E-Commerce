import { NextRequest, NextResponse } from 'next/server';
import { processRazorpayWebhook, WebhookError } from '@/modules/payment/webhook';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    const result = await processRazorpayWebhook(rawBody, signature);

    return NextResponse.json({ received: result.received }, { status: 200 });
  } catch (error) {
    if (error instanceof WebhookError) {
      return NextResponse.json(
        {
          received: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: error.statusCode }
      );
    }

    console.error('Unhandled Razorpay webhook processing error:', error);
    return NextResponse.json(
      {
        received: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Webhook processing failed.',
        },
      },
      { status: 500 }
    );
  }
}
