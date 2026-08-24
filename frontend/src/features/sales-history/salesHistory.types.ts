export type SaleAllocation = {
  id: string;
  batchNumber: string;
  expiredDate: string;
  qtyBase: number;
  hppBaseSnapshot?: number;
  profitAmount?: number;
  returnedQtyBase: number;
};

export type SaleItem = {
  id: string;
  productName: string;
  unitName: string;
  qtySale: number;
  qtyBase: number;
  sellingPrice: number;
  subtotal: number;
  discountAmount: number;
  totalAfterDiscount: number;
  allocations?: SaleAllocation[];
};

export type Sale = {
  id: string;
  saleNumber: string;
  paymentMethod: string;
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  paidAmount: number;
  changeAmount: number;
  totalHpp?: number;
  totalProfit?: number;
  createdAt: string;
  cashier: {
    id: string;
    name: string;
    username: string;
    role: string;
  };
  items: SaleItem[];
};
