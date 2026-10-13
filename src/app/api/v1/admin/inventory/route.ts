import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminOrFulfillment } from '@/modules/auth/guards';
import { AuthError } from '@/modules/auth/service';

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrFulfillment(req);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const lowStockOnly = searchParams.get('lowStock') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (lowStockOnly) {
      whereClause.stockQuantity = { lte: 5 };
    }
    if (search) {
      whereClause.OR = [
        { sku: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [variants, totalCount] = await Promise.all([
      db.productVariant.findMany({
        where: whereClause,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              basePrice: true,
              category: { select: { id: true, name: true } },
              images: { take: 1, orderBy: { sortOrder: 'asc' } },
            },
          },
        },
        orderBy: [{ stockQuantity: 'asc' }, { sku: 'asc' }],
        skip,
        take: limit,
      }),
      db.productVariant.count({ where: whereClause }),
    ]);

    const formatted = variants.map((v) => {
      const attrs = (v.attributes as Record<string, any>) || {};
      const auditLog = Array.isArray(attrs.auditLog) ? attrs.auditLog : [];

      return {
        id: v.id,
        sku: v.sku,
        name: v.name,
        stockQuantity: v.stockQuantity,
        priceOverride: v.priceOverride ? Number(v.priceOverride) : null,
        effectivePrice: v.priceOverride ? Number(v.priceOverride) : Number(v.product.basePrice),
        product: {
          id: v.product.id,
          name: v.product.name,
          slug: v.product.slug,
          categoryName: v.product.category.name,
          imageUrl: v.product.images[0]?.url || null,
        },
        auditLog,
        lastAdjustedAt: auditLog.length > 0 ? auditLog[auditLog.length - 1].timestamp : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: formatted,
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
    console.error('Admin GET inventory error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to retrieve inventory' } },
      { status: 500 }
    );
  }
}
