import type { DiscountType, PaymentMethod } from '../cashier/cashier.types';

export type PrescriptionStatus =
  | 'DRAFT'
  | 'REVIEWED'
  | 'NEED_CONFIRMATION'
  | 'READY_FOR_PAYMENT'
  | 'PAID'
  | 'COMPLETED'
  | 'CANCELLED';

export type PrescriptionItem = {
  id: string;
  productId: string;
  productUnitId: string;
  productName: string;
  unitName: string;
  unitSymbol: string | null;
  qtySaleUnit: number;
  conversionToBase: number;
  instruction: string | null;
  note: string | null;
};

export type Prescription = {
  id: string;
  prescriptionNumber: string;
  patientName: string;
  patientPhone: string | null;
  doctorName: string | null;
  prescriptionDate: string;
  status: PrescriptionStatus;
  note: string | null;
  readyAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  pharmacist: {
    id: string;
    name: string;
    username: string;
    role: string;
  };
  saleId: string | null;
  items: PrescriptionItem[];
};

export type PrescriptionItemPayload = {
  productId: string;
  productUnitId: string;
  qtySaleUnit: number;
  instruction?: string;
  note?: string;
};

export type CreatePrescriptionPayload = {
  patientName: string;
  patientPhone?: string;
  doctorName?: string;
  prescriptionDate: string;
  note?: string;
  items: PrescriptionItemPayload[];
};

export type CreateSaleFromPrescriptionPayload = {
  paymentMethod: PaymentMethod;
  paidAmount: number;
  discountType: DiscountType;
  discountValue: number;
  customerName?: string;
  note?: string;
};
