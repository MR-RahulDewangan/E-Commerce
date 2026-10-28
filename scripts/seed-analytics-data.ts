import { PrismaClient, OrderStatus, PaymentProvider, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

const INDIAN_CITIES = [
  { city: 'Bengaluru', state: 'Karnataka', pin: '560038' },
  { city: 'Mumbai', state: 'Maharashtra', pin: '400001' },
  { city: 'New Delhi', state: 'Delhi', pin: '110001' },
  { city: 'Jaipur', state: 'Rajasthan', pin: '302001' },
  { city: 'Varanasi', state: 'Uttar Pradesh', pin: '221001' },
  { city: 'Pune', state: 'Maharashtra', pin: '411001' },
  { city: 'Hyderabad', state: 'Telangana', pin: '500001' },
  { city: 'Chennai', state: 'Tamil Nadu', pin: '600001' },
  { city: 'Kolkata', state: 'West Bengal', pin: '700001' },
];

const CUSTOMER_NAMES = [
  { first: 'Pooja', last: 'Sharma', email: 'pooja.sharma@example.in', phone: '+919876543210' },
  { first: 'Aarav', last: 'Mehta', email: 'aarav.mehta@example.in', phone: '+919876543211' },
  { first: 'Diya', last: 'Patel', email: 'diya.patel@example.in', phone: '+919876543212' },
  { first: 'Rohan', last: 'Verma', email: 'rohan.verma@example.in', phone: '+919876543213' },
  { first: 'Ananya', last: 'Iyer', email: 'ananya.iyer@example.in', phone: '+919876543214' },
  { first: 'Vikram', last: 'Singhania', email: 'vikram.s@example.in', phone: '+919876543215' },
  { first: 'Sneha', last: 'Reddy', email: 'sneha.r@example.in', phone: '+919876543216' },
  { first: 'Arjun', last: 'Nair', email: 'arjun.nair@example.in', phone: '+919876543217' },
  { first: 'Kavita', last: 'Deshmukh', email: 'kavita.d@example.in', phone: '+919876543218' },
  { first: 'Rahul', last: 'Kapoor', email: 'rahul.k@example.in', phone: '+919876543219' },
  { first: 'Meera', last: 'Bose', email: 'meera.bose@example.in', phone: '+919876543220' },
  { first: 'Aditya', last: 'Joshi', email: 'aditya.j@example.in', phone: '+919876543221' },
];

async function seedAnalyticsData() {
  console.log('🚀 Seeding comprehensive analytics data for BharatStore sellers...');

  // 1. Fetch sellers
  const sellers = await prisma.sellerProfile.findMany({
    include: {
      products: {
        include: {
          variants: true,
          category: true,
        },
      },
    },
  });

  if (sellers.length === 0) {
    console.error('❌ No sellers found in database. Please run prisma db seed first.');
    return;
  }

  console.log(`Found ${sellers.length} sellers to enrich.`);

  // Clean up any existing analytics events and orders for idempotency
  console.log('🧹 Purging prior analytics events and demo orders...');
  await prisma.analyticsEvent.deleteMany({});
  const analyticsOrders = await prisma.order.findMany({
    where: { orderNumber: { startsWith: 'ORD-ANL-' } },
    select: { id: true },
  });
  const analyticsOrderIds = analyticsOrders.map((o) => o.id);
  if (analyticsOrderIds.length > 0) {
    await prisma.stockReservation.deleteMany({
      where: { orderId: { in: analyticsOrderIds } },
    });
    await prisma.paymentTransaction.deleteMany({
      where: { orderId: { in: analyticsOrderIds } },
    });
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: analyticsOrderIds } },
    });
    await prisma.order.deleteMany({
      where: { id: { in: analyticsOrderIds } },
    });
  }

  // 2. Set costPrice on variants if not already populated (roughly 55-65% of price)
  for (const seller of sellers) {
    for (const product of seller.products) {
      for (const variant of product.variants) {
        const basePrice = Number(variant.priceOverride || product.basePrice);
        const estimatedCost = Math.round(basePrice * 0.60 * 100) / 100;
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: {
            costPrice: variant.costPrice || estimatedCost,
          },
        });
      }
    }
  }
  console.log('✅ Unit cost prices verified on seller product variants.');

  // 3. Create customers if they do not exist
  const customerRecords = [];
  for (const c of CUSTOMER_NAMES) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        email: c.email,
        firstName: c.first,
        lastName: c.last,
        phoneNumber: c.phone,
        role: 'CUSTOMER',
      },
    });
    customerRecords.push(user);
  }

  // 4. Generate historical orders spanning 120 days
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  // Let's generate orders distribution
  let orderSequence = 1000;
  let totalOrdersCreated = 0;
  let totalEventsCreated = 0;

  for (const seller of sellers) {
    const sellerVariants = seller.products.flatMap((p) =>
      p.variants.map((v) => ({ ...v, basePrice: p.basePrice, categoryId: p.categoryId, productId: p.id }))
    );

    if (sellerVariants.length === 0) continue;

    console.log(`Generating orders for seller: ${seller.storeName}...`);

    // Distribute orders across past 120 days (higher density recently for realistic growth curve)
    for (let day = 120; day >= 0; day--) {
      // 1 to 4 orders per day on average, with occasional quiet days
      const ordersToday = day % 7 === 0 ? 3 : (day % 3 === 0 ? 2 : (day % 5 === 0 ? 0 : 1));

      for (let o = 0; o < ordersToday; o++) {
        orderSequence++;
        const customer = customerRecords[(orderSequence + day) % customerRecords.length];
        const location = INDIAN_CITIES[(orderSequence + day * 3) % INDIAN_CITIES.length];

        // Date of order with random hour
        const orderDate = new Date(now.getTime() - day * dayMs + ((o * 3 + 9) * 3600 * 1000));

        // Determine status: 80% Delivered/Paid/Shipped, 12% Cancelled, 8% Refunded
        let status: OrderStatus = OrderStatus.DELIVERED;
        if (day < 3) {
          status = OrderStatus.PROCESSING;
        } else if (orderSequence % 9 === 0) {
          status = OrderStatus.CANCELLED;
        } else if (orderSequence % 14 === 0) {
          status = OrderStatus.REFUNDED;
        } else if (day < 7) {
          status = OrderStatus.SHIPPED;
        }

        // Payment method
        const paymentMethods: PaymentProvider[] = [
          PaymentProvider.RAZORPAY,
          PaymentProvider.RAZORPAY,
          PaymentProvider.COD,
          PaymentProvider.MOCK,
        ];
        const paymentMethod = paymentMethods[orderSequence % paymentMethods.length];

        // Select 1 to 3 items
        const numItems = (orderSequence % 4 === 0) ? 2 : 1;
        const selectedVariants = [];
        for (let i = 0; i < numItems; i++) {
          const varIndex = (orderSequence * 3 + i) % sellerVariants.length;
          selectedVariants.push(sellerVariants[varIndex]);
        }

        let subtotalRupees = 0;
        const itemsCreate = selectedVariants.map((v) => {
          const unitPrice = Number(v.priceOverride || v.basePrice);
          const qty = 1;
          subtotalRupees += unitPrice * qty;
          return {
            variantId: v.id,
            skuSnapshot: v.sku,
            nameSnapshot: v.name,
            unitPrice: unitPrice,
            costPriceSnapshot: Number(v.costPrice || (unitPrice * 0.6)),
            quantity: qty,
          };
        });

        // GST is 18% inclusive
        const taxAmount = Math.round(subtotalRupees * (18 / 118) * 100) / 100;
        const shippingCost = subtotalRupees >= 1500 ? 0 : 99;
        const totalAmount = subtotalRupees + shippingCost;

        const orderNumber = `ORD-ANL-${seller.storeSlug.substring(0, 3).toUpperCase()}-${orderDate.getFullYear()}${(orderDate.getMonth() + 1).toString().padStart(2, '0')}-${orderSequence}`;

        const order = await prisma.order.create({
          data: {
            orderNumber,
            userId: customer.id,
            customerName: `${customer.firstName} ${customer.lastName}`,
            customerEmail: customer.email,
            customerPhone: customer.phoneNumber || '+919876543210',
            status,
            paymentMethod,
            subtotal: subtotalRupees,
            taxAmount,
            shippingCost,
            discountAmount: 0,
            totalAmount,
            createdAt: orderDate,
            updatedAt: orderDate,
            shippingAddressSnapshot: {
              recipientName: `${customer.firstName} ${customer.lastName}`,
              phoneNumber: customer.phoneNumber || '+919876543210',
              streetLine1: `Plot ${orderSequence % 100}, Sector ${orderSequence % 15}`,
              city: location.city,
              stateProvince: location.state,
              postalCode: location.pin,
              countryCode: 'IN',
            },
            items: {
              create: itemsCreate,
            },
          },
        });

        // Add payment transaction
        await prisma.paymentTransaction.create({
          data: {
            orderId: order.id,
            provider: paymentMethod,
            gatewayOrderId: `gateway_ord_${order.id.substring(0, 8)}`,
            gatewayPaymentId: `gateway_pay_${order.id.substring(0, 8)}`,
            idempotencyKey: `idemp_${order.id}`,
            status: status === OrderStatus.CANCELLED ? PaymentStatus.FAILED : (status === OrderStatus.REFUNDED ? PaymentStatus.REFUNDED : PaymentStatus.SUCCEEDED),
            amountPaise: BigInt(Math.round(totalAmount * 100)),
            rawResponse: { simulated: true, method: paymentMethod },
            createdAt: orderDate,
          },
        });

        totalOrdersCreated++;
      }
    }
  }

  console.log(`✅ Created ${totalOrdersCreated} validated historical orders.`);

  // 5. Seed Behavioral Analytics Events for Funnel Analysis
  console.log('Generating behavioral funnel events across 30 days...');
  const firstSeller = sellers[0];
  const secondSeller = sellers[1] || sellers[0];

  for (let d = 30; d >= 0; d--) {
    const eventDate = new Date(now.getTime() - d * dayMs);
    const dailySessions = 40 + (30 - d) * 2; // increasing sessions over time

    for (let s = 0; s < dailySessions; s++) {
      const sessionId = `sess_${d}_${s}_${Math.random().toString(36).substring(2, 8)}`;
      const targetSeller = s % 2 === 0 ? firstSeller : secondSeller;
      const targetProduct = targetSeller.products[s % targetSeller.products.length];

      // 1. Homepage view (100% of sessions)
      await prisma.analyticsEvent.create({
        data: {
          eventType: 'HOMEPAGE_VIEW',
          sessionId,
          createdAt: new Date(eventDate.getTime() + s * 10000),
          metadata: { device: s % 3 === 0 ? 'mobile' : 'desktop' },
        },
      });
      totalEventsCreated++;

      // 2. Product view (~65% of sessions)
      if (s % 10 < 7 && targetProduct) {
        await prisma.analyticsEvent.create({
          data: {
            eventType: 'PRODUCT_VIEW',
            sessionId,
            sellerId: targetSeller.id,
            productId: targetProduct.id,
            createdAt: new Date(eventDate.getTime() + s * 10000 + 30000),
            metadata: { productName: targetProduct.name },
          },
        });
        totalEventsCreated++;

        // 3. Add to cart (~35% of product viewers)
        if (s % 10 < 3) {
          await prisma.analyticsEvent.create({
            data: {
              eventType: 'ADD_TO_CART',
              sessionId,
              sellerId: targetSeller.id,
              productId: targetProduct.id,
              createdAt: new Date(eventDate.getTime() + s * 10000 + 60000),
              metadata: { variantSku: targetProduct.variants[0]?.sku },
            },
          });
          totalEventsCreated++;

          // 4. Checkout initiated (~60% of add to carts)
          if (s % 10 < 2) {
            await prisma.analyticsEvent.create({
              data: {
                eventType: 'CHECKOUT_INITIATED',
                sessionId,
                sellerId: targetSeller.id,
                createdAt: new Date(eventDate.getTime() + s * 10000 + 120000),
                metadata: {},
              },
            });
            totalEventsCreated++;

            // 5. Purchase completed (~70% of checkout initiated)
            if (s % 10 === 0) {
              await prisma.analyticsEvent.create({
                data: {
                  eventType: 'PURCHASE_COMPLETED',
                  sessionId,
                  sellerId: targetSeller.id,
                  createdAt: new Date(eventDate.getTime() + s * 10000 + 200000),
                  metadata: {},
                },
              });
              totalEventsCreated++;
            }
          }
        }
      }
    }
  }

  console.log(`✅ Seeded ${totalEventsCreated} behavioral funnel events.`);
  console.log('🎉 Analytics Data Seeding Complete!');
}

seedAnalyticsData()
  .catch((e) => {
    console.error('Failed to seed analytics data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
