import { NextRequest } from 'next/server';
import { getCatalogProductBySlug } from '@/modules/catalog/queries';
import { apiError, apiSuccess } from '@/lib/api-response';
import { ZodError } from 'zod';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    const product = await getCatalogProductBySlug(slug);

    if (!product) {
      return apiError({
        code: 'PRODUCT_NOT_FOUND',
        message: `Product with slug '${slug}' was not found.`,
        status: 404,
      });
    }

    return apiSuccess({ data: { product } }, 200);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid product slug parameter provided.',
        details: error.errors.map((e) => ({ field: 'slug', issue: e.message })),
        status: 400,
      });
    }

    console.error('Unhandled catalog product detail error:', error);
    return apiError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve product details.',
      status: 500,
    });
  }
}
