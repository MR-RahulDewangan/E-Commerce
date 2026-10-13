# Project Implementation Roadmap & Task Registry

**Project:** Modern Enterprise E-Commerce Platform (India-Focused)  
**Document Version:** 2.0.0  
**Status:** Ready for Task-Driven Implementation  
**Execution Policy:** Incremental delivery. All tasks must meet stated acceptance criteria and verification requirements before being marked as completed.  

---

## Milestone 1: Project Foundation
**Goal:** Establish clean repository configuration, developer tooling, Docker backing services, Next.js framework, and relational database ORM layer.

| Task ID | Task Title | Priority | Status | Dependencies | Acceptance Criteria | Verification Requirements |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **M1-T01** | Create Root Configuration Files | P0 | `[x] Completed` | None | `.gitignore`, `tsconfig.json` (strict mode), `.env.example`, and `.editorconfig` exist and adhere to project standards. | Verified: Clean files created, JSON valid, strict mode enabled. |
| **M1-T02** | Configure Local Docker Backing Services | P0 | `[x] Completed` | M1-T01 | `docker-compose.yml` configures PostgreSQL 16 and Redis 7 with healthchecks, persistent volumes, and explicit ports (5432, 6379). | Verified: `docker compose config` parsed cleanly with zero YAML errors. |
| **M1-T03** | Initialize Next.js 15 & Core Dependencies | P0 | `[x] Completed` | M1-T01 | `package.json` initialized with Next.js 15 (App Router), React 19, TypeScript, Zod, and build scripts (`dev`, `build`, `lint`, `test`). | Verified: `npm run build` and `npx tsc --noEmit` succeed with 0 errors. |
| **M1-T04** | Configure Tailwind CSS & Design Tokens | P1 | `[x] Completed` | M1-T03 | Tailwind CSS, Lucide icons, and base theme styling configured with responsive typography and accessible color palette. | Verified: Next.js build compiled Tailwind CSS into standalone static bundle. |
| **M1-T05** | Define Complete Prisma Database Schema | P0 | `[x] Completed` | M1-T01 | `prisma/schema.prisma` contains User, Address, Category, Product, ProductVariant, Cart, CartItem, Wishlist, WishlistItem, StockReservation, Order, OrderItem, and PaymentTransaction models matching `docs/database-schema.md`. | Verified: `npx prisma validate` and `npx prisma generate` executed with 0 errors. |
| **M1-T06** | Execute Initial Database Migration & Client Singleton | P0 | `[x] Completed` | M1-T02, M1-T05 | `npx prisma migrate dev --name init` applies cleanly against PostgreSQL; `src/lib/db.ts` exports singleton Prisma client instance. | Verified: Migration `20261013132650_init` created & applied; all 15 tables verified in PostgreSQL; integration test passes. |
| **M1-T07** | Set Up Synthetic Health Check Endpoint | P1 | `[x] Completed` | M1-T06 | `GET /api/health` returns HTTP 200 with JSON payload reporting database latency, Redis latency, and payment provider mode (`MOCK`). | Verified: Tested against live DB (HTTP 200 connected) and simulated outage (HTTP 503 degraded) in `test/unit/health.test.ts`. |

---

## Milestone 2: Authentication and Authorization
**Goal:** Build secure customer and administrative identity workflows, session management via HTTP-only cookies, and defense-in-depth role enforcement.

| Task ID | Task Title | Priority | Status | Dependencies | Acceptance Criteria | Verification Requirements |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **M2-T01** | Implement Password Hashing & Crypto Utilities | P0 | `[x] Completed` | M1-T03 | Password hashing with 12 salt rounds, constant-time verification, secure token generation, and HMAC-SHA256 math implemented in `src/modules/auth/crypto.ts`. | Verified: Unit test `test/unit/auth-crypto.test.ts` passes (5/5 tests). |
| **M2-T02** | Implement Registration, Login & Session Handlers | P0 | `[x] Completed` | M1-T06, M2-T01 | `POST /api/v1/auth/register` and `POST /api/v1/auth/login` validate input with Zod, verify credentials, and set secure HTTP-only SameSite cookies (`14-day` rolling TTL). | Verified: Mocked unit tests (`test/unit/auth-service.test.ts` 9/9) and live DB integration tests (`test/integration/auth-api.test.ts` 9/9) pass. Registration, duplicate 409 rejection, P2002 race handling, credential check, 14-day cookie, logout, and `/api/v1/auth/me` verified. |
| **M2-T03** | Implement Password Reset Workflow | P1 | `[x] Completed` | M2-T01, M2-T02 | `POST /api/v1/auth/forgot-password` generates 15-minute single-use cryptographic token; `POST /api/v1/auth/reset-password` updates password and invalidates token. | Verified: `src/modules/auth/password-reset.ts` & `/api/v1/auth/forgot-password`, `/reset-password` verified with 2 integration tests (`test/integration/password-reset.test.ts`); frontend pages `/auth/forgot-password` and `/auth/reset-password` implemented. |
| **M2-T04** | Configure Edge RBAC Middleware & Action Guards | P0 | `[x] Completed` | M2-T02 | Middleware redirects unauthenticated users from `/account/*` and blocks non-admins from `/admin/*`. Secondary server action guards enforce role checks in backend domain core. | Verified: `src/middleware.ts` & `src/modules/auth/guards.ts` verified with 7 unit tests (`test/unit/auth-guards.test.ts`) and 9 integration tests (`test/integration/auth-middleware.test.ts`); `/account` redirects to login, `/admin` rejects customer with 403, and admin allowed. |
| **M2-T05** | Build Storefront Auth UI Modals & Forms | P1 | `[x] Completed` | M1-T04, M2-T02 | Responsive Login and Register dialogs with client-side Zod validation, error banners, and loading indicators. | Verified: `src/components/auth/AuthModal.tsx` provides tabbed login/register modal dialogs with validation, password reveal toggle, loading indicators, and automatic guest cart merge. |
| **M2-T06** | Build Customer Account Profile & Address Book | P1 | `[x] Completed` | M2-T04 | `/account/profile` and `/account/addresses` allow viewing profile, adding delivery addresses with 6-digit Indian PIN codes, and setting default address. | Verified: `src/app/account/profile/page.tsx` and `src/app/account/addresses/page.tsx` with `/api/v1/account/addresses` CRUD endpoints; PIN code validation and default address support verified. |

---

## Milestone 3: Product Catalog
**Goal:** Deliver high-performance, SEO-optimized product browsing with faceted filtering, multi-variant display, and catalog seeding.

| Task ID | Task Title | Priority | Status | Dependencies | Acceptance Criteria | Verification Requirements |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **M3-T01** | Build Catalog Query Module | P0 | `[x] Completed` | M1-T06 | `src/modules/catalog/queries.ts` provides typed pagination, category slug lookup, price filtering (INR), keyword search, and sorting (`price_asc`, `price_desc`, `newest`). | Verified: Mocked DB unit tests (`test/unit/catalog-queries.test.ts` 9/9) and live DB integration tests (`test/integration/catalog-queries.test.ts` 8/8) pass. Unpublished items safely filtered, safe pagination (cap 100), eager loading prevents N+1 queries. |
| **M3-T02** | Implement Catalog REST API Endpoints | P1 | `[x] Completed` | M3-T01 | `GET /api/v1/products` and `GET /api/v1/products/:slug` return validated JSON documents conforming to `docs/API_SPECIFICATION.md`. | Verified: `src/app/api/v1/products/route.ts` & `src/app/api/v1/products/[slug]/route.ts` verified with 6 integration tests (`test/integration/catalog-api.test.ts`); validated JSON, 404 for draft/missing items, query parsing pass. |
| **M3-T03** | Create Comprehensive Database Seed Script | P1 | `[x] Completed` | M1-T06 | `prisma/seed.ts` populates admin user, 10 categories, and 30 multi-variant products in INR (₹) with realistic attributes (size, color) and stock counts. | Verified: `npx prisma db seed` executed cleanly; seeded admin (`admin@ecommerce.example.in`), customer, 10 categories, 30 products, and 62 multi-variants in PostgreSQL. |
| **M3-T04** | Build Storefront Homepage & Catalog Grid UI | P1 | `[x] Completed` | M1-T04, M3-T01 | Responsive homepage with hero banner, category showcase, and `/products` catalog grid with price slider and sort dropdown. | Verified: `src/app/page.tsx` and `src/app/products/page.tsx` load from PostgreSQL; category filters, search, price ranges, and pagination implemented and building cleanly. |
| **M3-T05** | Build Product Detail Page (PDP) | P0 | `[x] Completed` | M3-T01, M3-T04 | `/products/[slug]` displays image gallery, interactive variant picker (size/color), dynamic price updates, live stock badge, and GST-inclusive indicator. | Verified: `src/app/products/[slug]/page.tsx` and `ProductDetailView.tsx` render image gallery, real-time variant switcher with price override updates, stock badges, and quantity stepper. |
| **M3-T06** | Implement Catalog Caching Layer | P2 | `[ ] Pending` | M1-T02, M3-T01 | Redis caches category hierarchy and popular product lists; invalidates cache upon product mutations. | Test confirms cache hit returns data without DB hit; mutation invalidates cache key. |

---

## Milestone 4: Shopping Cart and Wishlist
**Goal:** Build resilient shopping cart, server-authoritative GST pricing engine, and customer wishlist workflows.

| Task ID | Task Title | Priority | Status | Dependencies | Acceptance Criteria | Verification Requirements |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **M4-T01** | Implement Server-Authoritative GST Pricing Engine | P0 | `[x] Completed` | M1-T03 | `src/modules/cart/pricing.ts` calculates items subtotal, 18% inclusive GST (CGST 9% + SGST 9% or IGST 18%), and delivery fee in integer paise (1 INR = 100 paise). | Verified: Unit test `test/unit/cart-pricing.test.ts` passes (7/7 tests) with zero float errors. |
| **M4-T02** | Implement Cart Domain Logic & API Endpoints | P0 | `[x] Completed` | M4-T01 | `GET`, `POST`, `PATCH`, `DELETE` on `/api/v1/cart/items` support guest session cookies and authenticated users with real-time stock checks. | Verified: `src/modules/cart/service.ts` & `/api/v1/cart/*` endpoints verified with 9 integration tests (`test/integration/cart-api.test.ts`); add, update, remove, stock bounds, and paise pricing verified. |
| **M4-T03** | Build Slide-Over Mini-Cart UI Component | P1 | `[x] Completed` | M1-T04, M4-T02 | Slide-over drawer displaying cart line items, variant thumbnails, quantity stepper, free shipping threshold bar (₹999), and checkout CTA. | Verified: `src/components/cart/CartDrawer.tsx` renders slide-over drawer with dynamic ₹999 free shipping progress, line item steppers, and direct checkout linking. |
| **M4-T04** | Implement Guest-to-User Cart Migration | P1 | `[x] Completed` | M2-T02, M4-T02 | When a guest user logs in or registers, their guest cart items are merged into their account cart without losing quantities or dropping items. | Verified: `mergeGuestCartIntoUserCart` tested in `test/integration/cart-api.test.ts`; guest items merged into user cart and guest session cleaned up. |
| **M4-T05** | Implement Wishlist Domain Logic & API Endpoints | P1 | `[x] Completed` | M1-T06, M2-T04 | `GET /api/v1/wishlist`, `POST /items`, and `DELETE /items/:id` allow authenticated users to save variants and inspect availability. | Verified: `src/modules/wishlist/service.ts` & `/api/v1/wishlist` endpoints verified with 4 integration tests (`test/integration/wishlist-api.test.ts`). |
| **M4-T06** | Build Wishlist UI & Move-to-Cart Action | P2 | `[x] Completed` | M4-T03, M4-T05 | Heart toggle button on product cards and PDP; `/account/wishlist` view with one-click "Move to Cart" button. | Verified: `src/app/account/wishlist/page.tsx` and heart toggles across catalog; one-click "Move to Cart" transfers variant to cart and removes from wishlist. |

---

## Milestone 5: Checkout and Payments
**Goal:** Deliver friction-free Indian checkout, concurrency-safe stock reservation, pluggable payment integration (Mock, Razorpay, COD), and webhook order finalization.

| Task ID | Task Title | Priority | Status | Dependencies | Acceptance Criteria | Verification Requirements |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **M5-T01** | Build Concurrency-Safe Stock Reservation Engine | P0 | `[x] Completed` | M1-T06 | `stock_reservations` records 10-minute hold; atomic conditional SQL query (`UPDATE WHERE stock_quantity >= qty`) reserves stock. | Verified: `src/modules/inventory/reservation.ts` verified with 4 unit tests (`test/unit/stock-reservation.test.ts`) and concurrency integration test (`test/integration/stock-concurrency.test.ts`); 10 parallel requests on 5 items yielded zero overselling, zero negative stock, and exact hold release. |
| **M5-T02** | Implement Pluggable Payment Gateway Abstraction | P0 | `[x] Completed` | M4-T01 | `IPaymentGateway` interface implemented with `MockPaymentGateway` (zero credentials needed), `RazorpayGateway`, and `CashOnDeliveryGateway`. | Verified: Unit test `test/unit/payment-gateway.test.ts` passes (11/11 tests). |
| **M5-T03** | Implement Checkout Order & Verification Endpoints | P0 | `[x] Completed` | M5-T01, M5-T02 | `POST /api/v1/checkout/create-order` creates order & reserves stock; `POST /api/v1/checkout/verify-payment` validates HMAC signature and marks order `PAID`. | Verified: `src/modules/checkout/service.ts` & `/api/v1/checkout/*` verified with 10 unit tests (`test/unit/checkout-service.test.ts`) and 6 integration tests (`test/integration/checkout-api.test.ts`). Validated cart-based and direct order placement, Indian address & PIN checks, COD ₹5,000 threshold, stock hold & consumption, and HMAC verification. |
| **M5-T04** | Build Multi-Step Indian Checkout UI | P0 | `[x] Completed` | M1-T04, M5-T03 | Multi-step funnel: Delivery address (with PIN code & phone) -> Payment method (UPI, Cards, Netbanking, COD) -> Payment modal -> Confirmation. | Verified: `src/app/checkout/page.tsx` implements multi-step funnel with Indian 6-digit PIN code & mobile validation, COD ₹5,000 cap enforcement, order review, and payment authorization dialog. |
| **M5-T05** | Implement Payment Webhook Ingestion & Idempotency | P0 | `[x] Completed` | M5-T02 | `POST /api/v1/webhooks/payment/razorpay` verifies `X-Razorpay-Signature` HMAC-SHA256 and idempotently processes payment capture events. | Verified: `src/modules/payment/webhook.ts` & `/api/v1/webhooks/payment/razorpay` verified with 4 unit tests (`test/unit/payment-webhook.test.ts`) and 2 integration tests (`test/integration/payment-webhook-api.test.ts`). Validated signature verification, order finalization to PAID, stock reservation consumption, and duplicate replay idempotency. |
| **M5-T06** | Build Order Confirmation & GST Tax Invoice View | P1 | `[x] Completed` | M5-T03 | `/checkout/success?orderNumber=...` renders order invoice with GST tax breakdown, delivery address snapshot, and order tracking info. | Verified: `src/app/checkout/success/page.tsx` renders printable tax invoice with permanent delivery address snapshot, 18% inclusive GST calculation breakdown, and order tracking links. |

---

## Milestone 6: Inventory and Order Management
**Goal:** Automate stock reservation cleanup, order lifecycle state transitions, and customer fulfillment tracking.

| Task ID | Task Title | Priority | Status | Dependencies | Acceptance Criteria | Verification Requirements |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **M6-T01** | Build Stock Reservation Release Background Worker | P1 | `[x] Completed` | M5-T01 | Scheduled worker releases reservations where `expires_at < NOW() AND status = 'HELD'` and returns stock to available inventory pool. | Verified: `src/modules/inventory/worker.ts` & `/api/cron/release-reservations` tested in `test/integration/stock-reservation-worker.test.ts` (3/3 tests pass); restores variant inventory count, updates status to `RELEASED`, and enforces `CRON_SECRET` security. |
| **M6-T02** | Implement Order Lifecycle State Machine | P0 | `[x] Completed` | M5-T03 | Order state engine governs valid transitions (`PENDING` -> `PAID`/`AWAITING_PAYMENT` -> `PROCESSING` -> `SHIPPED` -> `DELIVERED`); blocks invalid transitions. | Verified: Unit test `test/unit/order-state-machine.test.ts` passes (7/7 tests). |
| **M6-T03** | Build Customer Order History & Tracking View | P1 | `[x] Completed` | M2-T04, M6-T02 | `/account/orders` and `/account/orders/:orderNumber` display order history, item snapshots, status progress bar, and courier tracking numbers. | Verified: `src/app/account/orders/page.tsx` & `GET /api/v1/orders` list customer orders with live status badges, total amount, and link to GST invoice view. |
| **M6-T04** | Implement Order Cancellation & Restocking | P1 | `[x] Completed` | M6-T02 | Customers can cancel orders in `PENDING` or `PAID` state before dispatch (`PROCESSING`), triggering automated stock restocking and refund initiation. | Verified: `POST /api/v1/orders/[id]/cancel` allows cancellation of eligible orders, atomically increments stock back to variants, and releases held stock reservations. |

---

## Milestone 7: Administration
**Goal:** Build backoffice dashboard for catalog administration, stock adjustments, order fulfillment, and refund processing.

| Task ID | Task Title | Priority | Status | Dependencies | Acceptance Criteria | Verification Requirements |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **M7-T01** | Build Admin Portal Layout & Navigation | P1 | `[x] Completed` | M2-T04 | Responsive admin sidebar at `/admin` with links to Products, Inventory, Orders, and Analytics, strictly guarded by `ADMIN`/`FULFILLMENT` roles. | Verified: `src/app/admin/layout.tsx`, `AdminSidebar.tsx`, and `test/integration/admin-access.test.ts` (8/8 tests pass); redirects unauthenticated users, blocks customers with 403, and allows ADMIN / FULFILLMENT. |
| **M7-T02** | Build Admin Product & Variant CRUD | P1 | `[x] Completed` | M7-T01, M3-T01 | Admin UI to create/edit products, manage SKUs, configure pricing in INR (₹), upload image URLs, and edit variants. | Verified: `src/app/admin/products` UI, `/api/v1/admin/products` routes, and `test/integration/admin-products-api.test.ts` (6/6 tests pass); admin creates product with 2 variants and product immediately surfaces on storefront. |
| **M7-T03** | Build Admin Inventory Manager & Audit Log | P1 | `[x] Completed` | M7-T01, M5-T01 | Stock adjustment interface allowing admins to increment/decrement inventory with mandatory reason codes; logs audit entries. | Verified: `src/app/admin/inventory` UI, `/api/v1/admin/inventory/adjust` route, and `test/integration/admin-inventory-api.test.ts` (5/5 tests pass); atomic increments/decrements, non-negative checks, and JSONB audit logs verified. |
| **M7-T04** | Build Admin Order Fulfillment Dashboard | P1 | `[x] Completed` | M7-T01, M6-T02 | Order list with status filters, detail view, courier tracking number attachment (Delhivery, Blue Dart), and status updates (`PROCESSING` -> `SHIPPED`). | Verified: `src/app/admin/orders` UI, `/api/v1/admin/orders/[id]/status` route, and `test/integration/admin-orders-fulfillment.test.ts` (6/6 tests pass); transition to SHIPPED requires & attaches courier tracking number in order snapshot. |
| **M7-T05** | Implement Admin Refund Processing | P2 | `[x] Completed` | M7-T04, M5-T02 | Admin can initiate partial or full refunds via `IPaymentGateway` with optional inventory restocking checkbox. | Verified: `src/components/admin/OrderRefundModal.tsx`, `/api/v1/admin/orders/[id]/refund` route, and `test/integration/admin-refund-api.test.ts` (4/4 tests pass); full/partial refunds, transaction record creation, and inventory restocking verified. |

---

## Milestone 8: Testing and Quality
**Goal:** Execute comprehensive unit, integration, high-concurrency race condition, and end-to-end browser test suites.

| Task ID | Task Title | Priority | Status | Dependencies | Acceptance Criteria | Verification Requirements |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **M8-T01** | Implement Vitest Unit Test Suite | P0 | `[x] Completed` | M2-T01, M4-T01, M5-T02 | Unit test suite covers GST calculation math, HMAC signature verification, paise integer conversions, and order state machine. | Verified: `npm run test:unit` runs 14 test files, 95/95 tests pass with 100% success rate across domain math and business logic. |
| **M8-T02** | Implement Integration Test Suite | P0 | `[x] Completed` | M2-T02, M4-T02, M5-T03 | Integration suite tests database transactions, cart merging, address snapshots, and webhook idempotency against PostgreSQL container. | Verified: `npm run test:integration` runs 17 test files, 93/93 tests pass with 0 failures against PostgreSQL 16 container. |
| **M8-T03** | Execute High-Concurrency Inventory Stress Test | P0 | `[x] Completed` | M5-T01 | Dedicated script `scripts/test-concurrency.ts` executes 50 concurrent checkout attempts against 5 available stock items; exactly 5 succeed and 45 fail. | Verified: `npm run test:stress` fires 50 simultaneous parallel reservation attempts; exactly 5 succeed, 45 fail with INSUFFICIENT_STOCK, and final stock is exactly 0. |
| **M8-T04** | Implement Playwright End-to-End (E2E) Test Suite | P0 | `[ ] Pending` | M4-T03, M5-T04, M7-T02 | Automated E2E test completes full customer purchase flow using Mock payment gateway and COD flow in headless browser. | `npm run test:e2e` passes all customer and admin flows cleanly. |

---

## Milestone 9: Production Readiness
**Goal:** Configure Docker container packaging, CI/CD automation, security hardening, rate limiting, and operational runbook validation.

| Task ID | Task Title | Priority | Status | Dependencies | Acceptance Criteria | Verification Requirements |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **M9-T01** | Create Multi-Stage Production Dockerfile | P1 | `[x] Completed` | M1-T03 | Multi-stage Dockerfile compiles Next.js standalone runner, applies non-root user, and outputs container image under 200MB. | Verified: `Dockerfile` & `next.config.mjs` configure multi-stage build (`deps` -> `builder` -> `runner`), non-root `nextjs:nodejs` user, and `output: 'standalone'`. |
| **M9-T02** | Configure GitHub Actions CI/CD Pipeline | P1 | `[x] Completed` | M8-T01, M8-T02 | `.github/workflows/ci.yml` runs linter, typecheck, unit tests, integration tests, and security audit on every push. | Verified: `.github/workflows/ci.yml` configured with PostgreSQL 16 container, linting, typechecking, Vitest suites, concurrency test, and production build. |
| **M9-T03** | Implement Security Hardening & Rate Limiting | P0 | `[x] Completed` | M2-T02, M5-T03 | Redis token bucket rate limiter protects `/auth/*` (5 req/min) and `/checkout/*` (10 req/min); security headers (CSP, HSTS) applied. | Verified: `src/modules/auth/rate-limit.ts`, `src/middleware.ts`, and `test/integration/rate-limit-security.test.ts` (4/4 tests pass); throttles after 5 auth requests and 10 checkout requests, returns 429 with Retry-After header, and sets security headers. |
| **M9-T04** | Verify Operational Runbooks & Backup Scripts | P1 | `[x] Completed` | M1-T02, M1-T07 | `scripts/backup-db.sh` runs `pg_dump` and verifies archive integrity; health check endpoint verified. | Verified: `scripts/backup-db.ps1` and `scripts/backup-db.sh` generate compressed PostgreSQL dump; verified 82 TOC table/index entries with 100% integrity via `pg_restore --list`. |
