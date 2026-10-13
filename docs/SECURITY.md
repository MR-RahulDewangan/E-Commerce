# Security Architecture & Compliance Guidelines

**Project:** Modern Enterprise E-Commerce Platform (India-Focused)  
**Document Version:** 1.1.0  
**Compliance Baseline:** OWASP Top 10, PCI-DSS SAQ-A, RBI Card Storage & Tokenization Norms  

---

## 1. Threat Model & Security Posture

### 1.1 Key Threat Vectors
1. **Financial Tampering & Price Spoofing:** Manipulation of cart subtotal, GST rates, or payment amounts.
2. **Race Conditions / Inventory Exhaustion:** High-frequency script attacks causing negative stock or denial-of-inventory.
3. **Payment Signature Forgery:** Submitting counterfeit `razorpay_signature` or fake webhook calls to mark unpaid orders as `PAID`.
4. **Account Takeover (ATO):** Credential stuffing, brute-force attacks against user and admin accounts.
5. **Data Exfiltration:** Unauthorized access to Customer Personally Identifiable Information (PII) or delivery addresses.

---

## 2. Authentication & Session Hardening

### 2.1 Password Hashing
- **Algorithm:** **Argon2id** (memory cost: 64MB, time cost: 3 iterations, parallelism: 1 thread).
- **Enforcement:** Passwords must meet minimum complexity (10+ characters, alphanumeric with special character).
- **Prohibition:** No plain text or unsalted hashes anywhere in application code or logs.

### 2.2 Session Security
- **HTTP-Only Cookies Only:** Tokens are stored in secure cookies (`HttpOnly = true`, `Secure = true`, `SameSite = Lax`).
- **No Token Storage in `localStorage`:** Immune to JavaScript token exfiltration via XSS.
- **Defense-in-Depth Authorization:** Edge middleware route guards verify sessions at the network boundary, and **every Server Action and API Route Handler** independently re-checks the user's role (`CUSTOMER`, `ADMIN`, `FULFILLMENT`) before executing database queries or mutations.

---

## 3. Financial & Payment Security (India / Razorpay / RBI Standards)

### 3.1 Cardholder Data Zero-Storage Policy
- **No Primary Account Numbers (PAN), CVVs, or card expiration dates touch application servers.**
- Card and UPI inputs are processed within secure iframes/sandboxes served directly by Razorpay Checkout.
- The platform stores only gateway order IDs (`order_xxx`), payment IDs (`pay_xxx`), and masked transaction references.

### 3.2 Payment Verification & HMAC-SHA256 Math
Payment confirmation requires strict server-side cryptographic signature verification before any order is marked as `PAID`:

```typescript
import crypto from 'node:crypto';

export function verifyRazorpaySignature({
  orderId,
  paymentId,
  signature,
  secret
}: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string;
}): boolean {
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(generatedSignature, 'utf-8'),
    Buffer.from(signature, 'utf-8')
  );
}
```

### 3.3 Webhook Signature Verification
- Inbound webhooks at `/api/v1/webhooks/payment/razorpay` compute:
  ```typescript
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'utf-8'),
    Buffer.from(req.headers['x-razorpay-signature'] as string, 'utf-8')
  );
  ```
- Unsigned or invalid requests are rejected immediately with HTTP 400.
- All webhook event IDs are recorded with an `idempotencyKey` to prevent double-processing.

---

## 4. OWASP Top 10 Mitigations

| Vulnerability | Mitigation Mechanism in Architecture |
| :--- | :--- |
| **A01: Broken Access Control** | Centralized RBAC middleware, ownership check on order queries (`WHERE id = :id AND userId = :currentUser.id`), explicit admin guards. |
| **A02: Cryptographic Failures** | TLS 1.3 enforced. Argon2id for passwords. HMAC-SHA256 with constant-time comparison for payment verification. Encrypted PostgreSQL connections (`sslmode=require`). |
| **A03: Injection (SQL / NoSQL)** | 100% parameterized queries via Prisma ORM. No raw string interpolation in SQL. Zod schema validation on all incoming inputs. |
| **A04: Insecure Design** | Server-authoritative price engine. Atomic conditional updates (`stock >= quantity`) preventing inventory race conditions. |
| **A05: Security Misconfiguration** | Automated security headers (CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff). No stack traces leaked in production. |
| **A06: Vulnerable Components** | Automated dependency audit (`npm audit`), pinning LTS runtime versions. |
| **A07: Identification Failures** | Rate limiting on login and checkout endpoints via Redis token bucket. Single-use password reset tokens with 15-minute TTL. |
| **A08: Software & Data Integrity** | Subresource integrity. Checksums verified in package-lock.json. |
| **A09: Logging & Monitoring** | Structured JSON logging with automatic scrubbing of keys containing `password`, `secret`, `token`, `cardNumber`. |
| **A10: SSRF** | Restricted outbound HTTP calls from backend workers. Strict validation of image URLs. |

---

## 5. Rate Limiting Rules

Enforced via Redis Token Bucket:
- `POST /api/v1/auth/login`: 5 attempts / 5 minutes per IP.
- `POST /api/v1/auth/register`: 5 attempts / 15 minutes per IP.
- `POST /api/v1/checkout/*`: 10 requests / 1 minute per IP/Session.
- `GET /api/v1/products`: 100 requests / 1 minute per IP.
