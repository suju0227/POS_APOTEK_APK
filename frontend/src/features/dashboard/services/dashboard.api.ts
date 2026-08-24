import { apiClient } from '../../../shared/api/apiClient';
import type {
  DashboardActivity as ApiActivity,
  DashboardProfitTrendItem,
  DashboardPurchaseOrderSummary as ApiPurchaseOrderSummary,
  DashboardPrescriptionSummary as ApiPrescriptionSummary,
  DashboardRevenueTrendItem,
  DashboardSummary as ApiDashboardSummary,
  ExpiredBatchItem as ApiExpiringBatchItem,
  LowStockItem as ApiLowStockItem,
  RecentTransaction as ApiLatestSaleItem,
} from '../dashboard.types';
import type {
  DashboardSummary,
  DashboardTrendPoint,
  ExpiringBatchItem,
  LatestSaleItem,
  LowStockProduct,
  PrescriptionSummary,
  PurchaseOrderSummary,
  RecentActivity,
} from '../types';

export const dashboardApi = {
  summary: async () => mapSummary(await apiClient.get<ApiDashboardSummary>('/dashboard/summary')),
  revenueTrend: async () =>
    (
      await apiClient.get<DashboardRevenueTrendItem[]>(
        '/dashboard/revenue-trend?period=7d',
      )
    ).map(mapRevenueTrendPoint),
  profitTrend: async () =>
    (
      await apiClient.get<DashboardProfitTrendItem[]>(
        '/dashboard/profit-trend?period=7d',
      )
    ).map(mapProfitTrendPoint),
  latestSales: async (limit = 5) =>
    (
      await apiClient.get<ApiLatestSaleItem[]>(
        `/dashboard/latest-sales?limit=${limit}`,
      )
    ).map(mapLatestSale),
  lowStock: async (limit = 10) =>
    (
      await apiClient.get<ApiLowStockItem[]>(`/dashboard/low-stock?limit=${limit}`)
    ).map(mapLowStockProduct),
  expiringBatches: async (limit = 10) =>
    (
      await apiClient.get<ApiExpiringBatchItem[]>(
        `/dashboard/expiring-batches?limit=${limit}`,
      )
    ).map(mapExpiringBatch),
  purchaseOrderSummary: async () =>
    mapPurchaseOrderSummary(
      await apiClient.get<ApiPurchaseOrderSummary>(
        '/dashboard/purchase-order-summary',
      ),
    ),
  prescriptionSummary: async () =>
    mapPrescriptionSummary(
      await apiClient.get<ApiPrescriptionSummary>('/dashboard/prescription-summary'),
    ),
  recentActivities: async (limit = 5) =>
    (
      await apiClient.get<ApiActivity[]>(
        `/dashboard/recent-activities?limit=${limit}`,
      )
    ).map(mapRecentActivity),
};

function mapSummary(summary: ApiDashboardSummary): DashboardSummary {
  return {
    todayRevenue: summary.today.netRevenue,
    todayProfit: summary.today.netProfit,
    weeklyProfit: summary.week.netProfit,
    monthlyProfit: summary.month.netProfit,
    yearlyProfit: summary.year.netProfit,
    todayTransactionCount: summary.today.transactionCount,
    lowStockCount: summary.lowStockCount,
    expiringBatchCount: summary.expiredBatchCount,
  };
}

function mapRevenueTrendPoint(item: DashboardRevenueTrendItem): DashboardTrendPoint {
  return {
    date: item.date,
    revenue: item.netRevenue,
  };
}

function mapProfitTrendPoint(item: DashboardProfitTrendItem): DashboardTrendPoint {
  return {
    date: item.date,
    profit: item.netProfit,
    revenue: 0,
  };
}

function mapLatestSale(item: ApiLatestSaleItem): LatestSaleItem {
  return {
    id: item.id,
    saleNumber: item.saleNumber,
    saleTime: item.createdAt,
    cashierName: item.cashier.name,
    total: item.grandTotal,
    paymentMethod: item.paymentMethod,
    status: 'Selesai',
  };
}

function mapLowStockProduct(item: ApiLowStockItem): LowStockProduct {
  const shortage = Math.max(item.minStockBase - item.stockAvailableBase, 0);
  return {
    productId: item.productId,
    productName: item.name,
    currentStockBase: item.stockAvailableBase,
    minimumStockBase: item.minStockBase,
    shortage,
    baseUnitName: item.baseUnit.symbol ?? item.baseUnit.name,
    status:
      item.stockAvailableBase <= 0
        ? 'HABIS'
        : item.stockAvailableBase <= item.minStockBase
          ? 'RENDAH'
          : 'AMAN',
  };
}

function mapExpiringBatch(item: ApiExpiringBatchItem): ExpiringBatchItem {
  return {
    batchId: item.batchId,
    productName: item.productName,
    batchNumber: item.batchNumber,
    expiredDate: item.expiredDate,
    daysRemaining: item.daysUntilExpired,
    currentStockBase: item.currentStockBase,
    baseUnitName: item.baseUnit.symbol ?? item.baseUnit.name,
    status:
      item.daysUntilExpired < 0
        ? 'EXPIRED'
        : item.daysUntilExpired <= 30
          ? 'KRITIS'
          : item.daysUntilExpired <= 90
            ? 'WASPADA'
            : 'AMAN',
  };
}

function mapPurchaseOrderSummary(
  summary: ApiPurchaseOrderSummary,
): PurchaseOrderSummary {
  return {
    draft: summary.draft,
    sent: summary.sent,
    partiallyReceived: summary.partiallyReceived,
    received: summary.received,
    todayPurchases: summary.purchasesToday,
  };
}

function mapPrescriptionSummary(
  summary: ApiPrescriptionSummary,
): PrescriptionSummary {
  return {
    newPrescription: summary.newPrescriptions,
    readyForPayment: summary.readyForPayment,
    completed: summary.completed,
    todayCounseling: summary.counselingToday,
  };
}

function mapRecentActivity(item: ApiActivity): RecentActivity {
  return {
    id: item.id,
    createdAt: item.createdAt,
    actorName: item.user?.name ?? '-',
    action: item.action,
    entityType: item.entityType,
    summary: summarizeActivity(item),
  };
}

function summarizeActivity(item: ApiActivity) {
  if (item.entityId) return `${item.entityType} ${item.entityId}`;
  if (item.newValue) return 'Data baru tercatat';
  if (item.oldValue) return 'Data lama berubah';
  return '-';
}
