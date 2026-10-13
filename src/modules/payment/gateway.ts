import crypto from 'node:crypto';
import { timingSafeCompare, generateHmacSha256 } from '@/modules/auth/crypto';

export type PaymentProviderType = 'MOCK' | 'RAZORPAY' | 'COD';

export interface CreatePaymentOrderInput {
  orderId: string;
  orderNumber: string;
  amountPaise: number;
  currency?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface PaymentOrderResult {
  gatewayOrderId: string;
  amountPaise: number;
  currency: string;
  provider: PaymentProviderType;
  keyId?: string;
}

export interface VerifyPaymentInput {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  signature: string;
}

export interface RefundInput {
  gatewayPaymentId: string;
  amountPaise: number;
  reason?: string;
}

export interface RefundResult {
  refundId: string;
  gatewayPaymentId: string;
  amountPaise: number;
  status: 'PROCESSED' | 'FAILED';
}

export interface IPaymentGateway {
  readonly provider: PaymentProviderType;
  createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<boolean>;
  processRefund(input: RefundInput): Promise<RefundResult>;
}

/**
 * Mock Payment Gateway for local development and CI testing.
 * Requires ZERO external credentials and executes synchronously without network requests.
 */
export class MockPaymentGateway implements IPaymentGateway {
  readonly provider: PaymentProviderType = 'MOCK';
  private mockSecret = 'mock_gateway_secret_key_123';

  async createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderResult> {
    if (input.amountPaise <= 0) {
      throw new Error('Order amount must be greater than zero.');
    }
    const gatewayOrderId = `mock_order_${input.orderId.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}`;
    return {
      gatewayOrderId,
      amountPaise: input.amountPaise,
      currency: input.currency || 'INR',
      provider: this.provider,
      keyId: 'mock_publishable_key',
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<boolean> {
    if (!input.gatewayOrderId || !input.gatewayPaymentId || !input.signature) {
      return false;
    }
    // Expected signature: HMAC-SHA256(gatewayOrderId|gatewayPaymentId, mockSecret)
    // Or accept 'mock_valid_signature' for direct test convenience
    if (input.signature === 'mock_valid_signature') {
      return true;
    }
    const expected = generateHmacSha256(
      `${input.gatewayOrderId}|${input.gatewayPaymentId}`,
      this.mockSecret
    );
    return timingSafeCompare(expected, input.signature);
  }

  async processRefund(input: RefundInput): Promise<RefundResult> {
    if (input.amountPaise <= 0) {
      throw new Error('Refund amount must be greater than zero.');
    }
    return {
      refundId: `mock_ref_${Date.now()}`,
      gatewayPaymentId: input.gatewayPaymentId,
      amountPaise: input.amountPaise,
      status: 'PROCESSED',
    };
  }
}

/**
 * Cash on Delivery (COD) Gateway for offline payment settlements.
 */
export class CashOnDeliveryGateway implements IPaymentGateway {
  readonly provider: PaymentProviderType = 'COD';

  async createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderResult> {
    if (input.amountPaise <= 0) {
      throw new Error('Order amount must be greater than zero.');
    }
    return {
      gatewayOrderId: `cod_order_${input.orderNumber}`,
      amountPaise: input.amountPaise,
      currency: input.currency || 'INR',
      provider: this.provider,
    };
  }

  async verifyPayment(_input: VerifyPaymentInput): Promise<boolean> {
    // COD orders are confirmed without immediate digital payment
    return true;
  }

  async processRefund(input: RefundInput): Promise<RefundResult> {
    return {
      refundId: `cod_ref_${Date.now()}`,
      gatewayPaymentId: input.gatewayPaymentId,
      amountPaise: input.amountPaise,
      status: 'PROCESSED',
    };
  }
}

/**
 * Razorpay Gateway for Indian production / sandbox payments.
 */
export class RazorpayGateway implements IPaymentGateway {
  readonly provider: PaymentProviderType = 'RAZORPAY';
  private keyId: string;
  private keySecret: string;

  constructor(keyId?: string, keySecret?: string) {
    this.keyId = keyId || process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = keySecret || process.env.RAZORPAY_KEY_SECRET || '';
  }

  async createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderResult> {
    if (!this.keyId || !this.keySecret) {
      throw new Error(
        'Razorpay credentials missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables, or switch to PAYMENT_PROVIDER=MOCK.'
      );
    }
    if (input.amountPaise <= 0) {
      throw new Error('Order amount must be greater than zero.');
    }

    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: input.amountPaise,
        currency: input.currency || 'INR',
        receipt: input.orderNumber,
        notes: {
          orderId: input.orderId,
          customerName: input.customer.name,
          customerEmail: input.customer.email,
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Razorpay order creation failed (HTTP ${response.status}): ${errBody}`);
    }

    const data = await response.json();
    return {
      gatewayOrderId: data.id,
      amountPaise: data.amount,
      currency: data.currency,
      provider: this.provider,
      keyId: this.keyId,
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<boolean> {
    if (!this.keySecret) {
      throw new Error('Razorpay secret missing for payment verification.');
    }
    const expected = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${input.gatewayOrderId}|${input.gatewayPaymentId}`)
      .digest('hex');

    return timingSafeCompare(expected, input.signature);
  }

  async processRefund(input: RefundInput): Promise<RefundResult> {
    if (!this.keyId || !this.keySecret) {
      throw new Error('Razorpay credentials missing for refund processing.');
    }
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const response = await fetch(`https://api.razorpay.com/v1/payments/${input.gatewayPaymentId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: input.amountPaise,
        notes: {
          reason: input.reason || 'Customer refund',
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Razorpay refund failed (HTTP ${response.status}): ${errBody}`);
    }

    const data = await response.json();
    return {
      refundId: data.id,
      gatewayPaymentId: input.gatewayPaymentId,
      amountPaise: data.amount,
      status: 'PROCESSED',
    };
  }
}

/**
 * Factory function to retrieve payment gateway based on active provider.
 */
export function getPaymentGateway(providerOverride?: PaymentProviderType): IPaymentGateway {
  const provider = (providerOverride || process.env.PAYMENT_PROVIDER || 'MOCK').toUpperCase() as PaymentProviderType;

  switch (provider) {
    case 'RAZORPAY':
      return new RazorpayGateway();
    case 'COD':
      return new CashOnDeliveryGateway();
    case 'MOCK':
    default:
      return new MockPaymentGateway();
  }
}
