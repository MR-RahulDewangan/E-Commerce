# Architecture Decision Records (ADRs) & Clarification Registry

**Project:** Modern Enterprise E-Commerce Platform (India-Focused)  
**Document Version:** 1.1.0  
**Last Updated:** October 13, 2026  

This document logs significant architectural decisions, their trade-offs, rationale, and critical business decisions flagged for stakeholder review.

---

## 1. Architectural Decisions Log (ADRs)

### ADR-001: Modular Monolith Architecture
- **Status:** Accepted
- **Context:** Deciding the architectural boundary pattern for the e-commerce platform.
- **Decision:** Build as a unified **Modular Monolith** using Next.js 15+ (App Router) with strict domain modules (`src/modules/*`), PostgreSQL 16, and Redis 7.
- **Consequences:**
  - *Positive:* Fast initial velocity, single deployment target, zero distributed transaction overhead (Sagas/2PC), shared TypeScript types between frontend and backend.
  - *Trade-off:* All domain modules share runtime resources. High-traffic spikes affect the entire monolith unless horizontally scaled as a unit.

---

### ADR-002: Relational Database Selection (PostgreSQL + Prisma ORM)
- **Status:** Accepted
- **Context:** E-commerce demands strict ACID transactions for order generation, payment matching, and inventory consistency.
- **Decision:** Adopt **PostgreSQL 16** with **Prisma ORM**.
- **Consequences:**
  - *Positive:* Strict foreign keys, check constraints preventing negative inventory (`stock_quantity >= 0`), JSONB support for flexible variant attributes, automated schema migrations.
  - *Trade-off:* Requires connection pooling (e.g. PgBouncer) under high serverless concurrency.

---

### ADR-003: India-Focused Payment Architecture (Pluggable Provider Pattern)
- **Status:** Accepted (Updated)
- **Context:** The storefront is focused on the Indian market. In India:
  1. Stripe has major friction (limited merchant onboarding, export restrictions, poor domestic UPI integration).
  2. Over 70% of digital retail transactions in India occur via **UPI (Unified Payments Interface)**, alongside Netbanking, RuPay/Visa/Mastercard debit cards, and **Cash on Delivery (COD)**.
  3. Developers frequently do not have active third-party payment gateway credentials during early-stage development and testing.
- **Decision:** Implement a **Pluggable Payment Gateway Abstraction (`IPaymentGateway`)** supporting:
  1. **`MockPaymentGateway` (Default for Local Development / Testing):** Simulates order creation, payment approval/failure, and instant webhook dispatches without requiring any external API keys or network requests.
  2. **`RazorpayGateway` (Production / Staging in India):** Integrates Razorpay Orders API, standard Razorpay Checkout modal (UPI, Netbanking, Cards, Wallets), and HMAC-SHA256 signature verification.
  3. **`CashOnDeliveryGateway` (Domestic Retail):** Supports COD orders with optional SMS/OTP verification and automated `AWAITING_PAYMENT` fulfillment states.
- **Consequences:**
  - *Positive:* Zero blocking dependency on external credentials for local development and CI tests; full native UPI/card/netbanking support for Indian shoppers; flexible architecture to swap or add providers (e.g., Cashfree, PhonePe) via the same interface.
  - *Trade-off:* Requires maintaining the provider interface and local mock adapter alongside the Razorpay integration.

---

### ADR-004: Currency Standard & Precision (Indian Rupee - INR / Paise)
- **Status:** Accepted
- **Context:** Preventing IEEE 754 floating-point rounding errors in monetary math (`0.1 + 0.2 !== 0.3`).
- **Decision:** 
  1. Base currency is **INR (₹)**.
  2. In the database, financial fields use `DECIMAL(12, 2)` for clear accounting and human readability.
  3. In application code and payment gateway interactions (Razorpay / Mock), all monetary amounts are manipulated as **integers in Paise** (1 INR = 100 paise; e.g., ₹499.00 = `49900` paise).
  4. Display formatting is handled via `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
- **Consequences:**
  - *Positive:* Eliminates rounding drift, matches Razorpay's native integer API, and properly handles Indian numbering notation (Lakhs/Crores).

---

### ADR-005: Order Address Immutability (Snapshot Isolation)
- **Status:** Accepted
- **Context:** In customer profile address books, users frequently update or delete saved addresses. If an `Order` only holds a foreign key to `Address` (with `ON DELETE CASCADE`), deleting an address would delete the order or break relational integrity. Modifying an address would rewrite historical shipping invoices.
- **Decision:** An `Order` stores an **immutable address snapshot** directly in the `Order` entity (or a dedicated immutable `OrderAddress` record). Modifying the user's address book never affects previously placed orders.
- **Consequences:**
  - *Positive:* 100% legal and fiscal compliance; permanent audit records for courier deliveries and tax invoices.

---

### ADR-006: Inventory Reservation & Concurrency Model
- **Status:** Accepted
- **Context:** Preventing overselling under flash sales and race conditions.
- **Decision:** Two-tier concurrency defense:
  1. **Stock Reservation Table (`stock_reservations`):** Holds a temporary 10-minute hold linked to a checkout session.
  2. **Atomic Conditional Mutation:**
     ```sql
     UPDATE "ProductVariant"
     SET "stock_quantity" = "stock_quantity" - :requested_qty
     WHERE "id" = :variant_id AND "stock_quantity" >= :requested_qty;
     ```
  3. **Reconciliation Cron:** A lightweight background worker purges reservations where `expires_at < NOW() AND status = 'HELD'` and returns held stock to available pool if abandoned.
- **Consequences:**
  - *Positive:* Bulletproof prevention of negative stock even if Redis is restarted or offline. Works with standard PostgreSQL transactions.

---

### ADR-007: Defense-in-Depth Authentication (HTTP-Only Cookies + Action Guards)
- **Status:** Accepted
- **Context:** Single-page and server-rendered app security.
- **Decision:** Use **HTTP-Only, Secure, SameSite=Lax Cookies** for sessions. No JWTs stored in browser `localStorage`. In addition to Next.js Edge Middleware route guards, every Server Action and Route Handler must independently verify session identity and role permissions (`CUSTOMER`, `ADMIN`, `FULFILLMENT`).
- **Consequences:**
  - *Positive:* Immunity to token theft via XSS; defense against middleware bypass bugs.

---

## 2. Important Decisions Flagged for Stakeholder Review

> [!IMPORTANT]
> The following items represent business and operational decisions requiring your review and approval:

### Decision Flag 1: Goods and Services Tax (GST) Model
- **Current Architecture:** Prices displayed to customers are **GST-inclusive** (standard in Indian B2C e-commerce). The platform computes and displays the breakdown (CGST 9% + SGST 9% for intra-state, or IGST 18% for inter-state) on checkout invoices based on the shipping state vs store originating state.
- **Stakeholder Choice Needed:** Confirm if standard 18% GST (inclusive) meets your business model, or if products have split tax slabs (e.g. 5%, 12%, 18%, 28%) or GST-exclusive pricing.

### Decision Flag 2: Cash on Delivery (COD) Policy & Limits
- **Current Architecture:** COD is supported alongside digital payments (Razorpay / UPI). To prevent bogus orders, COD can be capped at a maximum order threshold (e.g., max ₹5,000) and restricted to serviceable pin codes.
- **Stakeholder Choice Needed:** Should Cash on Delivery (COD) be enabled at launch, and what maximum order value or verification rule (e.g., OTP verification) should apply?

### Decision Flag 3: Shipping Rate Structure (Indian Logistics)
- **Current Architecture:** Flat-rate shipping based on cart value: Free shipping above ₹999, flat ₹70 shipping fee below ₹999.
- **Stakeholder Choice Needed:** Is this flat-rate threshold rule acceptable for MVP, or is an integration with an Indian logistics aggregator (Shiprocket, Delhivery API) required from day one?

### Decision Flag 4: Payment Gateway Account Credentials
- **Current Architecture:** Platform boots in `MOCK` payment mode by default. Once Razorpay Test Mode keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) are provided in `.env`, it seamlessly switches to live/sandbox Razorpay.
- **Stakeholder Choice Needed:** Confirm approval of the dual `Mock` + `Razorpay` gateway strategy.
