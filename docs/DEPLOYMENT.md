# Deployment Architecture & CI/CD Guide

**Project:** Modern Enterprise E-Commerce Platform (India-Focused)  
**Document Version:** 1.1.0  
**Deployment Models Supported:** Containerized (Docker Compose / Cloud VPS) & Managed Serverless (Vercel + Managed PostgreSQL)  

---

## 1. Zero-Credential Development & Production Toggles

The application is engineered to bootstrap immediately in **Mock Payment Mode** without needing external credentials:
- When `PAYMENT_PROVIDER=MOCK`: The platform operates with simulated payments, enabling end-to-end local development, unit tests, and CI builds.
- When `PAYMENT_PROVIDER=RAZORPAY`: The platform activates the live/sandbox Razorpay SDK using provided API keys.

---

## 2. Docker Architecture (`docker-compose.yml` Reference)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: ecommerce_postgres
    restart: always
    environment:
      POSTGRES_USER: ecommerce_user
      POSTGRES_PASSWORD: ecommerce_secure_password
      POSTGRES_DB: ecommerce_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ecommerce_user -d ecommerce_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: ecommerce_redis
    restart: always
    command: redis-server --requirepass redis_secure_password
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "redis_secure_password", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ecommerce_app
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://ecommerce_user:ecommerce_secure_password@postgres:5432/ecommerce_db?schema=public
      - REDIS_URL=redis://:redis_secure_password@redis:6379
      - PAYMENT_PROVIDER=MOCK
      - NODE_ENV=production
      - PORT=3000

volumes:
  postgres_data:
  redis_data:
```

---

## 3. Environment Variables Reference

| Variable Name | Required | Default / Example | Purpose |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Yes | `postgresql://user:pass@localhost:5432/ecommerce_db` | PostgreSQL connection string |
| `REDIS_URL` | No | `redis://:pass@localhost:6379` | Redis caching & rate limiting |
| `NEXTAUTH_SECRET` | Yes | `generate-random-secret-key-32-chars` | Cookie session signing key |
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` | Canonical public URL |
| `PAYMENT_PROVIDER` | Yes | `MOCK` | `MOCK` or `RAZORPAY` |
| `RAZORPAY_KEY_ID` | Optional | `rzp_test_...` | Razorpay public key (if `RAZORPAY` active) |
| `RAZORPAY_KEY_SECRET` | Optional | `secret_...` | Razorpay secret key (if `RAZORPAY` active) |
| `RAZORPAY_WEBHOOK_SECRET` | Optional | `whsec_...` | Webhook HMAC secret (if `RAZORPAY` active) |
| `STORE_STATE` | Yes | `Karnataka` | Origin state for GST CGST/SGST vs IGST |
| `EMAIL_FROM` | No | `orders@example.in` | Transactional email sender |

---

## 4. Production Multi-Stage Dockerfile

```dockerfile
# Stage 1: Dependencies
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Builder
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npx prisma generate
RUN npm run build

# Stage 3: Runner
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```
