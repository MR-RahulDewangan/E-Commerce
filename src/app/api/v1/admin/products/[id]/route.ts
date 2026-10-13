import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminOrFulfillment } from '@/modules/auth/guards';
import { adminUpdateProductSchema } from '@/modules/catalog/validation';
import { AuthError } from '@/modules/auth/service';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminOrFulfillment(req);
    const { id } = await params;

    const product = await db.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: { orderBy: { sku: 'asc' } },
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        basePrice: Number(product.basePrice),
        variants: product.variants.map((v) => ({
          ...v,
          priceOverride: v.priceOverride ? Number(v.priceOverride) : null,
          effectivePrice: v.priceOverride ? Number(v.priceOverride) : Number(product.basePrice),
        })),
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.statusCode }
      );
    }
    console.error('Admin GET product by ID error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to retrieve product' } },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminOrFulfillment(req);
    const { id } = await params;

    const existingProduct = await db.product.findUnique({
      where: { id },
      include: { variants: true, images: true },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } },
        { status: 404 }
      );
    }

    const rawBody = await req.json();
    const parsed = adminUpdateProductSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid product update payload',
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

    let finalSlug = existingProduct.slug;
    if (customSlug || (name && name !== existingProduct.name)) {
      finalSlug = customSlug ? slugify(customSlug) : slugify(name || existingProduct.name);
      if (finalSlug !== existingProduct.slug) {
        const slugConflict = await db.product.findUnique({
          where: { slug: finalSlug },
        });
        if (slugConflict) {
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
      }
    }

    if (categoryId && categoryId !== existingProduct.categoryId) {
      const categoryExists = await db.category.findUnique({
        where: { id: categoryId },
      });
      if (!categoryExists) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } },
          { status: 404 }
        );
      }
    }

    const updated = await db.$transaction(async (tx) => {
      // 1. Update product root fields
      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          slug: finalSlug,
          ...(categoryId !== undefined && { categoryId }),
          ...(description !== undefined && { description }),
          ...(basePrice !== undefined && { basePrice }),
          ...(isPublished !== undefined && { isPublished }),
          ...(isFeatured !== undefined && { isFeatured }),
        },
      });

      // 2. Update images if supplied
      if (images !== undefined) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productImage.createMany({
          data: images.map((img, idx) => ({
            productId: id,
            url: img.url,
            altText: img.altText || updatedProduct.name,
            sortOrder: idx,
          })),
        });
      }

      // 3. Update or create variants if supplied
      if (variants !== undefined && variants.length > 0) {
        for (const v of variants) {
          if (v.id) {
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                sku: v.sku,
                name: v.name,
                priceOverride: v.priceOverride ?? null,
                stockQuantity: v.stockQuantity,
                attributes: v.attributes || {},
                weightGrams: v.weightGrams || 0,
              },
            });
          } else {
            await tx.productVariant.create({
              data: {
                productId: id,
                sku: v.sku,
                name: v.name,
                priceOverride: v.priceOverride ?? null,
                stockQuantity: v.stockQuantity,
                attributes: v.attributes || {},
                weightGrams: v.weightGrams || 0,
              },
            });
          }
        }
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          category: true,
          variants: { orderBy: { sku: 'asc' } },
          images: { orderBy: { sortOrder: 'asc' } },
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        basePrice: Number(updated?.basePrice),
        variants: updated?.variants.map((v) => ({
          ...v,
          priceOverride: v.priceOverride ? Number(v.priceOverride) : null,
        })),
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.statusCode }
      );
    }
    console.error('Admin PUT product error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update product' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminOrFulfillment(req);
    const { id } = await params;

    const product = await db.product.findUnique({
      where: { id },
      include: {
        variants: {
          include: {
            orderItems: { select: { id: true }, take: 1 },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } },
        { status: 404 }
      );
    }

    // Check if any variant has existing order items
    const hasOrderHistory = product.variants.some((v) => v.orderItems.length > 0);

    if (hasOrderHistory) {
      // Safely unpublish to preserve order tax invoice foreign key relations
      await db.product.update({
        where: { id },
        data: { isPublished: false },
      });

      return NextResponse.json({
        success: true,
        message: 'Product unpublished to preserve historical customer order records.',
        unpublished: true,
      });
    }

    // Safe to hard delete
    await db.product.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully.',
      deleted: true,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.statusCode }
      );
    }
    console.error('Admin DELETE product error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete product' } },
      { status: 500 }
    );
  }
}
