import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import {
  MockPaymentGateway,
  CashOnDeliveryGateway,
  RazorpayGateway,
  getPaymentGateway,
} from '@/modules/payment/gateway';

describe('Pluggable Payment Gateway Engine', () => {
  const sampleCustomer = {
    name: 'Pooja Sharma',
    email: 'pooja@example.in',
    phone: '+919876543210',
  };

  describe('MockPaymentGateway (Zero-Credential Mode)', () => {
    const gateway = new MockPaymentGateway();

    it('creates a mock order with correct amount in paise', async () => {
      const result = await gateway.createOrder({
        orderId: 'ord-12345',
        orderNumber: 'ORD-20261013-0001',
        amountPaise: 149900,
        currency: 'INR',
        customer: sampleCustomer,
      });

      expect(result.gatewayOrderId).toContain('mock_order_ord12345');
      expect(result.amountPaise).toBe(149900);
      expect(result.currency).toBe('INR');
      expect(result.provider).toBe('MOCK');
    });

    it('rejects order with zero or negative amount', async () => {
      await expect(
        gateway.createOrder({
          orderId: 'ord-bad',
          orderNumber: 'ORD-BAD',
          amountPaise: 0,
          customer: sampleCustomer,
        })
      ).rejects.toThrow('greater than zero');
    });

    it('verifies mock payment signatures and rejects invalid ones', async () => {
      const orderId = 'mock_order_123';
      const paymentId = 'mock_pay_456';
      const secret = 'mock_gateway_secret_key_123';
      const validSig = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const isValid = await gateway.verifyPayment({
        gatewayOrderId: orderId,
        gatewayPaymentId: paymentId,
        signature: validSig,
      });
      expect(isValid).toBe(true);

      const isInvalid = await gateway.verifyPayment({
        gatewayOrderId: orderId,
        gatewayPaymentId: paymentId,
        signature: 'invalid_forged_signature',
      });
      expect(isInvalid).toBe(false);
    });

    it('processes mock refunds successfully', async () => {
      const refund = await gateway.processRefund({
        gatewayPaymentId: 'mock_pay_456',
        amountPaise: 149900,
        reason: 'Customer requested cancellation',
      });

      expect(refund.status).toBe('PROCESSED');
      expect(refund.refundId.startsWith('mock_ref_')).toBe(true);
      expect(refund.amountPaise).toBe(149900);
    });
  });

  describe('CashOnDeliveryGateway (Domestic Retail)', () => {
    const gateway = new CashOnDeliveryGateway();

    it('creates a COD order requiring offline settlement', async () => {
      const result = await gateway.createOrder({
        orderId: 'ord-cod-1',
        orderNumber: 'ORD-20261013-COD-01',
        amountPaise: 89900,
        customer: sampleCustomer,
      });

      expect(result.provider).toBe('COD');
      expect(result.gatewayOrderId).toBe('cod_order_ORD-20261013-COD-01');
      expect(result.amountPaise).toBe(89900);
    });

    it('verifies COD order automatically without digital transaction', async () => {
      const isValid = await gateway.verifyPayment({
        gatewayOrderId: 'cod_order_1',
        gatewayPaymentId: 'cod_pending',
        signature: 'n/a',
      });
      expect(isValid).toBe(true);
    });
  });

  describe('RazorpayGateway Cryptographic Verification', () => {
    const secret = 'test_secret_key_xyz123';
    const razorpay = new RazorpayGateway('rzp_test_key', secret);

    it('verifies genuine Razorpay HMAC-SHA256 signatures', async () => {
      const orderId = 'order_M12345';
      const paymentId = 'pay_P67890';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const isValid = await razorpay.verifyPayment({
        gatewayOrderId: orderId,
        gatewayPaymentId: paymentId,
        signature,
      });
      expect(isValid).toBe(true);
    });

    it('rejects tampered payment signatures', async () => {
      const isInvalid = await razorpay.verifyPayment({
        gatewayOrderId: 'order_M12345',
        gatewayPaymentId: 'pay_P67890',
        signature: 'tampered_signature_hex_value',
      });
      expect(isInvalid).toBe(false);
    });
  });

  describe('getPaymentGateway Factory', () => {
    it('returns MockPaymentGateway by default', () => {
      const gw = getPaymentGateway('MOCK');
      expect(gw.provider).toBe('MOCK');
    });

    it('returns CashOnDeliveryGateway when requested', () => {
      const gw = getPaymentGateway('COD');
      expect(gw.provider).toBe('COD');
    });

    it('returns RazorpayGateway when requested', () => {
      const gw = getPaymentGateway('RAZORPAY');
      expect(gw.provider).toBe('RAZORPAY');
    });
  });
});
