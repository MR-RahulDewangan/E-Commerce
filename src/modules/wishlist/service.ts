import { db } from '@/lib/db';

export class WishlistError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = 'WishlistError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface WishlistItemDetail {
  id: string;
  variantId: string;
  sku: string;
  variantName: string;
  productName: string;
  productSlug: string;
  priceInr: number;
  imageUrl: string | null;
  stockQuantity: number;
  isAvailable: boolean;
  addedAt: Date;
}

export async function getOrCreateWishlist(userId: string) {
  const existing = await db.wishlist.findUnique({
    where: { userId },
  });
  if (existing) {
    return existing;
  }
  return db.wishlist.create({
    data: { userId },
  });
}

export async function getUserWishlist(userId: string): Promise<WishlistItemDetail[]> {
  const wishlist = await getOrCreateWishlist(userId);
  const items = await db.wishlistItem.findMany({
    where: { wishlistId: wishlist.id },
    include: {
      variant: {
        include: {
          product: {
            include: {
              images: {
                orderBy: { sortOrder: 'asc' },
                take: 1,
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return items.map((item) => {
    const basePrice = Number(item.variant.product.basePrice);
    const unitPrice =
      item.variant.priceOverride !== null
        ? Number(item.variant.priceOverride)
        : basePrice;

    return {
      id: item.id,
      variantId: item.variantId,
      sku: item.variant.sku,
      variantName: item.variant.name,
      productName: item.variant.product.name,
      productSlug: item.variant.product.slug,
      priceInr: unitPrice,
      imageUrl: item.variant.product.images[0]?.url || null,
      stockQuantity: item.variant.stockQuantity,
      isAvailable: item.variant.stockQuantity > 0 && item.variant.product.isPublished,
      addedAt: item.createdAt,
    };
  });
}

export async function addItemToWishlist(userId: string, variantId: string) {
  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });
  if (!variant) {
    throw new WishlistError('Product variant not found.', 'VARIANT_NOT_FOUND', 404);
  }

  const wishlist = await getOrCreateWishlist(userId);

  // Check if already in wishlist (idempotent add)
  const existingItem = await db.wishlistItem.findUnique({
    where: {
      wishlistId_variantId: {
        wishlistId: wishlist.id,
        variantId,
      },
    },
  });

  if (existingItem) {
    return existingItem;
  }

  return db.wishlistItem.create({
    data: {
      wishlistId: wishlist.id,
      variantId,
    },
  });
}

export async function removeItemFromWishlist(userId: string, itemIdOrVariantId: string) {
  const wishlist = await getOrCreateWishlist(userId);

  // Search by item id first, then by variantId
  const item = await db.wishlistItem.findFirst({
    where: {
      wishlistId: wishlist.id,
      OR: [{ id: itemIdOrVariantId }, { variantId: itemIdOrVariantId }],
    },
  });

  if (!item) {
    return null;
  }

  return db.wishlistItem.delete({
    where: { id: item.id },
  });
}
