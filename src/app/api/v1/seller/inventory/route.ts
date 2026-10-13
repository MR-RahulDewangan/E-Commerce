import { NextRequest, NextResponse } from 'next/server';
import { requireSellerOrAdmin } from '@/modules/auth/guards';
import { getSellerProfile, getSellerInventory, updateSellerVariantStock } from '@/modules/seller/service';
import { AuthError } from '@/modules/auth/service';
import { z } from 'zod';

const updateInventorySchema = z.object({
  variantId: z.string().uuid(),
  stockQuantity: z.number().int().min(0, 'Stock cannot be negative'),
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

    const inventory = await getSellerInventory(profile.id, search);

    return NextResponse.json({
      success: true,
      data: inventory,
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

export async function PATCH(req: NextRequest) {
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
    const parsed = updateInventorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid inventory parameters',
            details: parsed.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const updatedVariant = await updateSellerVariantStock(
      profile.id,
      parsed.data.variantId,
      parsed.data.stockQuantity
    );

    return NextResponse.json({
      success: true,
      data: updatedVariant,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.statusCode }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: err.message } },
      { status: 400 }
    );
  }
}
