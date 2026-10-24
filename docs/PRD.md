# Product Requirements Document (PRD)

**Project:** Modern Enterprise E-Commerce Platform (India-Focused)  
**Document Version:** 1.1.0  
**Status:** Approved for Architectural Baseline  
**Target Market:** India (Domestic E-Commerce)  
**Base Currency:** Indian Rupee (INR - ₹)  
**Delivery Model:** Phased Milestone Delivery  

---

## 1. Product Overview & Vision

### 1.1 Executive Summary
The platform is an enterprise-grade, high-performance, mobile-first e-commerce web application tailored specifically for the Indian consumer market. It delivers sub-second product browsing, comprehensive variant discovery, resilient cart management, multi-step checkout optimized for Indian payment methods (UPI, Netbanking, Cards, Cash on Delivery), transactional integrity (zero overselling), and an intuitive administrative backoffice.

### 1.2 Core Objectives
- **Sub-Second Page Loads:** Target TTFB < 200ms and LCP < 1.5s via Server-Side Rendering (SSR) and edge asset optimization.
- **Indian Payment Optimization:** Native support for **UPI (Google Pay, PhonePe, Paytm, BHIM, QR)**, Indian Netbanking (50+ banks), RuPay/Visa/Mastercard debit and credit cards, and **Cash on Delivery (COD)** via a pluggable payment provider architecture (**Razorpay + Zero-Credential Mock Gateway**).
- **Transactional Integrity:** Zero overselling during high-concurrency flash sales via atomic conditional SQL stock mutations and reservation locks.
- **GST & Tax Compliance:** Server-authoritative calculation of Goods and Services Tax (GST: CGST + SGST for intra-state or IGST for inter-state) with GST-inclusive consumer pricing (MRP).
- **Extensible Architecture:** Modular domain boundaries (`src/modules/*`) allowing clean maintenance and future scaling.

---

## 2. User Roles & Permissions Matrix

| Role | Description | Access Scope & Permissions |
| :--- | :--- | :--- |
| **Guest User** | Unauthenticated public visitor | Browse catalog, search/filter products, manage session cart, initiate guest checkout with phone number & delivery address. |
| **Registered Customer** | Authenticated consumer | Manage profile, save multiple delivery addresses with 6-digit Indian PIN codes, maintain persistent cart across devices, place orders, view order history/tracking, request returns. |
| **Marketplace Seller** | Independent merchant | Dedicated `/seller` portal: Self-service catalog authoring, variant stock adjustments, store order tracking, statutory compliance (GSTIN/PAN/IFSC), and performance KPIs. |
| **Store Administrator** | Business/Store owner | Full administrative access: Superuser catalog/category CRUD, price and inventory adjustments, discount promotions, vendor oversight, refund approvals, and sales analytics. |
| **Fulfillment Agent** | Warehouse / Order staff | Restricted admin access: View order fulfillment queues, update order shipping status, generate packing slips, assign courier tracking numbers (e.g., Delhivery, Blue Dart, Shiprocket). |

---

## 3. User Personas & Detailed User Stories

### 3.1 Persona A: Indian Shopper (Pooja, Bengaluru)
- **US-1.1 Catalog Discovery:** As a shopper, I want to filter products by category, price range (in ₹), attributes (size, color, material), and sort by price/newest so that I can quickly find products matching my needs.
  - *Acceptance Criteria (Gherkin):*
    ```gherkin
    Given a catalog with 50 products across categories
    When the user filters by category "Ethnic Wear" and price range "₹500 - ₹2,000"
    Then only in-stock ethnic wear items within that price range are rendered within 300ms
    ```
- **US-1.2 Resilient Shopping Cart:** As a shopper, I want to add items with specific variants to my cart and have my cart preserved even if I switch between mobile browser and laptop after logging in.
  - *Acceptance Criteria:*
    ```gherkin
    Given a guest user adds 2 items to their cart
    When the guest user logs into an existing account
    Then the guest cart items are merged with existing account items without duplicate counts
    ```
- **US-1.3 Seamless Indian Checkout:** As a shopper, I want to check out with my delivery address, 6-digit PIN code, mobile number, and pay seamlessly via UPI / Card or select Cash on Delivery.
  - *Acceptance Criteria:*
    ```gherkin
    Given a user with valid cart items enters a valid Indian shipping address and phone number
    When the user selects UPI and confirms payment via Razorpay or the development Mock Gateway
    Then an immutable Order record is created in status "PAID", inventory is atomically decremented, and an order confirmation notification is queued
    ```
- **US-1.4 Cash on Delivery (COD) Checkout:** As a shopper, I want to select Cash on Delivery for eligible orders without paying upfront.
  - *Acceptance Criteria:*
    ```gherkin
    Given an eligible cart with total value under ₹5,000
    When the user selects Cash on Delivery
    Then an Order record is created in status "AWAITING_PAYMENT", inventory is reserved, and instructions are displayed
    ```

### 3.2 Persona B: Store Administrator (Vikram, Mumbai)
- **US-2.1 Product Catalog Management:** As an admin, I want to create, update, publish/unpublish products and define SKU variants with distinct pricing (in INR) and stock levels.
  - *Acceptance Criteria:*
    ```gherkin
    Given an authenticated Admin user
    When creating a product with 3 size variants and unique SKU codes
    Then the product and all variants are validated via Zod schema and persisted with audit logs
    ```
- **US-2.2 Inventory Control:** As an admin, I want to receive low-stock alerts and adjust inventory levels with mandatory reason codes.
- **US-2.3 Order Lifecycle Management:** As an admin, I want to transition order states (`PAID` / `AWAITING_PAYMENT` -> `PROCESSING` -> `SHIPPED` -> `DELIVERED` or `CANCELLED`), generate refunds via the payment gateway, and record refund rationale.

### 3.3 Persona C: Marketplace Seller (Tariq, Srinagar / Rajesh, Jaipur)
- **US-3.1 Seller Portal Onboarding & Compliance:** As a marketplace vendor, I want to manage my store bio, statutory GSTIN, PAN, and settlement bank IFSC credentials so that my sales are compliant with Indian tax laws.
  - *Acceptance Criteria:*
    ```gherkin
    Given an authenticated user with SELLER role
    When entering a 15-character GSTIN, 10-character PAN, and bank IFSC code
    Then details are validated via server-side regex schemas and persisted to the seller profile
    ```
- **US-3.2 Isolated Catalog Management:** As a vendor, I want to publish products and multi-variants that belong specifically to my merchant profile without seeing or mutating other vendors' listings.
  - *Acceptance Criteria:*
    ```gherkin
    Given a seller authenticated with their merchant profile
    When viewing the seller catalog or submitting a new product
    Then all catalog queries and mutations are isolated strictly to the seller's merchant ID
    ```
- **US-3.3 Live Stock Adjustments & Fulfillment Tracking:** As a vendor, I want to adjust stock counts across all my variants in real time and track customer orders containing items dispatched by my store.
  - *Acceptance Criteria:*
    ```gherkin
    Given a seller viewing their inventory dashboard
    When incrementing or decrementing stock for a self-owned variant
    Then the new quantity is updated immediately and unauthorized cross-vendor mutations are blocked
    ```

---

## 4. Functional Requirements

### 4.1 Authentication & Authorization
- **FR-AUTH-1:** Email + password authentication with Argon2id password hashing.
- **FR-AUTH-2:** 10-digit Indian mobile number validation (`+91` format).
- **FR-AUTH-3:** Session management using secure, HTTP-only, `SameSite=Lax` cookies with 14-day rolling expiration.
- **FR-AUTH-4:** Role-Based Access Control (RBAC) enforced via server-side middleware and secondary Server Action guards for `/admin/*` routes.
- **FR-AUTH-5:** Password reset via time-limited, single-use cryptographically secure tokens (15-minute TTL).

### 4.2 Product Catalog & Search
- **FR-CAT-1:** Hierarchical category taxonomy with SEO slugs.
- **FR-CAT-2:** Multi-variant architecture supporting SKU, size, color, stock, and barcode attributes.
- **FR-CAT-3:** Full-text search across product title, description, and tags with debounced client query.
- **FR-CAT-4:** Server-Side Rendered (SSR) product details pages with OpenGraph metadata and structured JSON-LD data for SEO.
- **FR-CAT-5:** Image storage and responsive thumbnail generation.

### 4.3 Shopping Cart, Wishlist & Pricing Engine
- **FR-CART-1:** Guest cart stored in signed client cookies / Redis session; account cart persisted in PostgreSQL.
- **FR-CART-2:** Real-time stock validation upon cart view and checkout entry.
- **FR-CART-3:** Server-authoritative subtotal, GST (18% inclusive breakdown: CGST 9% + SGST 9% or IGST 18%), and delivery fee calculation.
- **FR-CART-4:** Promotional discount codes with usage limits and expiration checks.
- **FR-CART-5:** User wishlist functionality permitting authenticated shoppers to save favorite product variants, inspect real-time availability, and transfer items into active cart with one click.

### 4.4 Checkout & Payment Processing
- **FR-CHK-1:** Multi-step checkout funnel: Indian Delivery Address (Name, Phone, PIN code, City, State) -> Payment Method Selection -> Payment Execution -> Order Confirmation.
- **FR-CHK-2:** Server-authoritative price calculation (client supplies only variant IDs and quantities).
- **FR-CHK-3:** Pluggable payment gateway supporting:
  - **`MockPaymentGateway`:** Zero-credential instant mock checkout for local dev and CI.
  - **`RazorpayGateway`:** Official Razorpay Orders API + standard Razorpay Checkout modal (UPI, Cards, Netbanking).
  - **`CashOnDeliveryGateway`:** Offline settlement upon delivery.
- **FR-CHK-4:** Cryptographically signed webhook processing (`X-Razorpay-Signature` HMAC-SHA256 verification) with idempotency records.
- **FR-CHK-5:** Client payment callback verification endpoint (`POST /api/v1/checkout/verify-payment`) validating `razorpay_signature` before order finalization.

### 4.5 Inventory & Concurrency Protection
- **FR-INV-1:** Atomic stock decrementing using conditional database transactions (`UPDATE WHERE stock >= requested_quantity`).
- **FR-INV-2:** Temporary inventory reservation hold (10-minute TTL linked to checkout session) to prevent race conditions during high-demand sales.
- **FR-INV-3:** Automatic stock release if a payment intent expires or is cancelled.

### 4.6 Order Fulfillment & Refunds
- **FR-ORD-1:** Strict order state machine:
  `PENDING` -> `PAID` (or `AWAITING_PAYMENT` for COD) -> `PROCESSING` -> `SHIPPED` -> `DELIVERED`
  (Terminal states: `CANCELLED`, `REFUNDED`).
- **FR-ORD-2:** Immutable address snapshot stored with every order (user address book edits never alter past orders).
- **FR-ORD-3:** Full and partial refunds processed through Razorpay API / Mock adapter with stock replenishment options.

### 4.7 Multi-Vendor Marketplace Operations
- **FR-MKT-1:** Independent merchant portal (`/seller`) providing store metrics (catalog count, units in stock, low-stock warnings, store orders).
- **FR-MKT-2:** Isolated self-service catalog authoring (`/seller/products/new`) with multi-variants and base pricing.
- **FR-MKT-3:** Real-time stock adjusting interface (`/seller/inventory`) with tenant-isolated ownership checks.
- **FR-MKT-4:** Multi-vendor order breakdown (`/seller/orders`) showing vendor item line totals and realized revenue.
- **FR-MKT-5:** Storefront merchant attribution displaying "Sold by [Store Name]" badge on Product Detail Pages.
- **FR-MKT-6:** Seller Application & Compliance Verification Workflow:
  - Existing customers apply to become sellers via `/account/become-seller` with official documents (GSTIN, PAN, Bank IFSC).
  - Admin review portal at `/api/v1/admin/seller-applications` for compliance verification.
  - Atomic role upgrade from `CUSTOMER` to `SELLER` upon approval with `SellerProfile` creation.
  - Rejected applications include reason and allow re-application.

---

## 5. Non-Functional Requirements (NFRs)

### 5.1 Performance & Scalability
- **NFR-PERF-1:** 95th percentile server response time < 250ms for catalog reads.
- **NFR-PERF-2:** Support concurrent checkout throughput of at least 100 orders/minute without database deadlocks.
- **NFR-PERF-3:** Client bundle size target < 180KB initial JS load (React Server Components).

### 5.2 Security & Compliance
- **NFR-SEC-1:** Zero storage of raw credit card numbers or CVVs (PCI-DSS compliance via Razorpay checkout tokenization).
- **NFR-SEC-2:** Mandatory TLS 1.3 across all communication channels with HSTS enabled.
- **NFR-SEC-3:** OWASP Top 10 mitigation: 100% parameterized queries via Prisma, Zod input validation, strict XSS escaping.
- **NFR-SEC-4:** Rate limiting on sensitive endpoints (Auth: 5 req/min; Checkout: 10 req/min; Search: 60 req/min).

---

## 6. Assumptions & Scope Boundaries

### 6.1 Assumptions
1. Base currency is **INR (₹)** with amounts stored as `DECIMAL(12, 2)` in PostgreSQL and manipulated as integer **paise** in gateway logic.
2. Prices displayed to shoppers are **GST-inclusive** with invoice breakdowns into CGST, SGST, or IGST based on shipping state.
3. Shipping calculation rule: Free shipping on orders ≥ ₹999; flat delivery charge of ₹70 on orders under ₹999.
4. Addresses use standard Indian 6-digit PIN codes with state and city lookup.

### 6.2 Out-of-Scope for Initial Release
- Multi-currency international forex conversion (USD/EUR conversion deferred).
- Native iOS/Android mobile apps (mobile web responsiveness prioritized).
- Cross-border export customs documentation.
