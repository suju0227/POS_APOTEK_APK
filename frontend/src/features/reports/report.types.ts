export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ReportFilters = {
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
  cashierId?: string;
  productId?: string;
  categoryId?: string;
  batchId?: string;
  page?: number;
  limit?: number;
};

export type SalesReportSummary = {
  transactionCount: number;
  returnCount: number;
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  returnTotal: number;
  netRevenue: number;
};

export type SalesReportRow = {
  id: string;
  saleNumber: string;
  saleDate: string;
  cashier: {
    id: string;
    name: string;
    username: string;
  };
  paymentMethod: string;
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  returnTotal: number;
  netTotal: number;
  returnStatus: 'RETURNED' | 'NONE';
  items: {
    id: string;
    productId: string;
    productName: string;
    categoryId: string;
    categoryName: string;
    unitName: string;
    qtySale: number;
    qtyBase: number;
    sellingPrice: number;
    subtotal: number;
    discountAmount: number;
    totalAfterDiscount: number;
  }[];
};

export type SalesReportCharts = {
  daily: {
    date: string;
    transactionCount: number;
    grossRevenue: number;
    discountTotal: number;
    returnTotal: number;
    netRevenue: number;
  }[];
  paymentMethods: {
    paymentMethod: string;
    transactionCount: number;
    netRevenue: number;
  }[];
};

export type SalesReportResponse = {
  filters: Record<string, unknown>;
  summary: SalesReportSummary;
  charts: SalesReportCharts;
  pagination: Pagination;
  data: SalesReportRow[];
};

export type ProfitReportSummary = {
  allocationCount: number;
  grossRevenue: number;
  totalDiscount: number;
  totalHpp: number;
  grossProfit: number;
  returnRevenue: number;
  returnHpp: number;
  returnProfit: number;
  netRevenue: number;
  netHpp: number;
  netProfit: number;
  profitDisplay: number;
};

export type ProfitReportRow = {
  allocationId: string;
  saleId: string;
  saleNumber: string;
  saleDate: string;
  cashier: {
    id: string;
    name: string;
    username: string;
  };
  productId: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  batchId: string;
  batchNumber: string;
  expiredDate: string;
  qtyBase: number;
  grossRevenue: number;
  discountAmount: number;
  hppBaseSnapshot: number;
  hppAmount: number;
  grossProfit: number;
  returnRevenue: number;
  returnHpp: number;
  returnProfit: number;
  netRevenue: number;
  netHpp: number;
  netProfit: number;
  profitDisplay: number;
};

export type ProfitReportCharts = {
  daily: {
    date: string;
    grossRevenue: number;
    netRevenue: number;
    netHpp: number;
    netProfit: number;
    returnProfit: number;
  }[];
  topProducts: {
    productId: string;
    productName: string;
    netRevenue: number;
    netProfit: number;
  }[];
};

export type ProfitReportResponse = {
  filters: Record<string, unknown>;
  summary: ProfitReportSummary;
  charts: ProfitReportCharts;
  pagination: Pagination;
  data: ProfitReportRow[];
};
