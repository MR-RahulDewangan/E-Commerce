# Seller Intelligence & Analytics Platform — Feature Guide

**Project:** Modern Enterprise E-Commerce Platform (India-Focused)  
**Document Version:** 1.0.0  
**Target Audience:** Stakeholders, Product Managers, Sellers, & Engineering Teams  

---

## Overview

The **Seller Intelligence & Analytics Platform** is a core sub-system of BharatStore Maison designed to empower independent artisans, handloom weavers, and luxury merchants across India with enterprise-grade data intelligence, predictive machine learning forecasting, and dynamic pricing strategies. 

All analytics and ML computations are securely integrated into our Modular Monolith architecture (`src/modules/analytics/`), combining a robust PostgreSQL analytics event store with Python-backed statistical modeling engines (utilizing `pandas`, `numpy`, and `statsmodels`).

---

## Key Features & Architecture

### 1. Multi-Vendor Marketplace & Seller Onboarding Workflow
- **Application & Approval Pipeline (`src/modules/seller/`)**: Prospective sellers submit applications including GSTIN, PAN, and Bank Account details. Admins review and approve/reject applications through a dedicated review workflow, automatically granting the `SELLER` role and provisioning their unique `SellerProfile`.
- **Storefront Isolation**: Sellers manage their own catalog items, variants, cost prices (`costPrice`), and inventory while adhering to platform-wide luxury standards and Indian tax compliance (CGST/SGST/IGST).

### 2. Seller Intelligence Dashboard
- **Comprehensive KPI Tracking**: Real-time aggregation of Gross Merchandise Value (GMV), net revenue, total order count, average order value (AOV), and profit margins.
- **Granular Date-Range Filtering**: Supports flexible filtering (Today, Last 7 Days, Last 30 Days, Last 90 Days, Year-to-Date) to track temporal sales performance.
- **Top-Performing Products & Categories**: Identifies revenue-driving SKUs and top product categories to guide inventory replenishment.

### 3. Predictive Machine Learning Demand Forecasting
- **Time-Series Analysis**: Leverages Python's `statsmodels` (Holt-Winters Exponential Smoothing and ARIMA models) wrapped via a secure IPC Bridge (`src/modules/analytics/python-bridge.ts`).
- **Uncertainty Bounds & Confidence Intervals**: Generates probabilistic demand forecasts with upper and lower confidence bounds.
- **Inventory Health Flags**: Automatically flags SKUs with `OVERSTOCK` or `STOCKOUT_RISK` statuses based on predicted demand velocity versus current stock levels.

### 4. Customer Segmentation & Churn Risk Stratification
- **RFM Analysis (Recency, Frequency, Monetary)**: Segments buyers into behavioral cohorts (e.g., Champions, Loyal Customers, At-Risk, Hibernating).
- **Churn Prediction**: Calculates customer churn probability scores and provides actionable retention strategies for at-risk high-value buyers.

### 5. Dynamic Pricing & Margin Optimization Engine
- **Algorithmic Price Recommendations**: Analyzes historical sales velocity, competitor benchmarks, and minimum acceptable margin thresholds (`minMarginPct`) to suggest optimal selling prices.
- **Approval Workflow**: Sellers review pricing recommendations (`PENDING_APPROVAL`) and can apply them directly to their product variants with a single click.

### 6. Geographic & Sales Funnel Analytics
- **Regional Heatmaps**: Tracks buyer distribution across Indian states and union territories (e.g., Maharashtra, Karnataka, Delhi, Tamil Nadu) for targeted logistics and marketing.
- **Conversion Funnel Drop-off Analysis**: Measures user progression across key milestones: Product View → Add to Cart → Checkout Initiated → Payment Success.

---

## Technical Implementation Summary

- **Event Tracking**: Lightweight asynchronous event logging (`analytics_events` table) captures user interactions, product views, and cart additions.
- **Python Bridge IPC**: Secure child-process execution passing JSON payloads over `stdin`/`stdout` with strict error handling and graceful fallbacks to moving-average heuristics if Python/`statsmodels` is unavailable.
- **Monetary Precision**: All monetary values (prices, margins, GMV) are stored and computed as integer Paise (₹1 = 100 paise) to prevent floating-point rounding errors.
