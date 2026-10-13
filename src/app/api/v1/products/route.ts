import { NextRequest } from 'next/server';
import { listCatalogProducts } from '@/modules/catalog/queries';
import { apiError, apiSuccess } from '@/lib/api-response';
import { ZodError } from 'zod';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const rawParams = {
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
      minPrice: searchParams.get('minPrice') || undefined,
      maxPrice: searchParams.get('maxPrice') || undefined,
      sort: searchParams.get('sort') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      isFeatured: searchParams.get('isFeatured') || undefined,
    };

    const result = await listCatalogProducts(rawParams);

    return apiSuccess({ data: result }, 200);
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((err) => ({
        field: err.path.join('.'),
        issue: err.message,
      }));
      return apiError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid catalog query parameters provided.',
        details,
        status: 400,
      });
    }

    console.error('Unhandled catalog list error:', error);
    return apiError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve catalog products.',
      status: 500,
    });
  }
}
