import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from './services/dashboard.api';

const realtimeDashboardQuery = {
  refetchInterval: 15_000,
  refetchOnWindowFocus: true,
  staleTime: 10_000,
};

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: dashboardApi.summary,
    ...realtimeDashboardQuery,
  });
}

export function useLowStock() {
  return useQuery({
    queryKey: ['dashboard', 'low-stock', 10],
    queryFn: () => dashboardApi.lowStock(10),
    ...realtimeDashboardQuery,
  });
}

export function useExpiredBatches(enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: ['dashboard', 'expiring-batches', 10],
    queryFn: () => dashboardApi.expiringBatches(10),
    ...realtimeDashboardQuery,
  });
}

export function useRecentTransactions(enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: ['dashboard', 'latest-sales', 5],
    queryFn: () => dashboardApi.latestSales(5),
    ...realtimeDashboardQuery,
  });
}

export function useDashboardRevenueTrend(enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: ['dashboard', 'revenue-trend', '7d'],
    queryFn: dashboardApi.revenueTrend,
    ...realtimeDashboardQuery,
  });
}

export function useDashboardProfitTrend(enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: ['dashboard', 'profit-trend', '7d'],
    queryFn: dashboardApi.profitTrend,
    ...realtimeDashboardQuery,
  });
}

export function useDashboardPurchaseOrderSummary(enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: ['dashboard', 'purchase-order-summary'],
    queryFn: dashboardApi.purchaseOrderSummary,
    ...realtimeDashboardQuery,
  });
}

export function useDashboardPrescriptionSummary(enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: ['dashboard', 'prescription-summary'],
    queryFn: dashboardApi.prescriptionSummary,
    ...realtimeDashboardQuery,
  });
}

export function useDashboardRecentActivities(enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: ['dashboard', 'recent-activities', 5],
    queryFn: () => dashboardApi.recentActivities(5),
    ...realtimeDashboardQuery,
  });
}
