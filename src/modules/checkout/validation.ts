import { z } from 'zod';
import { PaymentProvider } from '@prisma/client';

export const INDIAN_PHONE_REGEX = /^(?:\+91[\-\s]?)?[0]?(91)?[6-9]\d{9}$/;
export const INDIAN_PIN_CODE_REGEX = /^[1-9][0-9]{5}$/;

export const CustomerInputSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long').max(100),
  email: z.string().trim().email('Invalid email address format'),
  phone: z
    .string()
    .trim()
    .regex(
      INDIAN_PHONE_REGEX,
      'Invalid Indian mobile phone number. Must be a 10-digit number optionally prefixed with +91.'
    ),
});

export const ShippingAddressInputSchema = z.object({
  recipientName: z.string().trim().min(2, 'Recipient name is required').max(100),
  phoneNumber: z
    .string()
    .trim()
    .regex(
      INDIAN_PHONE_REGEX,
      'Invalid recipient phone number. Must be a 10-digit number optionally prefixed with +91.'
    ),
  streetLine1: z.string().trim().min(3, 'Address line 1 is required').max(200),
  streetLine2: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().min(2, 'City is required').max(100),
  stateProvince: z.string().trim().min(2, 'State / Province is required').max(100),
  postalCode: z
    .string()
    .trim()
    .regex(INDIAN_PIN_CODE_REGEX, 'Postal code must be a valid 6-digit Indian PIN code.'),
  countryCode: z.string().trim().length(2).default('IN'),
});

export const CreateCheckoutOrderSchema = z.object({
  customer: CustomerInputSchema,
  shippingAddress: ShippingAddressInputSchema,
  paymentMethod: z.nativeEnum(PaymentProvider, {
    errorMap: () => ({ message: 'Payment method must be one of: MOCK, RAZORPAY, COD' }),
  }),
  cartSessionToken: z.string().optional(),
  items: z
    .array(
      z.object({
        variantId: z.string().uuid('Invalid variant ID format'),
        quantity: z.number().int().positive('Quantity must be at least 1'),
      })
    )
    .optional(),
});

export const VerifyPaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  gatewayOrderId: z.string().min(1, 'Gateway order ID is required'),
  gatewayPaymentId: z.string().min(1, 'Gateway payment ID is required'),
  signature: z.string().min(1, 'Payment signature is required'),
});

export type CustomerInput = z.infer<typeof CustomerInputSchema>;
export type ShippingAddressInput = z.infer<typeof ShippingAddressInputSchema>;
export type CreateCheckoutOrderInput = z.infer<typeof CreateCheckoutOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof VerifyPaymentSchema>;
