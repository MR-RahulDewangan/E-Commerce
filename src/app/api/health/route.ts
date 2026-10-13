import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const startTime = Date.now();

export async function GET() {
  const timestamp = new Date().toISOString();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const paymentProvider = process.env.PAYMENT_PROVIDER || 'MOCK';

  let dbStatus = 'disconnected';
  let dbLatencyMs: number | null = null;

  try {
    const startDb = Date.now();
    await db.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - startDb;
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'error';
  }

  const isHealthy = dbStatus === 'connected';

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp,
      uptimeSeconds,
      paymentProvider,
      services: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
      },
    },
    { status: isHealthy ? 200 : 503 }
  );
}
