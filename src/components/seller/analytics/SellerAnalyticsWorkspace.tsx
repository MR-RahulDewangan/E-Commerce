'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DateRangePreset } from '@/modules/analytics/types';
import { DateRangeSelector } from './DateRangeSelector';
import { SalesKpiGrid } from './SalesKpiGrid';
import { RevenueTrendChart } from './RevenueTrendChart';
import { CategoryDistributionChart } from './CategoryDistributionChart';
import { OrderDistributionCards } from './OrderDistributionCards';
import { RfmSegmentMatrix } from './RfmSegmentMatrix';
import { CohortHeatmap } from './CohortHeatmap';
import { GeographicInsightsView } from './GeographicInsightsView';
import { ConversionFunnelView } from './ConversionFunnelView';
import { ProductPerformanceTable } from './ProductPerformanceTable';
import { PredictiveIntelligenceView } from './PredictiveIntelligenceView';
import { DynamicPricingView } from './DynamicPricingView';
import {
  TrendingUp,
  Users,
  Compass,
  Filter,
  Package,
  Sparkles,
  Tag,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface SellerAnalyticsWorkspaceProps {
  storeName: string;
}

type AnalyticsTab =
  | 'sales'
  | 'customers'
  | 'geo'
  | 'funnel'
  | 'products'
  | 'predictions'
  | 'pricing';

const TABS: { id: AnalyticsTab; label: string; icon: React.ElementType }[] = [
  { id: 'sales', label: 'Sales & KPIs', icon: TrendingUp },
  { id: 'customers', label: 'Customer Intelligence', icon: Users },
  { id: 'geo', label: 'Geographic Insights', icon: Compass },
  { id: 'funnel', label: 'Funnel & Conversion', icon: Filter },
  { id: 'products', label: 'Products & Affinity', icon: Package },
  { id: 'predictions', label: 'Forecasting & Churn', icon: Sparkles },
  { id: 'pricing', label: 'Dynamic Pricing', icon: Tag },
];

export function SellerAnalyticsWorkspace({ storeName }: SellerAnalyticsWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('sales');
  const [preset, setPreset] = useState<DateRangePreset>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Data states
  const [salesData, setSalesData] = useState<any>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [funnelData, setFunnelData] = useState<any>(null);
  const [productData, setProductData] = useState<any>(null);
  const [predictionData, setPredictionData] = useState<any>(null);
  const [pricingData, setPricingData] = useState<any>(null);

  const fetchCurrentTabData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      if (activeTab === 'sales') {
        const res = await fetch(`/api/v1/seller/analytics/sales?range=${preset}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Failed to load sales analytics.');
        setSalesData(json);
      } else if (activeTab === 'customers') {
        const res = await fetch(`/api/v1/seller/analytics/customers?windowDays=${preset === '1y' ? 365 : (preset === '90d' ? 90 : 30)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Failed to load customer analytics.');
        setCustomerData(json);
      } else if (activeTab === 'geo') {
        const res = await fetch(`/api/v1/seller/analytics/geographic?range=${preset}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Failed to load geographic analytics.');
        setGeoData(json);
      } else if (activeTab === 'funnel') {
        const res = await fetch(`/api/v1/seller/analytics/funnel?range=${preset}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Failed to load funnel analytics.');
        setFunnelData(json);
      } else if (activeTab === 'products') {
        const res = await fetch(`/api/v1/seller/analytics/products?range=${preset}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Failed to load product analytics.');
        setProductData(json);
      } else if (activeTab === 'predictions') {
        const res = await fetch(`/api/v1/seller/analytics/predictions?horizonDays=30`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Failed to load predictions.');
        setPredictionData(json);
      } else if (activeTab === 'pricing') {
        const res = await fetch(`/api/v1/seller/analytics/pricing`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Failed to load pricing data.');
        setPricingData(json);
      }
    } catch (err: any) {
      console.error('Analytics fetch error:', err);
      setErrorMessage(err.message || 'Error communicating with analytics service.');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, preset]);

  useEffect(() => {
    fetchCurrentTabData();
  }, [fetchCurrentTabData]);

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
            Seller Intelligence & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Real-time business telemetry, customer segmentation, basket affinities, and predictive modeling for {storeName}.
          </p>
        </div>

        {/* Reporting Period Filter */}
        <DateRangeSelector
          selectedPreset={preset}
          onSelect={(newPreset) => setPreset(newPreset)}
          isLoading={isLoading}
        />
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-200 no-scrollbar">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Content Area with Loading State */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs text-zinc-500 font-medium">
            Aggregating seller telemetry & computing predictive models...
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: Sales & KPIs */}
          {activeTab === 'sales' && salesData?.kpis && (
            <div className="space-y-6">
              <SalesKpiGrid kpis={salesData.kpis} periodLabel={preset} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <RevenueTrendChart data={salesData.trends} />
                </div>
                <div>
                  <CategoryDistributionChart categories={salesData.categories} />
                </div>
              </div>
              <OrderDistributionCards
                statusDistribution={salesData.distributions.statusDistribution}
                paymentDistribution={salesData.distributions.paymentDistribution}
              />
            </div>
          )}

          {/* TAB 2: Customer Intelligence */}
          {activeTab === 'customers' && customerData?.rfm && (
            <div className="space-y-8">
              <RfmSegmentMatrix
                segments={customerData.rfm.segments}
                repeatPurchaseRatePct={customerData.rfm.overallRepeatPurchaseRatePct}
                totalCustomers={customerData.rfm.totalAnalyzedCustomers}
              />
              <CohortHeatmap cohorts={customerData.cohorts} />
            </div>
          )}

          {/* TAB 3: Geographic Insights */}
          {activeTab === 'geo' && geoData?.locations && (
            <GeographicInsightsView
              locations={geoData.locations}
              stateAggregates={geoData.stateAggregates}
              topPromisingMarkets={geoData.topPromisingMarkets}
              benchmarks={geoData.benchmarks}
            />
          )}

          {/* TAB 4: Conversion Funnel */}
          {activeTab === 'funnel' && funnelData?.stages && (
            <ConversionFunnelView
              stages={funnelData.stages}
              summary={funnelData.summary}
              topViewedProducts={funnelData.topViewedProducts}
            />
          )}

          {/* TAB 5: Products & Affinity */}
          {activeTab === 'products' && productData?.products && (
            <ProductPerformanceTable
              products={productData.products}
              inventorySummary={productData.inventorySummary}
              affinityRules={productData.affinity.rules}
              affinitySufficient={productData.affinity.isDataSufficient}
              affinityLimitationReason={productData.affinity.limitationReason}
            />
          )}

          {/* TAB 6: Forecasting & Churn */}
          {activeTab === 'predictions' && predictionData?.forecasts && (
            <PredictiveIntelligenceView
              forecasts={predictionData.forecasts}
              churn={predictionData.churn}
            />
          )}

          {/* TAB 7: Dynamic Pricing */}
          {activeTab === 'pricing' && pricingData?.recommendations && (
            <DynamicPricingView
              recommendations={pricingData.recommendations}
              onActionComplete={fetchCurrentTabData}
            />
          )}
        </div>
      )}
    </div>
  );
}
