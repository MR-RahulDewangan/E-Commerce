export interface CatalogCategorySummary {
  id: string;
  name: string;
  slug: string;
}

export interface CatalogProductListItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  category: CatalogCategorySummary;
  primaryImage: string | null;
  inStock: boolean;
  totalStock: number;
  variantCount: number;
  isFeatured: boolean;
  createdAt: string;
}

export interface CatalogPaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface CatalogListResult {
  items: CatalogProductListItem[];
  pagination: CatalogPaginationMeta;
}

export interface CatalogVariantDetail {
  id: string;
  sku: string;
  name: string;
  priceOverride: number | null;
  effectivePrice: number;
  stockQuantity: number;
  inStock: boolean;
  attributes: Record<string, any>;
  weightGrams: number;
}

export interface CatalogImageDetail {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
}

export interface CatalogSellerSummary {
  storeName: string;
  storeSlug: string;
  isVerified: boolean;
}

export interface CatalogProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  isFeatured: boolean;
  category: CatalogCategorySummary;
  seller?: CatalogSellerSummary | null;
  images: CatalogImageDetail[];
  variants: CatalogVariantDetail[];
  totalStock: number;
  inStock: boolean;
  createdAt: string;
  updatedAt: string;
}

