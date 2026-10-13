import { NextRequest, NextResponse } from 'next/server';
import { runStockReservationCleanupWorker } from '@/modules/inventory/worker';

/**
 * Endpoint for running the stock reservation release worker.
 * Can be invoked by external cron schedulers (e.g., Vercel Cron, GitHub Actions, AWS EventBridge, local crontab).
 * Optionally protected by Bearer CRON_SECRET if configured.
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing authorization token' },
        { status: 401 }
      );
    }
  }

  try {
    const result = await runStockReservationCleanupWorker();
    return NextResponse.json({
      success: true,
      message: `Successfully released ${result.releasedCount} expired stock reservation(s)`,
      data: result,
    });
  } catch (error) {
    console.error('Stock reservation cleanup worker error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown worker failure',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
