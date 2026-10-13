import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export interface SellerDashboardMetrics {
  totalProducts: number;
  totalStockUnits: number;
  lowStockCount: number;
  totalOrders: number;
  grossSalesPaise: bigint;
  lowStockVariants: {
    id: string;
    sku: string;
    name: string;
    stockQuantity: number;
    productName: string;
    productSlug: string;
  }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    status: string;
    createdAt: Date;
    itemCount: number;
    sellerTotal: number;
  }[];
}

/**
 * Retrieves the seller profile for a given user ID.
 * If user is ADMIN and has no seller profile, lazily provisions an administrative store profile.
 */
export async function getSellerProfile(userId: string) {
  let profile = await db.sellerProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  });

  if (!profile) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (user && user.role === 'ADMIN') {
      profile = await db.sellerProfile.create({
        data: {
          userId: user.id,
          storeName: 'Platform Central Direct',
          storeSlug: `platform-central-${user.id.substring(0, 6)}`,
          description: 'Official direct catalog store managed by enterprise administrators.',
          isVerified: true,
          commissionRate: new Prisma.Decimal(0.0),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      });
    }
  }

  return profile;
}

/**
 * Aggregates marketplace dashboard metrics isolated strictly to the seller's catalog and items.
 */
export async function getSellerDashboardMetrics(sellerId: string): Promise<SellerDashboardMetrics> {
  const [productsCount, stockAggregation, lowStockVariants, ordersWithSellerItems] =
    await Promise.all([
      db.product.count({
        where: { sellerId },
      }),
      db.productVariant.aggregate({
        where: {
          product: { sellerId },
        },
        _sum: {
          stockQuantity: true,
        },
      }),
      db.productVariant.findMany({
        where: {
          product: { sellerId },
          stockQuantity: { lte: 5 },
        },
        include: {
          product: { select: { name: true, slug: true } },
        },
        take: 6,
        orderBy: { stockQuantity: 'asc' },
      }),
      db.order.findMany({
        where: {
          items: {
            some: {
              variant: {
                product: { sellerId },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          items: {
            where: {
              variant: {
                product: { sellerId },
              },
            },
          },
        },
      }),
    ]);

  // Aggregate gross sales from paid/processing/shipped/delivered orders containing seller items
  const validCompletedOrders = await db.orderItem.findMany({
    where: {
      variant: {
        product: { sellerId },
      },
      order: {
        status: {
          in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'],
        },
      },
    },
    select: {
      unitPrice: true,
      quantity: true,
    },
  });

  const grossSalesRupees = validCompletedOrders.reduce((sum, item) => {
    return sum + Number(item.unitPrice) * item.quantity;
  }, 0);

  const grossSalesPaise = BigInt(Math.round(grossSalesRupees * 100));

  const totalOrders = await db.order.count({
    where: {
      items: {
        some: {
          variant: {
            product: { sellerId },
          },
        },
      },
    },
  });

  return {
    totalProducts: productsCount,
    totalStockUnits: stockAggregation._sum.stockQuantity || 0,
    lowStockCount: lowStockVariants.length,
    totalOrders,
    grossSalesPaise,
    lowStockVariants: lowStockVariants.map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.name,
      stockQuantity: v.stockQuantity,
      productName: v.product.name,
      productSlug: v.product.slug,
    })),
    recentOrders: ordersWithSellerItems.map((o) => {
      const sellerTotal = o.items.reduce(
        (sum, item) => sum + Number(item.unitPrice) * item.quantity,
        0
      );
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        status: o.status,
        createdAt: o.createdAt,
        itemCount: o.items.reduce((sum, item) => sum + item.quantity, 0),
        sellerTotal,
      };
    }),
  };
}

/**
 * Lists products isolated to the seller.
 */
export async function getSellerProducts(
  sellerId: string,
  options?: { search?: string; categoryId?: string; isPublished?: boolean }
) {
  const whereClause: Prisma.ProductWhereInput = {
    sellerId,
  };

  if (options?.search) {
    whereClause.OR = [
      { name: { contains: options.search, mode: 'insensitive' } },
      { slug: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  if (options?.categoryId) {
    whereClause.categoryId = options.categoryId;
  }

  if (options?.isPublished !== undefined) {
    whereClause.isPublished = options.isPublished;
  }

  return db.product.findMany({
    where: whereClause,
    include: {
      category: { select: { id: true, name: true, slug: true } },
      variants: {
        select: {
          id: true,
          sku: true,
          name: true,
          stockQuantity: true,
          priceOverride: true,
        },
      },
      images: {
        take: 1,
        orderBy: { sortOrder: 'asc' },
        select: { url: true, altText: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Creates a new marketplace product authored by the seller.
 */
export async function createSellerProduct(
  sellerId: string,
  data: {
    name: string;
    slug: string;
    description: string;
    basePrice: number;
    categoryId: string;
    isPublished?: boolean;
    imageUrl?: string;
    variants: {
      sku: string;
      name: string;
      stockQuantity: number;
      priceOverride?: number | null;
      attributes?: Record<string, any>;
    }[];
  }
) {
  return db.product.create({
    data: {
      sellerId,
      name: data.name,
      slug: data.slug,
      description: data.description,
      basePrice: new Prisma.Decimal(data.basePrice),
      categoryId: data.categoryId,
      isPublished: data.isPublished ?? true,
      images: data.imageUrl
        ? {
            create: [
              {
                url: data.imageUrl,
                altText: `${data.name} product image`,
                sortOrder: 0,
              },
            ],
          }
        : undefined,
      variants: {
        create: data.variants.map((v) => ({
          sku: v.sku,
          name: v.name,
          stockQuantity: v.stockQuantity,
          priceOverride: v.priceOverride ? new Prisma.Decimal(v.priceOverride) : null,
          attributes: v.attributes || {},
        })),
      },
    },
    include: {
      variants: true,
      images: true,
    },
  });
}

/**
 * Lists all variants belonging to the seller's catalog for inventory management.
 */
export async function getSellerInventory(sellerId: string, search?: string) {
  const whereClause: Prisma.ProductVariantWhereInput = {
    product: {
      sellerId,
    },
  };

  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { product: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  return db.productVariant.findMany({
    where: whereClause,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          basePrice: true,
          images: { take: 1, select: { url: true } },
        },
      },
    },
    orderBy: [{ stockQuantity: 'asc' }, { name: 'asc' }],
  });
}

/**
 * Safely updates variant stock with strict seller ownership check.
 */
export async function updateSellerVariantStock(
  sellerId: string,
  variantId: string,
  newStockQuantity: number
) {
  if (newStockQuantity < 0) {
    throw new Error('Stock quantity cannot be negative.');
  }

  // Verify ownership
  const variant = await db.productVariant.findFirst({
    where: {
      id: variantId,
      product: { sellerId },
    },
  });

  if (!variant) {
    throw new Error('Product variant not found or access denied for this seller.');
  }

  return db.productVariant.update({
    where: { id: variantId },
    data: { stockQuantity: newStockQuantity },
  });
}

/**
 * Lists orders that contain products sold by this seller.
 */
export async function getSellerOrders(sellerId: string) {
  return db.order.findMany({
    where: {
      items: {
        some: {
          variant: {
            product: { sellerId },
          },
        },
      },
    },
    include: {
      items: {
        where: {
          variant: {
            product: { sellerId },
          },
        },
        include: {
          variant: {
            select: {
              sku: true,
              name: true,
              product: { select: { name: true, slug: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
