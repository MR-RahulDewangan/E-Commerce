/**
 * Server-Authoritative GST & Cart Pricing Engine
 *
 * Operating Standard:
 * - All monetary calculations are performed strictly in integer Paise (1 INR = 100 paise).
 * - Prices displayed to customers are GST-inclusive (MRP).
 * - Standard GST rate: 18% (Intra-state: CGST 9% + SGST 9%; Inter-state: IGST 18%).
 * - Delivery charge: Free for orders >= ₹999 (99,900 paise); flat ₹70 (7,000 paise) otherwise.
 */

export const GST_RATE_PERCENT = 18;
export const FREE_SHIPPING_THRESHOLD_PAISE = 99900; // ₹999.00
export const STANDARD_SHIPPING_FEE_PAISE = 7000;    // ₹70.00
export const DEFAULT_STORE_STATE = 'Karnataka';

export interface CartPricedItem {
  variantId: string;
  name: string;
  sku: string;
  unitPricePaise: number; // Inclusive of GST
  quantity: number;
  totalPricePaise: number;
}

export interface PricingInput {
  items: Array<{
    variantId: string;
    name: string;
    sku: string;
    unitPricePaise: number;
    quantity: number;
  }>;
  destinationState?: string;
  storeOriginState?: string;
  discountPaise?: number;
}

export interface TaxBreakdown {
  isInterState: boolean;
  gstRatePercent: number;
  baseAmountPaise: number;
  totalGstPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
}

export interface CartPricingSummary {
  items: CartPricedItem[];
  subtotalPaise: number;
  discountPaise: number;
  subtotalAfterDiscountPaise: number;
  shippingFeePaise: number;
  totalPayablePaise: number;
  tax: TaxBreakdown;
  formatted: {
    subtotalInr: string;
    discountInr: string;
    shippingFeeInr: string;
    totalPayableInr: string;
    totalGstInr: string;
  };
}

/**
 * Format integer paise into human-readable INR string.
 */
export function formatPaiseToInr(paise: number): string {
  const inr = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(inr);
}

/**
 * Calculate 18% inclusive GST breakdown based on origin and destination state.
 */
export function calculateGstBreakdown(
  totalInclusivePaise: number,
  destinationState?: string,
  storeOriginState: string = DEFAULT_STORE_STATE
): TaxBreakdown {
  if (totalInclusivePaise <= 0) {
    return {
      isInterState: false,
      gstRatePercent: GST_RATE_PERCENT,
      baseAmountPaise: 0,
      totalGstPaise: 0,
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
    };
  }

  // Base = Inclusive / (1 + Rate)
  const baseAmountPaise = Math.round(totalInclusivePaise / (1 + GST_RATE_PERCENT / 100));
  const totalGstPaise = totalInclusivePaise - baseAmountPaise;

  const normalizedOrigin = storeOriginState.trim().toLowerCase();
  const normalizedDestination = (destinationState || storeOriginState).trim().toLowerCase();
  const isInterState = normalizedOrigin !== normalizedDestination;

  if (isInterState) {
    return {
      isInterState: true,
      gstRatePercent: GST_RATE_PERCENT,
      baseAmountPaise,
      totalGstPaise,
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: totalGstPaise,
    };
  }

  // Intra-state split: CGST 9% + SGST 9%
  const cgstPaise = Math.round(totalGstPaise / 2);
  const sgstPaise = totalGstPaise - cgstPaise;

  return {
    isInterState: false,
    gstRatePercent: GST_RATE_PERCENT,
    baseAmountPaise,
    totalGstPaise,
    cgstPaise,
    sgstPaise,
    igstPaise: 0,
  };
}

/**
 * Compute server-authoritative cart pricing, taxes, discounts, and delivery fees.
 */
export function calculateCartPricing(input: PricingInput): CartPricingSummary {
  const storeOrigin = input.storeOriginState || DEFAULT_STORE_STATE;
  const destination = input.destinationState || storeOrigin;

  // 1. Process items and validate quantities
  const pricedItems: CartPricedItem[] = input.items.map((item) => {
    if (item.quantity <= 0) {
      throw new Error(`Invalid item quantity for variant ${item.variantId}: quantity must be positive.`);
    }
    if (item.unitPricePaise < 0) {
      throw new Error(`Invalid unit price for variant ${item.variantId}: price cannot be negative.`);
    }
    const totalPricePaise = Math.round(item.unitPricePaise * item.quantity);
    return {
      variantId: item.variantId,
      name: item.name,
      sku: item.sku,
      unitPricePaise: Math.round(item.unitPricePaise),
      quantity: item.quantity,
      totalPricePaise,
    };
  });

  // 2. Compute subtotal
  const subtotalPaise = pricedItems.reduce((acc, item) => acc + item.totalPricePaise, 0);

  // 3. Apply discounts (cannot exceed subtotal)
  const discountInput = Math.max(0, Math.round(input.discountPaise || 0));
  const discountPaise = Math.min(discountInput, subtotalPaise);
  const subtotalAfterDiscountPaise = subtotalPaise - discountPaise;

  // 4. Compute shipping fee based on threshold
  let shippingFeePaise = 0;
  if (subtotalAfterDiscountPaise > 0 && subtotalAfterDiscountPaise < FREE_SHIPPING_THRESHOLD_PAISE) {
    shippingFeePaise = STANDARD_SHIPPING_FEE_PAISE;
  }

  // 5. Total payable
  const totalPayablePaise = subtotalAfterDiscountPaise + shippingFeePaise;

  // 6. Compute tax on items
  const tax = calculateGstBreakdown(subtotalAfterDiscountPaise, destination, storeOrigin);

  return {
    items: pricedItems,
    subtotalPaise,
    discountPaise,
    subtotalAfterDiscountPaise,
    shippingFeePaise,
    totalPayablePaise,
    tax,
    formatted: {
      subtotalInr: formatPaiseToInr(subtotalPaise),
      discountInr: formatPaiseToInr(discountPaise),
      shippingFeeInr: formatPaiseToInr(shippingFeePaise),
      totalPayableInr: formatPaiseToInr(totalPayablePaise),
      totalGstInr: formatPaiseToInr(tax.totalGstPaise),
    },
  };
}
