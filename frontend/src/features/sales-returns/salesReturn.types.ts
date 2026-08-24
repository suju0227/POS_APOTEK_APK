export type ReturnableItem = {
  saleItemId: string;
  saleBatchAllocationId: string;
  productId: string;
  productName: string;
  unitName: string;
  batchNumber: string;
  expiredDate: string;
  qtyBase: number;
  returnedQtyBase: number;
  returnableQtyBase: number;
  refundableAmount: number;
};

export type ReturnableSale = {
  saleId: string;
  saleNumber: string;
  createdAt: string;
  items: ReturnableItem[];
};

export type SalesReturn = {
  id: string;
  saleId: string;
  saleNumber: string;
  returnNumber: string;
  reason: string;
  totalRefund: number;
  status: string;
  createdAt: string;
  cashier: {
    id: string;
    name: string;
    username: string;
    role: string;
  };
  items: {
    id: string;
    productName: string;
    batchNumber: string;
    unitName: string;
    qtyBaseReturned: number;
    refundAmount: number;
  }[];
};

export type CreateSalesReturnPayload = {
  saleId: string;
  reason: string;
  items: {
    saleBatchAllocationId: string;
    qtyBaseReturned: number;
  }[];
};
