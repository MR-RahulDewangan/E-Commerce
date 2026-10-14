import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminOrFulfillment } from '@/modules/auth/guards';
import { adminCreateProductSchema } from '@/modules/catalog/validation';
import { invalidateCatalogCache } from '@/modules/catalog/cache';
import { AuthError } from '@/modules/auth/service';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrFulfillment(req);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const categoryId = searchParams.get('categoryId')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } },
      ];
    }
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    const [products, totalCount] = await Promise.all([
      db.product.findMany({
        where: whereClause,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          variants: { orderBy: { sku: 'asc' } },
          images: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.product.count({ where: whereClause }),
    ]);

    const formattedProducts = products.map((p) => {
      const totalStock = p.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        basePrice: Number(p.basePrice),
        isPublished: p.isPublished,
        isFeatured: p.isFeatured,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        category: p.category,
        variantsCount: p.variants.length,
        totalStock,
        primaryImage: p.images[0]?.url || null,
        variants: p.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          name: v.name,
          priceOverride: v.priceOverride ? Number(v.priceOverride) : null,
          effectivePrice: v.priceOverride ? Number(v.priceOverride) : Number(p.basePrice),
          stockQuantity: v.stockQuantity,
          attributes: v.attributes,
          weightGrams: v.weightGrams,
        })),
        images: p.images,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedProducts,
      pagination: {
        page,
        limit,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.statusCode }
      );
    }
    console.error('Admin GET products error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch products' } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminOrFulfillment(req);

    const rawBody = await req.json();
    const parsed = adminCreateProductSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid product payload',
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const {
      name,
      slug: customSlug,
      categoryId,
      description,
      basePrice,
      isPublished,
      isFeatured,
      images,
      variants,
    } = parsed.data;

    // Check category exists
    const categoryExists = await db.category.findUnique({
      where: { id: categoryId },
    });
    if (!categoryExists) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } },
        { status: 404 }
      );
    }

    // Auto-generate or sanitize slug
    const finalSlug = customSlug ? slugify(customSlug) : slugify(name);
    const existingSlug = await db.product.findUnique({
      where: { slug: finalSlug },
    });
    if (existingSlug) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SLUG_CONFLICT',
            message: `A product with slug '${finalSlug}' already exists.`,
          },
        },
        { status: 409 }
      );
    }

    // Check SKU uniqueness
    const skus = variants.map((v) => v.sku);
    const existingSku = await db.productVariant.findFirst({
      where: { sku: { in: skus } },
    });
    if (existingSku) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SKU_CONFLICT',
            message: `SKU '${existingSku.sku}' is already in use by another variant.`,
          },
        },
        { status: 409 }
      );
    }

    // Atomic creation
    const createdProduct = await db.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name,
          slug: finalSlug,
          description,
          basePrice,
          isPublished,
          isFeatured,
          categoryId,
          images: {
            create: images.map((img, idx) => ({
              url: img.url,
              altText: img.altText || name,
              sortOrder: idx,
            })),
          },
          variants: {
            create: variants.map((v) => ({
              sku: v.sku,
              name: v.name,
              priceOverride: v.priceOverride ?? null,
              stockQuantity: v.stockQuantity,
              attributes: v.attributes || {},
              weightGrams: v.weightGrams || 0,
            })),
          },
        },
        include: {
          category: true,
          variants: true,
          images: true,
        },
      });

      return product;
    });

    await invalidateCatalogCache();

    return NextResponse.json(
      {
        success: true,
        data: {
          ...createdProduct,
          basePrice: Number(createdProduct.basePrice),
          variants: createdProduct.variants.map((v) => ({
            ...v,
            priceOverride: v.priceOverride ? Number(v.priceOverride) : null,
          })),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.statusCode }
      );
    }
    console.error('Admin POST product error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create product' } },
      { status: 500 }
    );
  }
}
