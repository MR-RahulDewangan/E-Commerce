import { z } from 'zod';

export const addToCartSchema = z.object({
  variantId: z.string({ required_error: 'variantId is required' }).uuid('Invalid variant ID format'),
  quantity: z.coerce
    .number()
    .int()
    .min(1, 'Quantity must be at least 1')
    .max(20, 'Maximum 20 units allowed per item')
    .default(1),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;

export const updateCartItemSchema = z.object({
  quantity: z.coerce
    .number()
    .int()
    .min(0, 'Quantity cannot be negative')
    .max(20, 'Maximum 20 units allowed per item'),
});

export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
