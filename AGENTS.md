# AI Agent Operations & Repository Guidelines

**Project:** Modern Enterprise E-Commerce Platform (India-Focused)  
**Target Audience:** Autonomous Coding Agents & AI Assistants  
**Document Status:** Permanent Repository Policy  

---

## 1. Mandatory Workflow for Coding Agents

Every coding agent starting or resuming a session in this repository **must** strictly execute the following protocol:

1. **Orientation & Documentation Ingestion:**
   - Always read the relevant project documentation under `docs/` (`docs/PRD.md`, `docs/architecture.md`, `docs/database-schema.md`, `docs/API_SPECIFICATION.md`, `docs/SECURITY.md`, `docs/TESTING.md`, `docs/DECISIONS.md`) before implementing features.
   - Always inspect `TODO.md` and `PROJECT_STATUS.md` at the start of every session to establish current context and active priorities.
2. **Task Selection Protocol:**
   - Choose the **highest-priority unblocked task** (e.g. `P0` before `P1`, verifying all listed dependencies in `TODO.md` are satisfied).
   - Do not jump ahead to dependent milestones until upstream tasks are completed and verified.
3. **Preserve Unrelated Changes:**
   - Never revert, overwrite, or delete existing functional code, user modifications, or working configuration files without explicit instruction.
4. **Implement Small, Coherent Changes:**
   - Work incrementally in focused, single-purpose commits/edits.
   - Do not generate massive, monolithic code dumps that span multiple unverified domains.
5. **Write and Execute Appropriate Tests:**
   - Every newly implemented domain function, API handler, or utility must be accompanied by unit or integration tests.
   - Run tests directly in the terminal (e.g. `npm test`, `npx vitest run`) and inspect actual outputs.
6. **Report Actual Test Results:**
   - Always report real, executed test output (number of passed tests, duration, exit code) in your final response to the user. Never invent or assume test results.
7. **Synchronize Affected Documentation:**
   - When modifying schemas, routes, configuration parameters, or business rules, immediately update the corresponding files in `docs/` (e.g. `docs/database-schema.md`, `docs/API_SPECIFICATION.md`, `README.md`).
8. **Verify Before Updating Task Status:**
   - **Never** mark a task in `TODO.md` or `PROJECT_STATUS.md` as completed (`[x]`) until all its acceptance criteria are met and verification requirements pass with zero errors.
   - If a feature is only partially implemented, keep its status as `[ ] In Progress` or `[ ] Pending`.
9. **Record Unfinished Work & Blockers:**
   - Before ending a session or awaiting user input, explicitly record any unfinished items, current blockers, or architectural decisions requiring stakeholder clarification in `PROJECT_STATUS.md` and your final report.

---

## 2. Core Operating Philosophy & Engineering Standards

### 2.1 Modular Monolith Architecture
- Adhere strictly to domain boundaries defined in `docs/architecture.md` (`src/modules/*`).
- Do not bypass domain boundaries or introduce ad-hoc circular dependencies between modules.

### 2.2 Server-Authoritative Logic & Monetary Precision
- Prices, GST amounts (18% inclusive breakdown: CGST/SGST/IGST), discounts, delivery charges, and stock counts must **never** be accepted from client requests. Always compute them server-side inside transactional blocks.
- In all application code, calculations, and payment gateway calls, represent currency values as **integers in Paise** (1 INR = 100 paise; e.g., ₹499.00 = `49900` paise). Never perform monetary arithmetic using native floating-point numbers.

### 2.3 Order Address Immutability
- Always snapshot delivery addresses into the order record (`shippingAddressSnapshot`). Never rely on foreign keys to mutable customer address book tables for historical tax invoices or delivery manifests.

### 2.4 Database Mutations & Concurrency Safety
- Always use database transactions (`prisma.$transaction`) when mutating interrelated entities (e.g., creating an order, reserving stock, and logging a payment transaction).
- Protect stock decrements using atomic conditional SQL queries:
  ```sql
  UPDATE "ProductVariant"
  SET "stock_quantity" = "stock_quantity" - :qty,
      "updated_at" = NOW()
  WHERE "id" = :variantId AND "stock_quantity" >= :qty;
  ```
- Non-negative check constraints (`stock_quantity >= 0`) must remain enforced at the database level.
- Never execute destructive database commands (e.g. `prisma migrate reset --force`) in production or staging environments.

### 2.5 TypeScript & Code Quality
- Enforce strict TypeScript (`"strict": true` in `tsconfig.json`).
- Avoid `any` or loose type assertions (`as unknown as Type`).
- Use **Zod** schemas for runtime input validation and type inference across all API endpoints, forms, and environment variables.

---

## 3. Security Guidelines for Agents

1. **Authentication & Session Handling:**
   - Use secure HTTP-only cookies (`SameSite=Lax`, `Secure=true`). Never store auth tokens in browser `localStorage`.
   - Implement **Defense-in-Depth**: In addition to edge middleware route guards, verify user identity and role directly in every Server Action and Route Handler.
   - Never log passwords, API keys, or credit card numbers to application logs or console output.
2. **Payment & Webhook Handling:**
   - Always verify `X-Razorpay-Signature` or payment callback signature using `crypto.createHmac('sha256', secret)` with `crypto.timingSafeEqual`.
   - Never bypass signature checks or disable verification in production mode.
   - Enforce idempotency: Record event IDs in `payment_transactions` to prevent duplicate processing.
3. **Data Sanitization & Injection Defense:**
   - Use parameterized queries via Prisma ORM. Never construct raw SQL strings using string concatenation or template literals.

---

## 4. Decision Escalation Protocol

If an implementation step requires:
- Adding paid external services (e.g., third-party tax/carrier APIs),
- Altering the fundamental modular architecture or database engine,
- Introducing breaking changes to existing data models,
**STOP** and present the architectural trade-offs to the human developer for clarification before proceeding.
