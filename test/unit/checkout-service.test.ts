import { describe, it, expect } from 'vitest';
import {
  CustomerInputSchema,
  ShippingAddressInputSchema,
  CreateCheckoutOrderSchema,
  VerifyPaymentSchema,
} from '@/modules/checkout/validation';
import { generateOrderNumber, MAX_COD_AMOUNT_PAISE } from '@/modules/checkout/service';

describe('Checkout Validation & Service Units', () => {
  describe('Order Number Generation', () => {
    it('generates an order number with ORD-YYYYMMDD-XXXX format', () => {
      const orderNumber = generateOrderNumber();
      expect(orderNumber).toMatch(/^ORD-\d{8}-[A-F0-9]{4}$/);
    });

    it('generates distinct order numbers on successive invocations', () => {
      const num1 = generateOrderNumber();
      const num2 = generateOrderNumber();
      expect(num1).not.toBe(num2);
    });
  });

  describe('Customer Input Validation', () => {
    it('accepts valid customer with 10-digit Indian phone', () => {
      const valid = {
        name: 'Aarav Patel',
        email: 'aarav@example.in',
        phone: '9876543210',
      };
      const result = CustomerInputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('accepts customer with +91 prefixed phone', () => {
      const valid = {
        name: 'Aarav Patel',
        email: 'aarav@example.in',
        phone: '+919876543210',
      };
      const result = CustomerInputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid email and phone number formats', () => {
      const invalid = {
        name: 'A',
        email: 'not-an-email',
        phone: '12345',
      };
      const result = CustomerInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe('Shipping Address Input Validation', () => {
    it('accepts valid Indian shipping address with 6-digit PIN code', () => {
      const address = {
        recipientName: 'Pooja Sharma',
        phoneNumber: '+919876543210',
        streetLine1: 'Flat 402, Lotus Apartments',
        streetLine2: 'Indiranagar 100ft Road',
        city: 'Bengaluru',
        stateProvince: 'Karnataka',
        postalCode: '560038',
        countryCode: 'IN',
      };
      const result = ShippingAddressInputSchema.safeParse(address);
      expect(result.success).toBe(true);
    });

    it('rejects PIN code with leading zero or invalid length', () => {
      const invalid1 = ShippingAddressInputSchema.safeParse({
        recipientName: 'Pooja Sharma',
        phoneNumber: '9876543210',
        streetLine1: 'Road 1',
        city: 'Bengaluru',
        stateProvince: 'Karnataka',
        postalCode: '012345', // Starts with 0
      });
      expect(invalid1.success).toBe(false);

      const invalid2 = ShippingAddressInputSchema.safeParse({
        recipientName: 'Pooja Sharma',
        phoneNumber: '9876543210',
        streetLine1: 'Road 1',
        city: 'Bengaluru',
        stateProvince: 'Karnataka',
        postalCode: '56003', // 5 digits
      });
      expect(invalid2.success).toBe(false);
    });
  });

  describe('Payment Verification Schema', () => {
    it('accepts valid verify payment payload', () => {
      const valid = {
        orderId: 'ord_12345',
        gatewayOrderId: 'order_ABC123',
        gatewayPaymentId: 'pay_XYZ789',
        signature: 'mock_valid_signature',
      };
      const result = VerifyPaymentSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects empty signature or gateway IDs', () => {
      const invalid = {
        orderId: 'ord_12345',
        gatewayOrderId: '',
        gatewayPaymentId: '',
        signature: '',
      };
      const result = VerifyPaymentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Business Rules Constraints', () => {
    it('enforces maximum COD limit at ₹5,000 (500,000 paise)', () => {
      expect(MAX_COD_AMOUNT_PAISE).toBe(500000);
    });
  });
});
