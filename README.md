# Modern Enterprise E-Commerce Platform (India-Focused)

A production-grade, high-performance, mobile-responsive **Multi-Vendor Marketplace & E-Commerce Platform** built with **Next.js 15+ (App Router)**, **TypeScript**, **PostgreSQL**, **Prisma ORM**, **Redis**, and a **Pluggable Payment Engine (Razorpay + Zero-Credential Mock Gateway + Cash on Delivery)**.

Designed with **Domain-Driven Design (Modular Monolith)** to guarantee sub-second catalog page loads, atomic inventory protection (zero overselling), multi-tenant seller isolation, and native support for Indian payment methods (UPI, Cards, Netbanking, COD).

---

## 📚 Complete Engineering Documentation

All engineering specifications, architecture diagrams, and operational runbooks are maintained in the `/docs` directory:

| Document | Description |
| :--- | :--- |
| **[Repository Audit](docs/REPOSITORY_AUDIT.md)** | Baseline audit of the repository, environment tools, and greenfield assessment. |
| **[Status & Gap Audit](docs/STATUS_AUDIT.md)** | Comprehensive audit of implementation progress, test suite results, and gap analysis. |
| **[Product Requirements (PRD)](docs/PRD.md)** | Personas, user stories, Gherkin acceptance criteria, and Indian market requirements. |
| **[System Architecture](docs/architecture.md)** | Modular monolith topology, Mermaid diagrams, checkout sequence, and order state machine. |
| **[Database Schema](docs/database-schema.md)** | Relational data model, ERD, indexes, constraints, StockReservation model, and Prisma schema. |
| **[API Specification](docs/API_SPECIFICATION.md)** | REST endpoints, request/response schemas, error contracts, and payment verification routes. |
| **[Security Architecture](docs/SECURITY.md)** | OWASP Top 10 defenses, RBI tokenization norms, Argon2id auth, and HMAC-SHA256 crypto. |
| **[Testing Strategy](docs/TESTING.md)** | Unit, integration, E2E (Playwright) suites, GST tax math tests, and concurrency stress testing. |
| **[Deployment Guide](docs/DEPLOYMENT.md)** | Multi-stage Dockerfile, Docker Compose stack, environment variables, and zero-credential setup. |
| **[Operations & Runbook](docs/OPERATIONS.md)** | Synthetic health checks (`/api/health`), logging, PostgreSQL backups, and payment reconciliation. |
| **[Decisions & ADRs](docs/DECISIONS.md)** | Architecture Decision Records and open questions flagged for stakeholder review. |
| **[Task Roadmap](TODO.md)** | Milestone-based implementation plan with unique task IDs and verification criteria. |
| **[Project Status](PROJECT_STATUS.md)** | Live dashboard tracking development progress and deliverables. |
| **[Agent Instructions](AGENTS.md)** | Permanent guidelines and code standards for autonomous coding agents. |

---

## 🛠 Technology Stack

- **Frontend & App Framework:** Next.js 15+ (App Router, React 19, TypeScript)
- **Styling & UI:** Tailwind CSS, Shadcn UI (Radix UI Primitives), Lucide Icons
- **Database & ORM:** PostgreSQL 16+ with Prisma ORM
- **Cache & Concurrency:** Redis 7+ (Session caching, rate limiting, inventory locks)
- **Authentication:** NextAuth.js (Auth.js v5) with secure HTTP-only cookies and RBAC
- **Payment Processing:** Pluggable `IPaymentGateway` with:
  - **`MockPaymentGateway`**: Default for local dev & CI (zero credentials required)
  - **`RazorpayGateway`**: Native UPI (GPay, PhonePe, Paytm), Netbanking, and Cards
  - **`CashOnDeliveryGateway`**: Domestic offline settlement
- **Data Validation:** Zod runtime schema validation
- **Testing:** Vitest (Unit/Integration) & Playwright (End-to-End)

---

## 🚀 Getting Started (Phase 2 Preview)

### Prerequisites
- **Node.js** `v24.x` or later
- **npm** `11.x` or later
- **Docker & Docker Compose** (for local PostgreSQL and Redis)
- **Git**

### Quick Start Workflow (Zero Credentials Needed)
```bash
# 1. Clone or navigate to the repository
cd "F:/Mini Project"

# 2. Start local backing services (Database & Cache)
docker compose up -d

# 3. Copy environment configuration
cp .env.example .env

# 4. Install dependencies (in Phase 2)
npm install

# 5. Run database migrations & seed sample Indian catalog
npx prisma migrate dev
npx prisma db seed

# 6. Start development server (boots in MOCK payment mode by default)
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the storefront.

---

## 👥 Seeded Test Accounts & Portal Access

The database seed (`npm run prisma:seed` or `npx tsx prisma/seed.ts`) populates default test accounts for all user roles:

| Role | Email | Password | Portal / URL | Scope & Features |
| :--- | :--- | :--- | :--- | :--- |
| **Customer** | `customer@ecommerce.example.in` | `CustomerPass123!` | `/`, `/account/*` | Consumer storefront, cart, wishlist, checkout, orders |
| **Seller 1 (Kashmir Crafts)** | `seller.kashmir@ecommerce.example.in` | `SellerSecure2026!` | `/seller` | Handloom & pashmina catalog, live inventory, seller orders |
| **Seller 2 (Jaipur Textiles)** | `seller.jaipur@ecommerce.example.in` | `SellerSecure2026!` | `/seller` | Block print & quilt catalog, live inventory, seller orders |
| **System Admin** | `admin@ecommerce.example.in` | `AdminSecure2026!` | `/admin` & `/seller` | Superuser oversight across all vendors, products, and fulfillment |

---

## 🔒 Security & Concurrency Highlights

1. **Zero Overselling:** Inventory is decremented using atomic conditional SQL statements (`WHERE stock >= requested_quantity`) backed by a dedicated `stock_reservations` table.
2. **Multi-Vendor Tenant Isolation:** Independent sellers can only view, manage, and restock products belonging strictly to their store. Cross-tenant access is blocked at both the middleware and database query layers.
3. **Server-Authoritative Pricing:** Client requests never dictate prices, GST, or discount amounts; all financial totals are computed strictly on the backend in integer paise.
4. **Immutable Order Snapshots:** Delivery addresses are permanently frozen on the order record at the moment of checkout, guaranteeing that customer address book modifications never alter historical invoices.
5. **Zero-Credential Local Dev:** Works out of the box with `MockPaymentGateway` without needing active merchant accounts or live credentials.

