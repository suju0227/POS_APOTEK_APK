import type { Product, ProductUnit, Supplier } from '../master-data/masterData.types';

export type BatchUnitPrice = {
  id: string;
  productUnitId: string;
  sellingPrice: number;
  isActive: boolean;
  productUnit: ProductUnit;
};

export type ProductBatch = {
  id: string;
  productId: string;
  supplierId: string | null;
  batchNumber: string;
  expiredDate: string;
  initialStockBase: number;
  currentStockBase: number;
  hppBase: number;
  isActive: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK' | 'EXPIRED';
  product: Product;
  supplier: Supplier | null;
  prices: BatchUnitPrice[];
};

export type BatchPricePayload = {
  productUnitId: string;
  sellingPrice: number;
};

export type CreateBatchPayload = {
  productId: string;
  supplierId?: string;
  batchNumber: string;
  expiredDate: string;
  initialStockBase: number;
  currentStockBase: number;
  hppBase: number;
  prices: BatchPricePayload[];
};

export type StockMutation = {
  id: string;
  productId: string;
  batchId: string;
  mutationType: string;
  referenceType: string;
  qtyBefore: number;
  qtyChange: number;
  qtyAfter: number;
  reason: string | null;
  createdAt: string;
};
