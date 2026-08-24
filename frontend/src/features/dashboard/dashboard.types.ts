export type DashboardPeriodSummary = {
  startAt: string;
  endAt: string;
  transactionCount: number;
  returnCount: number;
  subtotal: number;
  discountTotal: number;
  salesTotal: number;
  salesReturnTotal: number;
  netRevenue: number;
  totalHpp?: number;
  hppReversed?: number;
  netHpp?: number;
  totalProfit?: number;
  profitReversed?: number;
  netProfit?: number;
};

export type DashboardSummary = {
  generatedAt: string;
  today: DashboardPeriodSummary;
  week: DashboardPeriodSummary;
  month: DashboardPeriodSummary;
  year: DashboardPeriodSummary;
  lowStockCount: number;
  expiredBatchCount: number;
};

export type DashboardTrendItem = {
  date: string;
  transactionCount: number;
  returnCount: number;
  subtotal: number;
  discountTotal: number;
  salesTotal: number;
  salesReturnTotal: number;
  netRevenue: number;
  totalHpp?: number;
  hppReversed?: number;
  netHpp?: number;
  totalProfit?: number;
  profitReversed?: number;
  netProfit?: number;
};

export type DashboardRevenueTrendItem = {
  date: string;
  transactionCount: number;
  returnCount: number;
  netRevenue: number;
};

export type DashboardProfitTrendItem = {
  date: string;
  transactionCount: number;
  returnCount: number;
  netProfit: number;
};

export type DashboardTopProduct = {
  productId: string;
  productName: string;
  categoryName: string;
  qtyBase: number;
  revenue: number;
  transactionCount: number;
};

export type DashboardPaymentMethod = {
  paymentMethod: string;
  transactionCount: number;
  returnCount: number;
  salesTotal: number;
  returnTotal: number;
  netRevenue: number;
};

export type LowStockItem = {
  productId: string;
  code: string;
  barcode: string | null;
  name: string;
  genericName: string | null;
  category: {
    id: string;
    name: string;
  };
  baseUnit: {
    id: string;
    name: string;
    symbol: string | null;
  };
  minStockBase: number;
  stockAvailableBase: number;
};

export type ExpiredBatchItem = {
  batchId: string;
  productId: string;
  productCode: string;
  productName: string;
  categoryName: string;
  baseUnit: {
    id: string;
    name: string;
    symbol: string | null;
  };
  supplierName: string | null;
  batchNumber: string;
  expiredDate: string;
  currentStockBase: number;
  daysUntilExpired: number;
};

export type RecentTransaction = {
  id: string;
  saleNumber: string;
  paymentMethod: string;
  grandTotal: number;
  returnTotal: number;
  netTotal: number;
  createdAt: string;
  cashier: {
    id: string;
    name: string;
    username: string;
    role: string;
  };
};

export type DashboardPurchaseOrderSummary = {
  draft: number;
  sent: number;
  partiallyReceived: number;
  received: number;
  purchasesToday: number;
};

export type DashboardPrescriptionSummary = {
  newPrescriptions: number;
  readyForPayment: number;
  completed: number;
  counselingToday: number;
};

export type DashboardActivityUser = {
  id: string;
  name: string;
  username: string;
  role: string;
};

export type DashboardActivity = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: DashboardActivityUser | null;
};
