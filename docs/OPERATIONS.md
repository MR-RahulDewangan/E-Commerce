# Operations, Monitoring & Disaster Recovery Runbook

**Project:** Modern Enterprise E-Commerce Platform (India-Focused)  
**Document Version:** 1.1.0  
**Target RPO (Recovery Point Objective):** < 15 minutes  
**Target RTO (Recovery Time Objective):** < 30 minutes  

---

## 1. Observability, Health Checks & Telemetry

### 1.1 Health Check Endpoint (`/api/health`)
- **Route:** `GET /api/health`
- **Output:**
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-10-13T12:00:00Z",
    "uptimeSeconds": 86420,
    "paymentProvider": "MOCK",
    "services": {
      "database": { "status": "connected", "latencyMs": 3 },
      "redis": { "status": "connected", "latencyMs": 1 }
    }
  }
  ```

### 1.2 Key Service Level Indicators (SLIs)
| Metric | Description | Target SLA |
| :--- | :--- | :--- |
| **Catalog Latency** | P95 latency for product catalog routes | < 250ms |
| **Checkout Error Rate**| Percentage of checkout sessions returning 5xx | < 0.1% |
| **Payment Verification Latency** | P95 latency for `/verify-payment` | < 500ms |
| **Active Stock Reservations** | Count of concurrent held reservations | Alert if > 2,000 |

---

## 2. Backup & Recovery Runbooks

### 2.1 Daily PostgreSQL Backups
- Automatic daily `pg_dump` compressed and encrypted at 02:00 IST.
- Retained for 30 days in off-site encrypted cloud storage.

### 2.2 Payment Incident Response (Razorpay & UPI Failures)
In the event that a customer reports UPI payment debited from bank but order page shows pending:
1. Fetch `gatewayOrderId` or customer phone number from customer support query.
2. Query `payment_transactions` table to check transaction status.
3. If Razorpay webhook was delayed or missed:
   - Run manual reconciliation script (`scripts/reconcile-payment.ts --orderId=<id>`) or trigger Razorpay API payment sync (`orders.fetchPayments(gatewayOrderId)`).
   - If payment is captured on Razorpay, atomically transition order to `PAID`, finalize stock decrement, and send confirmation SMS/email.

---

## 3. Alerting Thresholds & On-Call Playbook

| Alert Name | Condition | Severity | Initial Action |
| :--- | :--- | :--- | :--- |
| `DB_CONNECTION_EXHAUSTION` | DB pool > 90% for 3 mins | High | Inspect slow queries; scale connection pool or restart stale worker connections. |
| `HIGH_CHECKOUT_FAILURE_RATE` | Failed checkouts > 5% over 5 mins | Critical | Check payment gateway status page; inspect server logs for signature mismatch. |
| `INVENTORY_DESYNC_DETECTED` | Negative stock count detected | Critical | Halt ordering for affected SKU; inspect concurrent reservation logs; reconcile stock. |
| `RESERVATION_PURGE_FAILURE` | Cleanup worker failed to release held stock | Medium | Run manual reservation release query: `UPDATE stock_reservations SET status = 'RELEASED' WHERE expires_at < NOW() AND status = 'HELD'`. |
