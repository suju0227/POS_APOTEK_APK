import type { Product, ProductUnit, Supplier } from '../master-data/masterData.types';

export type PurchaseOrderItem = {
  id: string;
  productId: string;
  productUnitId: string;
  qtyOrdered: number;
  qtyReceived: number;
  note: string | null;
  product: Product;
  productUnit: ProductUnit;
};

export type PurchaseOrder = {
  id: string;
  supplierId: string;
  poNumber: string;
  orderDate: string;
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  note: string | null;
  supplier: Supplier;
  items: PurchaseOrderItem[];
};

export type CreatePurchaseOrderItemPayload = {
  productId: string;
  productUnitId: string;
  qtyOrdered: number;
  note?: string;
};

export type CreatePurchaseOrderPayload = {
  supplierId: string;
  orderDate: string;
  note?: string;
  items: CreatePurchaseOrderItemPayload[];
};

export type PurchaseOrderPrintPreview = {
  type: 'PURCHASE_ORDER_PRINT_PREVIEW';
  generatedAt: string;
  purchaseOrder: PurchaseOrder;
};

export type PurchaseDraftFromPo = {
  supplierId: string;
  purchaseOrderId: string;
  purchaseDate: string;
  items: Array<{
    purchaseOrderItemId: string;
    productId: string;
    productUnitId: string;
    qtyPurchase: number;
    batchNumber: string;
    expiredDate: string;
    purchasePrice: number;
  }>;
};
