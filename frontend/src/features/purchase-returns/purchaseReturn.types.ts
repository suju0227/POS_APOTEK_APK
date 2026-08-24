export type PurchaseReturn = {
  id: string;
  purchaseId: string | null;
  purchaseNumber: string | null;
  returnNumber: string;
  reason: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    username: string;
    role: string;
  };
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    batchId: string;
    batchNumber: string;
    qtyBaseReturned: number;
    hppBaseSnapshot: number;
    totalAmount: number;
  }>;
};

export type CreatePurchaseReturnPayload = {
  purchaseId?: string;
  reason: string;
  items: Array<{
    batchId: string;
    qtyBaseReturned: number;
  }>;
};
