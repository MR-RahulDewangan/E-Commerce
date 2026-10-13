import { db } from '@/lib/db';
import { calculateCartPricing, CartPricingSummary } from './pricing';
import crypto from 'node:crypto';

export const CART_SESSION_COOKIE_NAME = 'cart_session';
export const CART_DURATION_DAYS = 30;

export class CartError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = 'CartError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function generateCartSessionToken(): string {
  return `cart_sess_${crypto.randomBytes(24).toString('hex')}`;
}

export interface DetailedCartItem {
  id: string;
  variantId: string;
  sku: string;
  name: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  attributes: Record<string, any>;
  unitPricePaise: number;
  unitPriceInr: number;
  quantity: number;
  totalPricePaise: number;
  totalPriceInr: number;
  availableStock: number;
  isAvailable: boolean;
}

export interface CartResponse {
  id: string;
  sessionToken: string;
  userId: string | null;
  items: DetailedCartItem[];
  pricing: CartPricingSummary;
  itemCount: number;
  totalQuantity: number;
}

/**
 * Retrieves an existing cart or creates a fresh cart record.
 */
export async function getOrCreateCart(sessionToken?: string, userId?: string) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + CART_DURATION_DAYS);

  // 1. If user is authenticated, search by userId first
  if (userId) {
    const userCart = await db.cart.findFirst({
      where: { userId },
    });
    if (userCart) {
      return userCart;
    }
  }

  // 2. Search by sessionToken
  if (sessionToken) {
    const guestCart = await db.cart.findUnique({
      where: { sessionToken },
    });
    if (guestCart) {
      // If user is now known, associate user
      if (userId && !guestCart.userId) {
        return db.cart.update({
          where: { id: guestCart.id },
          data: { userId },
        });
      }
      return guestCart;
    }
  }

  // 3. Create fresh cart
  const newSessionToken = sessionToken || generateCartSessionToken();
  return db.cart.create({
    data: {
      sessionToken: newSessionToken,
      userId: userId || null,
      expiresAt,
    },
  });
}

/**
 * Retrieves full cart document with real-time inventory and server-authoritative pricing.
 */
export async function getCartDetails(
  sessionToken?: string,
  userId?: string,
  destinationState?: string
): Promise<CartResponse> {
  const cart = await getOrCreateCart(sessionToken, userId);

  const cartItems = await db.cartItem.findMany({
    where: { cartId: cart.id },
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
    orderBy: { variant: { name: 'asc' } },
  });

  // Build items for server pricing engine
  const pricingItems = cartItems.map((ci) => {
    const basePricePaise = Math.round(Number(ci.variant.product.basePrice) * 100);
    const unitPricePaise =
      ci.variant.priceOverride !== null
        ? Math.round(Number(ci.variant.priceOverride) * 100)
        : basePricePaise;

    return {
      variantId: ci.variantId,
      name: `${ci.variant.product.name} - ${ci.variant.name}`,
      sku: ci.variant.sku,
      unitPricePaise,
      quantity: ci.quantity,
    };
  });

  const pricing = calculateCartPricing({
    items: pricingItems,
    destinationState,
  });

  const detailedItems: DetailedCartItem[] = cartItems.map((ci, index) => {
    const priced = pricing.items[index];
    const primaryImg = ci.variant.product.images[0]?.url || null;

    return {
      id: ci.id,
      variantId: ci.variantId,
      sku: ci.variant.sku,
      name: ci.variant.name,
      productName: ci.variant.product.name,
      productSlug: ci.variant.product.slug,
      imageUrl: primaryImg,
      attributes: (ci.variant.attributes as Record<string, any>) || {},
      unitPricePaise: priced.unitPricePaise,
      unitPriceInr: priced.unitPricePaise / 100,
      quantity: ci.quantity,
      totalPricePaise: priced.totalPricePaise,
      totalPriceInr: priced.totalPricePaise / 100,
      availableStock: ci.variant.stockQuantity,
      isAvailable: ci.variant.stockQuantity >= ci.quantity && ci.variant.product.isPublished,
    };
  });

  const totalQuantity = detailedItems.reduce((acc, it) => acc + it.quantity, 0);

  return {
    id: cart.id,
    sessionToken: cart.sessionToken,
    userId: cart.userId,
    items: detailedItems,
    pricing,
    itemCount: detailedItems.length,
    totalQuantity,
  };
}

/**
 * Adds an item to the cart with strict stock availability checking.
 */
export async function addItemToCart(
  variantId: string,
  quantity: number,
  sessionToken?: string,
  userId?: string
): Promise<CartResponse> {
  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });

  if (!variant) {
    throw new CartError('The requested product variant was not found.', 'VARIANT_NOT_FOUND', 404);
  }

  if (!variant.product.isPublished) {
    throw new CartError('This product is currently unavailable.', 'PRODUCT_UNAVAILABLE', 400);
  }

  const cart = await getOrCreateCart(sessionToken, userId);

  // Check if item already exists in cart
  const existingItem = await db.cartItem.findUnique({
    where: {
      cartId_variantId: {
        cartId: cart.id,
        variantId,
      },
    },
  });

  const newQuantity = (existingItem?.quantity || 0) + quantity;

  if (newQuantity > variant.stockQuantity) {
    throw new CartError(
      `Insufficient stock. Only ${variant.stockQuantity} units available (you requested ${newQuantity}).`,
      'INSUFFICIENT_STOCK',
      400
    );
  }

  if (existingItem) {
    await db.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: newQuantity },
    });
  } else {
    await db.cartItem.create({
      data: {
        cartId: cart.id,
        variantId,
        quantity,
      },
    });
  }

  return getCartDetails(cart.sessionToken, userId);
}

/**
 * Updates item quantity in the cart or removes it if quantity is 0.
 */
export async function updateCartItemQuantity(
  itemId: string,
  quantity: number,
  sessionToken?: string,
  userId?: string
): Promise<CartResponse> {
  const cart = await getOrCreateCart(sessionToken, userId);

  const cartItem = await db.cartItem.findFirst({
    where: {
      id: itemId,
      cartId: cart.id,
    },
    include: { variant: true },
  });

  if (!cartItem) {
    throw new CartError('Cart item not found.', 'ITEM_NOT_FOUND', 404);
  }

  if (quantity <= 0) {
    await db.cartItem.delete({
      where: { id: itemId },
    });
  } else {
    if (quantity > cartItem.variant.stockQuantity) {
      throw new CartError(
        `Insufficient stock. Only ${cartItem.variant.stockQuantity} units available.`,
        'INSUFFICIENT_STOCK',
        400
      );
    }

    await db.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  return getCartDetails(cart.sessionToken, userId);
}

/**
 * Removes an item from the cart.
 */
export async function removeCartItem(
  itemId: string,
  sessionToken?: string,
  userId?: string
): Promise<CartResponse> {
  const cart = await getOrCreateCart(sessionToken, userId);

  await db.cartItem.deleteMany({
    where: {
      id: itemId,
      cartId: cart.id,
    },
  });

  return getCartDetails(cart.sessionToken, userId);
}

/**
 * Clears all items from the cart.
 */
export async function clearCart(
  sessionToken?: string,
  userId?: string
): Promise<CartResponse> {
  const cart = await getOrCreateCart(sessionToken, userId);

  await db.cartItem.deleteMany({
    where: { cartId: cart.id },
  });

  return getCartDetails(cart.sessionToken, userId);
}

/**
 * Merges a guest cart into an authenticated customer's account cart upon login/register.
 */
export async function mergeGuestCartIntoUserCart(
  guestSessionToken: string,
  userId: string
): Promise<CartResponse> {
  const guestCart = await db.cart.findUnique({
    where: { sessionToken: guestSessionToken },
    include: {
      items: {
        include: { variant: true },
      },
    },
  });

  if (!guestCart || guestCart.items.length === 0) {
    return getCartDetails(undefined, userId);
  }

  const userCart = await getOrCreateCart(undefined, userId);

  for (const guestItem of guestCart.items) {
    const existingUserItem = await db.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: userCart.id,
          variantId: guestItem.variantId,
        },
      },
    });

    const maxStock = guestItem.variant.stockQuantity;
    if (maxStock <= 0) continue;

    if (existingUserItem) {
      const mergedQty = Math.min(existingUserItem.quantity + guestItem.quantity, maxStock);
      await db.cartItem.update({
        where: { id: existingUserItem.id },
        data: { quantity: mergedQty },
      });
    } else {
      const initialQty = Math.min(guestItem.quantity, maxStock);
      await db.cartItem.create({
        data: {
          cartId: userCart.id,
          variantId: guestItem.variantId,
          quantity: initialQty,
        },
      });
    }
  }

  // Delete guest cart once merged
  await db.cart.delete({ where: { id: guestCart.id } });

  return getCartDetails(userCart.sessionToken, userId);
}
