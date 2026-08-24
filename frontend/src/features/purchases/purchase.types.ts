import type { Product, ProductUnit, Supplier } from '../master-data/masterData.types';
import type { PurchaseOrderItem } from '../purchase-orders/purchaseOrder.types';

export type PurchaseTaxMode = 'NON_PPN' | 'PPN_INCLUDED' | 'PPN_EXCLUDED';
export type PurchaseDiscountType = 'NONE' | 'NOMINAL' | 'PERCENT';

export type PurchaseSellingPricePayload = {
  productUnitId: string;
  sellingPrice: number;
};

export type CreatePurchaseItemPayload = {
  purchaseOrderItemId?: string;
  productId: string;
  productUnitId: string;
  batchNumber: string;
  expiredDate: string;
  qtyPurchase: number;
  purchasePrice: number;
  discountType?: PurchaseDiscountType;
  discountValue?: number;
  sellingPrices: PurchaseSellingPricePayload[];
};

export type CreatePurchasePayload = {
  supplierId: string;
  purchaseOrderId?: string;
  purchaseDate: string;
  invoiceDate?: string;
  invoiceNumber?: string;
  taxMode?: PurchaseTaxMode;
  taxRatePercent?: number;
  invoiceTotalInput: number;
  roundingAdjustment?: number;
  differenceNote?: string;
  items: CreatePurchaseItemPayload[];
};

export type PurchaseItem = {
  id: string;
  purchaseOrderItemId: string | null;
  productId: string;
  productUnitId: string;
  batchId: string;
  batchNumber: string;
  expiredDate: string;
  qtyPurchase: number;
  qtyOrdered: number | null;
  qtyReceived: number;
  conversionSnapshot: number;
  qtyBase: number;
  purchasePrice: number;
  discountType: PurchaseDiscountType;
  discountValue: number;
  discountAmount: number;
  grossTotal: number;
  netTotal: number;
  hppBase: number;
  totalPrice: number;
  product: Product;
  productUnit: ProductUnit;
  purchaseOrderItem: PurchaseOrderItem | null;
  batch: {
    id: string;
    batchNumber: string;
    expiredDate: string;
    initialStockBase: number;
    currentStockBase: number;
    hppBase: number;
  };
};

export type Purchase = {
  id: string;
  supplierId: string;
  purchaseOrderId: string | null;
  purchaseNumber: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  purchaseDate: string;
  taxMode: PurchaseTaxMode;
  taxRatePercent: number;
  subtotal: number;
  purchaseDiscountAmount: number;
  taxAmount: number;
  invoiceTotalInput: number | null;
  calculatedTotal: number;
  roundingAdjustment: number;
  differenceNote: string | null;
  supplier: Supplier;
  items: PurchaseItem[];
  createdBy: {
    id: string;
    name: string;
    username: string;
    role: string;
  };
};

export type PurchaseDraftFromPo = {
  supplierId: string;
  purchaseOrderId: string;
  purchaseDate: string;
  taxMode: PurchaseTaxMode;
  taxRatePercent: number;
  items: Array<{
    purchaseOrderItemId: string;
    productId: string;
    productUnitId: string;
    qtyPurchase: number;
    batchNumber: string;
    expiredDate: string;
    purchasePrice: number;
    discountType: PurchaseDiscountType;
    discountValue: number;
    sellingPrices: PurchaseSellingPricePayload[];
    product: Product;
    productUnit: ProductUnit;
  }>;
};
