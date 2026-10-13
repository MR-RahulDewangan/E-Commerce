import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import {
  reserveStockForCheckout,
  consumeReservationsForOrder,
  InventoryError,
} from '@/modules/inventory/reservation';

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn(),
  },
}));

describe('Stock Reservation Engine (Unit Tests with Mocked DB)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reserveStockForCheckout', () => {
    it('successfully reserves stock when available', async () => {
      const mockTx = {
        $executeRaw: vi.fn().mockResolvedValue(1),
        stockReservation: {
          create: vi.fn().mockResolvedValue({
            id: 'res_123',
            variantId: 'var_abc',
            quantity: 2,
            status: 'HELD',
          }),
        },
      };

      vi.mocked(db.$transaction).mockImplementation(async (cb: any) => cb(mockTx));

      const result = await reserveStockForCheckout('sess_1', [
        { variantId: 'var_abc', quantity: 2 },
      ]);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('res_123');
      expect(mockTx.$executeRaw).toHaveBeenCalled();
      expect(mockTx.stockReservation.create).toHaveBeenCalled();
    });

    it('throws 409 INSUFFICIENT_STOCK when rowsUpdated is 0', async () => {
      const mockTx = {
        $executeRaw: vi.fn().mockResolvedValue(0), // 0 rows updated means stock was less than requested
        stockReservation: {
          create: vi.fn(),
        },
      };

      vi.mocked(db.$transaction).mockImplementation(async (cb: any) => cb(mockTx));

      await expect(
        reserveStockForCheckout('sess_1', [{ variantId: 'var_abc', quantity: 10 }])
      ).rejects.toThrowError(
        expect.objectContaining({
          code: 'INSUFFICIENT_STOCK',
          statusCode: 409,
        })
      );

      expect(mockTx.stockReservation.create).not.toHaveBeenCalled();
    });

    it('rejects invalid or zero quantity', async () => {
      await expect(
        reserveStockForCheckout('sess_1', [{ variantId: 'var_abc', quantity: 0 }])
      ).rejects.toThrowError(
        expect.objectContaining({
          code: 'INVALID_QUANTITY',
        })
      );
    });
  });

  describe('consumeReservationsForOrder', () => {
    it('marks reservations as CONSUMED and links orderId', async () => {
      const mockTx = {
        stockReservation: {
          updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      };

      vi.mocked(db.$transaction).mockImplementation(async (cb: any) => cb(mockTx));

      const count = await consumeReservationsForOrder('sess_1', 'ord_123');
      expect(count).toBe(2);
      expect(mockTx.stockReservation.updateMany).toHaveBeenCalledWith({
        where: { sessionToken: 'sess_1', status: 'HELD' },
        data: { status: 'CONSUMED', orderId: 'ord_123' },
      });
    });
  });
});
