export type StockSummary = {
  id: string;
  code: string;
  barcode: string | null;
  name: string;
  genericName: string | null;
  minStockBase: number;
  totalStockBase: number;
  isLowStock: boolean;
  activeBatchCount: number;
  expiredBatchCount: number;
  isActive: boolean;
  category: { id: string; name: string };
  baseUnit: { id: string; name: string; symbol: string | null };
};

export type StockMutation = {
  id: string;
  mutationType: string;
  referenceType: string;
  referenceId: string;
  qtyBefore: number;
  qtyChange: number;
  qtyAfter: number;
  reason: string | null;
  createdAt: string;
  product: { id: string; name: string; code: string };
  batch: { id: string; batchNumber: string };
  createdBy: { id: string; name: string; username: string; role: string };
};
