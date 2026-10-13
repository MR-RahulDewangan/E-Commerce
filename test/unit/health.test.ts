import { describe, it, expect, vi } from 'vitest';
import { GET } from '@/app/api/health/route';
import { db } from '@/lib/db';

describe('Health Check Endpoint (/api/health)', () => {
  it('reports healthy status (HTTP 200) when database is reachable', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.services.database.status).toBe('connected');
    expect(typeof data.services.database.latencyMs).toBe('number');
    expect(data.paymentProvider).toBeDefined();
    expect(typeof data.uptimeSeconds).toBe('number');
  });

  it('accurately reports failure (HTTP 503) when database is unavailable', async () => {
    // Temporarily mock db.$queryRaw to simulate a database outage
    const queryRawSpy = vi.spyOn(db, '$queryRaw').mockRejectedValueOnce(new Error('Connection lost'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('degraded');
    expect(data.services.database.status).toBe('error');

    queryRawSpy.mockRestore();
  });
});
