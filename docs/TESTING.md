# Testing Strategy & Quality Assurance Plan

**Project:** Modern Enterprise E-Commerce Platform (India-Focused)  
**Document Version:** 1.1.0  
**Test Automation Target:** > 85% Code Coverage on Financial, Inventory & Payment Logic  

---

## 1. Testing Pyramid & Objectives

```
               /\
              /  \     End-to-End Tests (Playwright)
             / E2E\    - Full customer journey (Browse -> Add to Cart -> Checkout -> Mock Payment / COD)
            /------\
           / Integr \  Integration Tests (Vitest + Dockerized DB)
          /  ation   \ - API routes, DB transactions, Webhook signature verification, Idempotency
         /------------\
        /  Unit Tests  \ Unit Tests (Vitest)
       /                \- GST tax calculations, HMAC-SHA256 crypto math, Zod schemas, State machine
      --------------------
```

---

## 2. Test Types & Execution Strategy

### 2.1 Unit Testing (Vitest)
- **Scope:** Pure functions, domain calculations, crypto validators, schema parsing.
- **Critical Test Scenarios:**
  1. **GST Calculation Engine:**
     - Verifies correct extraction of 18% inclusive GST (`MRP ₹1,499.00 -> Base ₹1,270.34 + CGST ₹114.33 + SGST ₹114.33`).
     - Verifies intra-state (Karnataka -> Karnataka) breaks into CGST + SGST.
     - Verifies inter-state (Karnataka -> Maharashtra) maps to IGST.
  2. **Razorpay HMAC Signature Math:**
     - Verifies constant-time signature comparison with known test vectors.
     - Verifies that tampered payloads or wrong secrets fail validation.
  3. **Order State Machine:**
     - Confirms valid transitions (`PENDING` -> `PAID`, `PENDING` -> `AWAITING_PAYMENT`).
     - Verifies invalid transitions throw domain errors (e.g. `DELIVERED` -> `PENDING`).
  4. **Zod Schema Validations:**
     - Verifies 6-digit Indian PIN codes (`^\d{6}$`).
     - Verifies 10-digit Indian phone numbers (`^\+91[6-9]\d{9}$`).

### 2.2 Integration Testing (Vitest + PostgreSQL Test Database)
- **Scope:** Database transactions, stock reservations, idempotency deduplication.
- **Critical Test Scenarios:**
  1. **Pluggable Payment Gateway (Mock vs Razorpay):**
     - Confirms `MockPaymentGateway` creates orders and signs verifications without external network requests.
     - Confirms `CashOnDeliveryGateway` creates orders in `AWAITING_PAYMENT` state.
  2. **Webhook Idempotency:**
     - Submitting the same webhook payload twice returns `HTTP 200 OK` and does not deduct stock twice or create duplicate order transactions.
  3. **Cart Merging:**
     - Verifies guest session cart is safely merged into user account cart upon login.

### 2.3 High-Concurrency Inventory Stress Test (`scripts/test-concurrency.ts`)
```typescript
describe("High-Concurrency Inventory Protection", () => {
  it("prevents overselling when 50 concurrent checkouts target 5 available stock items", async () => {
    const variantId = await seedVariantWithStock(5);
    
    // Dispatch 50 parallel reservation attempts
    const promises = Array.from({ length: 50 }).map((_, idx) =>
      attemptStockReservation({
        variantId,
        quantity: 1,
        sessionToken: `sess_${idx}`
      })
    );

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === "fulfilled");
    const failed = results.filter(r => r.status === "rejected");

    expect(successful.length).toBe(5);
    expect(failed.length).toBe(45);

    const finalStock = await getVariantStock(variantId);
    expect(finalStock).toBe(0); // Zero negative stock allowed
  });
});
```

### 2.4 End-to-End (E2E) Testing (Playwright)
- **Critical Customer Journeys:**
  1. **Guest Checkout Flow:** Select product -> Add to cart -> Checkout -> Enter Bengaluru address & PIN code -> Choose Mock Online Payment -> Complete purchase -> Order Confirmation screen.
  2. **Cash on Delivery Flow:** Select product -> Add to cart -> Checkout -> Select COD -> Verify order placed in `AWAITING_PAYMENT`.
  3. **Admin Lifecycle:** Admin login -> Adjust inventory -> View order queue -> Mark order as `SHIPPED` with tracking number.

---

## 3. Zero-Credential Test Automation in CI

All tests run cleanly in GitHub Actions CI without needing external third-party API keys:
- Payment tests run against the built-in `MockPaymentGateway`.
- Database runs against an ephemeral PostgreSQL Docker container.
- Zero mock service fees or network timeouts.
