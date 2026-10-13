import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { verifyRazorpayWebhookSignature } from '@/modules/payment/webhook';

describe('Razorpay Webhook Signature Verification (Unit)', () => {
  const secret = 'test_webhook_secret_key_999';

  it('validates a correctly signed webhook payload', () => {
    const payload = JSON.stringify({ event: 'payment.captured', id: 'evt_12345' });
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const isValid = verifyRazorpayWebhookSignature(payload, signature, secret);
    expect(isValid).toBe(true);
  });

  it('rejects an altered or forged payload signature', () => {
    const payload = JSON.stringify({ event: 'payment.captured', id: 'evt_12345' });
    const tamperedPayload = JSON.stringify({ event: 'payment.captured', id: 'evt_tampered' });
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const isValid = verifyRazorpayWebhookSignature(tamperedPayload, signature, secret);
    expect(isValid).toBe(false);
  });

  it('rejects missing or empty signature', () => {
    const payload = JSON.stringify({ event: 'payment.captured' });
    expect(verifyRazorpayWebhookSignature(payload, '', secret)).toBe(false);
    expect(verifyRazorpayWebhookSignature(payload, null, secret)).toBe(false);
    expect(verifyRazorpayWebhookSignature(payload, undefined, secret)).toBe(false);
  });

  it('rejects empty payload body', () => {
    const signature = crypto.createHmac('sha256', secret).update('').digest('hex');
    expect(verifyRazorpayWebhookSignature('', signature, secret)).toBe(false);
  });
});
