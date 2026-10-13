import { NextRequest } from 'next/server';
import { getCatalogCategories } from '@/modules/catalog/queries';
import { apiError, apiSuccess } from '@/lib/api-response';

export async function GET(_req: NextRequest) {
  try {
    const categories = await getCatalogCategories();
    return apiSuccess({ data: { categories } }, 200);
  } catch (error) {
    console.error('Unhandled categories list error:', error);
    return apiError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve categories.',
      status: 500,
    });
  }
}
