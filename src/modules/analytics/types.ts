export type DateRangePreset = '7d' | '30d' | '90d' | '1y' | 'custom';

export interface DateRangeFilter {
  preset: DateRangePreset;
  startDate?: string;
  endDate?: string;
}

export interface ResolvedDateRange {
  startDate: Date;
  endDate: Date;
  previousStartDate: Date;
  previousEndDate: Date;
  daysDiff: number;
}

export interface SalesKPIs {
  grossRevenueRupees: number;
  grossRevenuePaise: string;
  eligibleOrdersCount: number;
  unitsSold: number;
  averageOrderValueRupees: number;
  previousPeriodRevenueRupees: number;
  revenueGrowthRatePct: number;
  cancellationRatePct: number;
  returnRatePct: number;
  grossProfitRupees: number | null;
  grossMarginPct: number | null;
  totalInventoryValueRupees: number | null;
  isProfitReliable: boolean;
  isInventoryValueReliable: boolean;
}

export interface TimeSeriesTrendPoint {
  date: string;
  revenueRupees: number;
  ordersCount: number;
  unitsSold: number;
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  revenueRupees: number;
  percentageOfTotal: number;
  unitsSold: number;
  growthRatePct: number;
}

export interface MarketBenchmark {
  categoryName: string;
  sellerRevenueRupees: number;
  sellerCategorySharePct: number;
  platformCategorySharePct: number | null;
  benchmarkSource: 'AGGREGATED_PLATFORM' | 'UNAVAILABLE';
  reportingPeriod: string;
  growthOpportunityAssessment: string;
}

export interface GeographicDataPoint {
  state: string;
  city: string;
  orderCount: number;
  revenueRupees: number;
  averageOrderValueRupees: number;
  cancellationRatePct: number;
  isPromising: boolean;
}

export type RFMSegmentKey =
  | 'CHAMPIONS'
  | 'LOYAL_CUSTOMERS'
  | 'POTENTIAL_LOYALISTS'
  | 'NEW_CUSTOMERS'
  | 'AT_RISK'
  | 'HIBERNATING';

export interface RFMSegmentSummary {
  segmentKey: RFMSegmentKey;
  segmentName: string;
  description: string;
  customerCount: number;
  percentageOfCustomers: number;
  totalRevenueRupees: number;
  averageMonetaryRupees: number;
  recommendedActions: string[];
}

export interface RFMAnalysisResult {
  analysisPeriodDays: number;
  totalAnalyzedCustomers: number;
  overallRepeatPurchaseRatePct: number;
  segments: RFMSegmentSummary[];
}

export interface CohortMonthRetention {
  monthIndex: number;
  periodLabel: string;
  retainedCount: number;
  retentionPct: number;
}

export interface CohortData {
  cohortMonth: string; // e.g. "2026-05"
  initialCustomerCount: number;
  isIncomplete: boolean;
  retentions: CohortMonthRetention[];
}

export interface ConversionFunnelStage {
  stageKey: 'HOMEPAGE' | 'PRODUCT_VIEW' | 'ADD_TO_CART' | 'CHECKOUT_INITIATED' | 'PURCHASE_COMPLETED';
  stageName: string;
  uniqueSessions: number;
  conversionRateFromPreviousPct: number;
  dropOffRatePct: number;
  overallFunnelConversionPct: number;
}

export interface StockRiskStatus {
  status: 'HEALTHY' | 'LOW_STOCK' | 'OVERSTOCK' | 'OUT_OF_STOCK';
  label: string;
}

export interface ProductPerformanceItem {
  productId: string;
  productName: string;
  productSlug: string;
  sku: string;
  categoryName: string;
  unitsSold: number;
  revenueRupees: number;
  averageSellingPriceRupees: number;
  stockQuantity: number;
  inventoryTurnover: number | null;
  daysOfInventoryRemaining: number | null;
  returnRatePct: number;
  cancellationRatePct: number;
  stockRisk: 'HEALTHY' | 'LOW_STOCK' | 'OVERSTOCK' | 'OUT_OF_STOCK';
  costPriceRupees: number | null;
  grossMarginPct: number | null;
}

export interface ProductAffinityRule {
  antecedentNames: string[];
  consequentNames: string[];
  antecedentSkus: string[];
  consequentSkus: string[];
  support: number;
  confidence: number;
  lift: number;
  recommendedBundleLabel: string;
}

export interface DemandForecastPoint {
  date: string;
  predictedUnits: number;
  lowerBound: number;
  upperBound: number;
}

export interface ProductDemandForecast {
  productId: string;
  productName: string;
  sku: string;
  horizonDays: number;
  generatedAt: string;
  isDataSufficient: boolean;
  limitationReason?: string;
  modelUsed: string;
  historicalPoints: { date: string; units: number }[];
  forecastPoints: DemandForecastPoint[];
  stockoutRisk: boolean;
  overstockRisk: boolean;
}

export interface CustomerChurnAnalysis {
  analysisPeriodDays: number;
  totalCustomers: number;
  isDataSufficient: boolean;
  limitationReason?: string;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  riskDistribution: {
    tier: 'HIGH_RISK' | 'MEDIUM_RISK' | 'LOW_RISK';
    count: number;
    percentage: number;
    description: string;
  }[];
  contributingFactors: string[];
  suggestedRetentionActions: string[];
}

export interface InventoryValuationMetrics {
  totalInventoryUnits: number;
  totalInventoryValueRupees: number | null;
  grossMarginReturnOnInvestment: number | null; // GMROI = Gross Margin Earned / Average Inventory Cost
  isCostDataConfigured: boolean;
  unconfiguredCostVariantsCount: number;
  notes: string;
}

export interface PricingRecommendationItem {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  currentPriceRupees: number;
  suggestedPriceRupees: number;
  priceDeltaRupees: number;
  priceDeltaPct: number;
  minMarginPct: number | null;
  strategy: 'VELOCITY_CLEARANCE' | 'MARGIN_OPTIMIZER' | 'DEMAND_SURGE';
  reasoning: string;
  metricsSnapshot: Record<string, unknown>;
  status: 'PENDING_APPROVAL' | 'APPLIED' | 'REJECTED';
  createdAt: string;
}
