import { releaseExpiredReservations } from './reservation';

export interface CleanupResult {
  releasedCount: number;
  timestamp: string;
  durationMs: number;
}

/**
 * Runs the background stock reservation cleanup job.
 * Finds all stock reservations with status 'HELD' and expiresAt <= now,
 * atomically restores the reserved quantity to the variant's stockQuantity,
 * and updates the reservation status to 'RELEASED'.
 */
export async function runStockReservationCleanupWorker(): Promise<CleanupResult> {
  const startTime = Date.now();
  const releasedCount = await releaseExpiredReservations();
  const durationMs = Date.now() - startTime;

  return {
    releasedCount,
    timestamp: new Date().toISOString(),
    durationMs,
  };
}
