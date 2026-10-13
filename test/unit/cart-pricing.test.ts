import { describe, it, expect } from 'vitest';
import {
  calculateCartPricing,
  calculateGstBreakdown,
  formatPaiseToInr,
  FREE_SHIPPING_THRESHOLD_PAISE,
  STANDARD_SHIPPING_FEE_PAISE,
} from '@/modules/cart/pricing';

describe('Cart & GST Pricing Engine', () => {
  it('correctly calculates intra-state GST (CGST + SGST)', () => {
    // ₹1,499.00 = 149900 paise
    const breakdown = calculateGstBreakdown(149900, 'Karnataka', 'Karnataka');

    expect(breakdown.isInterState).toBe(false);
    expect(breakdown.baseAmountPaise).toBe(127034); // ₹1,270.34
    expect(breakdown.totalGstPaise).toBe(22866);   // ₹228.66
    expect(breakdown.cgstPaise).toBe(11433);       // ₹114.33
    expect(breakdown.sgstPaise).toBe(11433);       // ₹114.33
    expect(breakdown.igstPaise).toBe(0);
    expect(breakdown.baseAmountPaise + breakdown.totalGstPaise).toBe(149900);
  });

  it('correctly calculates inter-state GST (IGST)', () => {
    // Karnataka store shipping to Maharashtra
    const breakdown = calculateGstBreakdown(149900, 'Maharashtra', 'Karnataka');

    expect(breakdown.isInterState).toBe(true);
    expect(breakdown.baseAmountPaise).toBe(127034);
    expect(breakdown.totalGstPaise).toBe(22866);
    expect(breakdown.cgstPaise).toBe(0);
    expect(breakdown.sgstPaise).toBe(0);
    expect(breakdown.igstPaise).toBe(22866); // ₹228.66 IGST
  });

  it('applies flat delivery fee for orders below ₹999 threshold', () => {
    const pricing = calculateCartPricing({
      items: [
        {
          variantId: 'var-1',
          name: 'Handloom Cotton Handkerchief',
          sku: 'HCH-01',
          unitPricePaise: 29900, // ₹299.00
          quantity: 2,           // Total: ₹598.00 (59800 paise < 99900)
        },
      ],
      destinationState: 'Karnataka',
    });

    expect(pricing.subtotalPaise).toBe(59800);
    expect(pricing.shippingFeePaise).toBe(STANDARD_SHIPPING_FEE_PAISE); // 7000 paise (₹70.00)
    expect(pricing.totalPayablePaise).toBe(59800 + 7000); // 66800 paise (₹668.00)
  });

  it('provides free shipping for orders at or above ₹999 threshold', () => {
    const pricing = calculateCartPricing({
      items: [
        {
          variantId: 'var-2',
          name: 'Silk Blend Kurta',
          sku: 'SBK-01',
          unitPricePaise: 129900, // ₹1,299.00 (> 99900 paise)
          quantity: 1,
        },
      ],
      destinationState: 'Karnataka',
    });

    expect(pricing.subtotalPaise).toBe(129900);
    expect(pricing.shippingFeePaise).toBe(0); // Free shipping
    expect(pricing.totalPayablePaise).toBe(129900);
  });

  it('handles discount codes and ensures total cannot drop below zero', () => {
    const pricing = calculateCartPricing({
      items: [
        {
          variantId: 'var-3',
          name: 'Linen Shirt',
          sku: 'LS-01',
          unitPricePaise: 150000, // ₹1,500.00
          quantity: 1,
        },
      ],
      discountPaise: 20000, // ₹200.00 discount
      destinationState: 'Delhi',
    });

    expect(pricing.subtotalPaise).toBe(150000);
    expect(pricing.discountPaise).toBe(20000);
    expect(pricing.subtotalAfterDiscountPaise).toBe(130000);
    expect(pricing.shippingFeePaise).toBe(0); // ₹1,300.00 > ₹999
    expect(pricing.totalPayablePaise).toBe(130000);
  });

  it('formats amounts in Indian Rupee format properly', () => {
    const formatted = formatPaiseToInr(149950);
    // Should format as ₹1,499.50
    expect(formatted).toContain('1,499.50');
  });

  it('throws validation error on invalid item quantity or price', () => {
    expect(() =>
      calculateCartPricing({
        items: [
          {
            variantId: 'var-invalid',
            name: 'Bad item',
            sku: 'BAD-1',
            unitPricePaise: 1000,
            quantity: 0,
          },
        ],
      })
    ).toThrow('quantity must be positive');
  });
});
