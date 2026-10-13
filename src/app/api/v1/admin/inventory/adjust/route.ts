import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdminOrFulfillment } from '@/modules/auth/guards';
import { AuthError } from '@/modules/auth/service';

const adjustInventorySchema = z.object({
  variantId: z.string().uuid('Invalid variant ID'),
  delta: z
    .number()
    .int('Delta must be an integer')
    .refine((val) => val !== 0, 'Delta cannot be zero'),
  reason: z.string().trim().min(3, 'A reason code or explanation of at least 3 characters is mandatory'),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdminOrFulfillment(req);

    const rawBody = await req.json();
    const parsed = adjustInventorySchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid inventory adjustment payload',
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { variantId, delta, reason } = parsed.data;

    // Check variant exists
    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: { select: { name: true } },
      },
    });

    if (!variant) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Product variant not found' } },
        { status: 404 }
      );
    }

    const previousStock = variant.stockQuantity;
    const newStock = previousStock + delta;

    if (newStock < 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NEGATIVE_STOCK_DISALLOWED',
            message: `Cannot decrement stock by ${Math.abs(delta)}. Current stock is ${previousStock}, which would result in negative inventory.`,
          },
        },
        { status: 400 }
      );
    }

    const auditEntry = {
      delta,
      previousStock,
      newStock,
      reason,
      adjustedBy: user.email,
      adjustedByName: `${user.firstName} ${user.lastName}`.trim(),
      timestamp: new Date().toISOString(),
    };

    const currentAttrs = (variant.attributes as Record<string, any>) || {};
    const existingLogs = Array.isArray(currentAttrs.auditLog) ? currentAttrs.auditLog : [];
    const updatedAttrs = {
      ...currentAttrs,
      auditLog: [...existingLogs, auditEntry],
    };

    // Atomic update
    const updatedVariant = await db.$transaction(async (tx) => {
      if (delta > 0) {
        await tx.$executeRaw`
          UPDATE product_variants
          SET "stockQuantity" = "stockQuantity" + ${delta},
              "attributes" = ${JSON.stringify(updatedAttrs)}::jsonb
          WHERE id = ${variantId}
        `;
      } else {
        const absDelta = Math.abs(delta);
        const rows = await tx.$executeRaw`
          UPDATE product_variants
          SET "stockQuantity" = "stockQuantity" - ${absDelta},
              "attributes" = ${JSON.stringify(updatedAttrs)}::jsonb
          WHERE id = ${variantId} AND "stockQuantity" >= ${absDelta}
        `;

        if (rows === 0) {
          throw new Error('Concurrent modification: stock was reduced by another transaction.');
        }
      }

      return tx.productVariant.findUnique({
        where: { id: variantId },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        variantId,
        sku: variant.sku,
        productName: variant.product.name,
        previousStock,
        newStock: updatedVariant?.stockQuantity ?? newStock,
        delta,
        reason,
        auditEntry,
      },
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.statusCode }
      );
    }
    console.error('Admin adjust inventory error:', err);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'SERVER_ERROR', message: err.message || 'Failed to adjust stock' },
      },
      { status: 500 }
    );
  }
}
