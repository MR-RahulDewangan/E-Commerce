import { z } from 'zod';

export const dateRangeQuerySchema = z.object({
  range: z.enum(['7d', '30d', '90d', '1y', 'custom']).default('30d'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const analyticsEventIngestSchema = z.object({
  eventType: z.enum([
    'HOMEPAGE_VIEW',
    'PRODUCT_VIEW',
    'ADD_TO_CART',
    'CHECKOUT_INITIATED',
    'PURCHASE_COMPLETED',
  ]),
  sessionId: z.string().min(8).max(128),
  userId: z.string().uuid().optional(),
  sellerId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const pricingApprovalSchema = z.object({
  recommendationId: z.string().uuid(),
  action: z.enum(['APPROVE', 'REJECT']),
});

export const generatePricingSchema = z.object({
  targetMarginPct: z.number().min(0).max(100).default(35),
  minMarginFloorPct: z.number().min(0).max(50).default(15),
});

export const demandForecastQuerySchema = z.object({
  horizonDays: z.coerce.number().int().min(7).max(90).default(30),
  productId: z.string().uuid().optional(),
});
