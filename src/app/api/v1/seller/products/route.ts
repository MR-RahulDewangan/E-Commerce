import { NextRequest, NextResponse } from 'next/server';
import { requireSellerOrAdmin } from '@/modules/auth/guards';
import { getSellerProfile, getSellerProducts, createSellerProduct } from '@/modules/seller/service';
import { invalidateCatalogCache } from '@/modules/catalog/cache';
import { AuthError } from '@/modules/auth/service';
import { z } from 'zod';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const createProductSchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().min(10),
  basePrice: z.number().positive(),
  categoryId: z.string().uuid(),
  imageUrl: z.string().url().optional(),
  isPublished: z.boolean().default(true),
  variants: z
    .array(
      z.object({
        sku: z.string().min(3).max(50),
        name: z.string().min(1),
        stockQuantity: z.number().int().min(0),
        priceOverride: z.number().positive().optional().nullable(),
        size: z.string().optional(),
        color: z.string().optional(),
      })
    )
    .min(1, 'At least one product variant is required'),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireSellerOrAdmin(req);
    const profile = await getSellerProfile(user.id);

    if (!profile) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Seller profile not found' } },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;

    const products = await getSellerProducts(profile.id, { search, categoryId });

    return NextResponse.json({
      success: true,
      data: products,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.statusCode }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSellerOrAdmin(req);
    const profile = await getSellerProfile(user.id);

    if (!profile) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Seller profile not found' } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = createProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid product specifications',
            details: parsed.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const { name, description, basePrice, categoryId, imageUrl, isPublished, variants } =
      parsed.data;

    let baseSlug = slugify(name);
    let slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    const newProduct = await createSellerProduct(profile.id, {
      name,
      slug,
      description,
      basePrice,
      categoryId,
      imageUrl,
      isPublished,
      variants: variants.map((v) => ({
        sku: v.sku.toUpperCase(),
        name: v.name,
        stockQuantity: v.stockQuantity,
        priceOverride: v.priceOverride,
        attributes: {
          ...(v.size ? { size: v.size } : {}),
          ...(v.color ? { color: v.color } : {}),
        },
      })),
    });

    await invalidateCatalogCache();

    return NextResponse.json(
      {
        success: true,
        data: newProduct,
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.statusCode }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
