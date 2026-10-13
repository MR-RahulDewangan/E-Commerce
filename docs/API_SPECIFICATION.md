# API Specification & Data Contracts

**Project:** Modern Enterprise E-Commerce Platform (India-Focused)  
**Protocol:** RESTful over HTTPS / JSON  
**API Prefix:** `/api/v1`  
**Authentication Scheme:** HTTP-Only Secure Session Cookies (`SameSite=Lax`)  
**Base Currency:** INR (₹)  
**Document Version:** 1.1.0  

---

## 1. Global Standards & Conventions

### 1.1 HTTP Status Codes
| Code | Meaning | Usage |
| :--- | :--- | :--- |
| `200 OK` | Request Succeeded | Successful `GET`, `PUT`, `PATCH`. |
| `201 Created` | Resource Created | Successful `POST` creating an entity. |
| `204 No Content` | Succeeded (Empty Body) | Successful `DELETE`. |
| `400 Bad Request` | Validation Failure | Zod schema validation errors, malformed payload. |
| `401 Unauthorized` | Unauthenticated | Missing or expired session cookie. |
| `403 Forbidden` | Insufficient Permissions | Authenticated user lacks required role (e.g. non-admin accessing `/admin/*`). |
| `404 Not Found` | Resource Missing | Entity ID not found in database. |
| `409 Conflict` | Business Conflict | Duplicate SKU, slug collision, or concurrent stock exhaustion. |
| `422 Unprocessable` | Semantic Invariant Violated | Order transition invalid, payment signature verification failure. |
| `429 Too Many Requests`| Rate Limited | Exceeded rate threshold (Redis token bucket). |
| `500 Server Error` | Unhandled Exception | Internal application failure (sanitized error returned). |

### 1.2 Standard Error Response Format (RFC 7807)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters provided.",
    "details": [
      {
        "field": "postalCode",
        "issue": "Must be a valid 6-digit Indian PIN code"
      }
    ],
    "timestamp": "2026-10-13T12:00:00.000Z",
    "requestId": "req_01HXYZ9876"
  }
}
```

---

## 2. Authentication & User Profile Endpoints

### 2.1 Register New User
- **Route:** `POST /api/v1/auth/register`
- **Auth:** Public
- **Rate Limit:** 5 requests / 15 minutes per IP
- **Request Body:**
  ```json
  {
    "email": "customer@example.in",
    "password": "SecurePassword123!",
    "firstName": "Pooja",
    "lastName": "Sharma",
    "phoneNumber": "+919876543210"
  }
  ```
- **Response `201 Created`:** Sets HTTP-only `session_token` cookie.

### 2.2 Login User
- **Route:** `POST /api/v1/auth/login`
- **Auth:** Public
- **Rate Limit:** 5 attempts / 5 minutes per IP
- **Request Body:**
  ```json
  {
    "email": "customer@example.in",
    "password": "SecurePassword123!"
  }
  ```
- **Response `200 OK`:** Sets HTTP-only `session_token` cookie.

### 2.3 Forgot & Reset Password
- **Route:** `POST /api/v1/auth/forgot-password`
  - **Body:** `{ "email": "customer@example.in" }`
  - **Response `200 OK`:** `{ "success": true, "message": "Password reset instructions sent." }`
- **Route:** `POST /api/v1/auth/reset-password`
  - **Body:** `{ "token": "cryp_tok_xxx", "newPassword": "NewSecurePassword123!" }`
  - **Response `200 OK`:** `{ "success": true, "message": "Password reset successfully." }`

### 2.4 User Addresses Management
- `GET /api/v1/addresses`: Returns saved delivery addresses for current customer.
- `POST /api/v1/addresses`: Adds address with 6-digit PIN code (`postalCode`), `stateProvince`, `city`, `streetLine1`, `recipientName`, `phoneNumber`.
- `PUT /api/v1/addresses/:id`: Updates existing address.
- `DELETE /api/v1/addresses/:id`: Deletes saved address (does not affect past order snapshots).

---

## 3. Product Catalog Endpoints

### 3.1 List Products (Search & Filter)
- **Route:** `GET /api/v1/products`
- **Auth:** Public
- **Query Parameters:**
  - `category` (string, optional): Category slug
  - `search` (string, optional): Keyword search
  - `minPrice` (number, optional): Minimum price in INR
  - `maxPrice` (number, optional): Maximum price in INR
  - `sort` (enum, optional): `price_asc`, `price_desc`, `newest`
  - `page` (integer, default: 1), `limit` (integer, default: 24)
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "prd_01",
          "name": "Pure Handloom Cotton Kurta",
          "slug": "pure-handloom-cotton-kurta",
          "basePrice": 1499.00,
          "category": { "name": "Ethnic Wear", "slug": "ethnic-wear" },
          "primaryImage": "https://cdn.example.in/products/kurta-1.jpg",
          "inStock": true,
          "variantCount": 4
        }
      ],
      "pagination": { "page": 1, "limit": 24, "totalItems": 48, "totalPages": 2 }
    }
  }
  ```

### 3.2 Get Product Details
- **Route:** `GET /api/v1/products/:slug`
- **Auth:** Public
- **Response `200 OK`:** Full product document with all variants, inventory indicators, attributes, and image gallery.

---

## 4. Shopping Cart Endpoints

### 4.1 Get Cart
- **Route:** `GET /api/v1/cart`
- **Auth:** Public (Identified via `session_token` cookie)
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "cartId": "crt_81f7d23a",
      "items": [
        {
          "id": "cit_1423",
          "variantId": "var_9012",
          "productName": "Pure Handloom Cotton Kurta",
          "variantName": "Size L - Indigo",
          "sku": "PHCK-IND-L",
          "unitPrice": 1499.00,
          "quantity": 1,
          "subtotal": 1499.00,
          "availableStock": 12
        }
      ],
      "subtotal": 1499.00,
      "estimatedTax": 228.66,
      "estimatedShipping": 0.00,
      "estimatedTotal": 1499.00
    }
  }
  ```

### 4.2 Cart Mutations
- `POST /api/v1/cart/items`: `{ "variantId": "var_9012", "quantity": 1 }`
- `PATCH /api/v1/cart/items/:itemId`: `{ "quantity": 2 }`
- `DELETE /api/v1/cart/items/:itemId`: Removes item.

---

## 5. Checkout & Indian Payment Endpoints

### 5.1 Create Checkout Order
- **Route:** `POST /api/v1/checkout/create-order`
- **Auth:** Public (supports guest checkout) / Authenticated
- **Rate Limit:** 10 requests / minute
- **Request Body:**
  ```json
  {
    "customer": {
      "name": "Pooja Sharma",
      "email": "pooja@example.in",
      "phone": "+919876543210"
    },
    "shippingAddress": {
      "recipientName": "Pooja Sharma",
      "phoneNumber": "+919876543210",
      "streetLine1": "Flat 402, Lotus Apartments, 12th Cross",
      "streetLine2": "Indiranagar",
      "city": "Bengaluru",
      "stateProvince": "Karnataka",
      "postalCode": "560038",
      "countryCode": "IN"
    },
    "paymentMethod": "RAZORPAY"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "data": {
      "orderId": "ord_9b1deb4d",
      "orderNumber": "ORD-20261013-0042",
      "gatewayOrderId": "order_MN48392XyZ",
      "amountPaise": 149900,
      "currency": "INR",
      "paymentMethod": "RAZORPAY",
      "keyId": "rzp_test_1DP5mmOlF5G5ag"
    }
  }
  ```
  *(Note: For `paymentMethod: "COD"`, `gatewayOrderId` returns `"COD_PENDING"` and order is created in `AWAITING_PAYMENT` state).*

### 5.2 Verify Payment (Client Callback Verification)
- **Route:** `POST /api/v1/checkout/verify-payment`
- **Auth:** Public / Authenticated
- **Request Body:**
  ```json
  {
    "orderId": "ord_9b1deb4d",
    "gatewayOrderId": "order_MN48392XyZ",
    "gatewayPaymentId": "pay_MN48392PayId",
    "signature": "25a5893a9c7b94db22f98e6c7d1219b62649a2a9e324c084f7b68a4de09df957"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "orderNumber": "ORD-20261013-0042",
      "status": "PAID",
      "totalAmount": 1499.00
    }
  }
  ```

### 5.3 Payment Webhook Ingestion (Razorpay Webhook)
- **Route:** `POST /api/v1/webhooks/payment/razorpay`
- **Auth:** Validated via HMAC-SHA256 signature header `X-Razorpay-Signature` against raw body
- **Response `200 OK`:** `{ "received": true }`

---

## 6. Order Management Endpoints

### 6.1 List Orders & Order Details
- `GET /api/v1/orders`: Returns paginated orders for logged-in user.
- `GET /api/v1/orders/:orderId`: Returns full order invoice, GST tax breakdown, tracking numbers, and items.

---

## 7. Admin Backoffice Endpoints (Protected: `ADMIN` / `FULFILLMENT`)

### 7.1 Admin Product CRUD
- `POST /api/v1/admin/products`: Create product with variants.
- `PUT /api/v1/admin/products/:id`: Update product.
- `DELETE /api/v1/admin/products/:id`: Unpublish product.

### 7.2 Admin Inventory Adjustments
- `POST /api/v1/admin/inventory/adjust`:
  ```json
  {
    "variantId": "var_9012",
    "delta": 25,
    "reason": "Restocked vendor batch 104"
  }
  ```

### 7.3 Admin Order Status Transitions & Refunds
- `PATCH /api/v1/admin/orders/:orderId/status`:
  ```json
  {
    "status": "SHIPPED",
    "trackingNumber": "DELHIVERY-1294829104",
    "carrier": "Delhivery"
  }
  ```
- `POST /api/v1/admin/orders/:orderId/refund`:
  ```json
  {
    "amountPaise": 149900,
    "reason": "Customer cancellation",
    "restockInventory": true
  }
  ```

---

## 8. Multi-Vendor Marketplace & Seller Endpoints (Protected: `SELLER` / `ADMIN`)

All seller routes enforce strict tenant isolation (`where: { seller: { userId: user.id } }` or `sellerId: sellerProfile.id`), preventing cross-tenant access.

### 8.1 Seller Profile & Settings
- **Retrieve Profile:** `GET /api/v1/seller/profile`
  - **Auth:** `SELLER` or `ADMIN`
  - **Response `200 OK`:** Returns store name, slug, bio, GSTIN, PAN, bank settlement details, and platform commission rate.
- **Update Profile:** `PUT /api/v1/seller/profile`
  - **Auth:** `SELLER` or `ADMIN`
  - **Request Body:**
    ```json
    {
      "storeName": "Kashmir Pashmina & Crafts",
      "description": "Authentic handcrafted Kashmiri pashmina shawls and wood carvings.",
      "gstin": "01ABCDE1234F1Z5",
      "pan": "ABCDE1234F",
      "bankAccount": "9876543210123",
      "bankIfsc": "SBIN0001234"
    }
    ```
  - **Validation:** Validates 15-char Indian GSTIN regex, 10-char PAN regex, and 11-char IFSC code.

### 8.2 Seller Catalog Management
- **List Seller Products:** `GET /api/v1/seller/products?search={term}&categoryId={id}`
  - **Auth:** `SELLER` or `ADMIN`
  - **Response `200 OK`:** Returns products authored by and isolated to the authenticated seller.
- **Create Product Listing:** `POST /api/v1/seller/products`
  - **Auth:** `SELLER` or `ADMIN`
  - **Request Body:**
    ```json
    {
      "name": "Hand-Embroidered Pashmina Stole",
      "description": "Pure Ladakhi cashmere with intricate Sozni needlework.",
      "basePrice": 4499.00,
      "categoryId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "imageUrl": "https://images.unsplash.com/photo-1610030469983-98e550d6193c",
      "isPublished": true,
      "variants": [
        {
          "sku": "KSH-STL-NAVY",
          "name": "Standard / Navy Blue",
          "stockQuantity": 15,
          "size": "2m x 70cm",
          "color": "Navy Blue"
        }
      ]
    }
    ```

### 8.3 Seller Inventory Management
- **List Inventory Variants:** `GET /api/v1/seller/inventory?search={term}`
  - **Auth:** `SELLER` or `ADMIN`
  - **Response `200 OK`:** Returns all variants belonging to the seller's catalog with real-time stock levels.
- **Adjust Variant Stock:** `PATCH /api/v1/seller/inventory`
  - **Auth:** `SELLER` or `ADMIN`
  - **Request Body:**
    ```json
    {
      "variantId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "stockQuantity": 25
    }
    ```
  - **Security:** Verifies that the variant's product belongs to `sellerId`. Rejects cross-tenant attempts with HTTP 400/403.

### 8.4 Seller Order Tracking
- **List Marketplace Orders:** `GET /api/v1/seller/orders`
  - **Auth:** `SELLER` or `ADMIN`
  - **Response `200 OK`:** Returns customer orders that include items supplied by the seller, including line-item breakdowns and the seller's specific revenue share.

