import { apiClient } from '../../shared/api/apiClient';
import type {
  CashierProduct,
  CashierSaleResponse,
  CreateSaleFromPrescriptionPayload,
  CreateSalePayload,
  ReadyPrescription,
} from './cashier.types';

export const cashierApi = {
  products: (q: string) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    const query = params.toString();
    return apiClient.get<CashierProduct[]>(
      `/cashier/products${query ? `?${query}` : ''}`,
    );
  },
  createSale: (payload: CreateSalePayload, idempotencyKey: string) =>
    apiClient.post<CashierSaleResponse>('/sales', payload, {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    }),
  readyPrescriptions: () =>
    apiClient.get<ReadyPrescription[]>('/prescriptions/ready-for-payment'),
  createSaleFromPrescription: (
    prescriptionId: string,
    payload: CreateSaleFromPrescriptionPayload,
    idempotencyKey: string,
  ) =>
    apiClient.post<CashierSaleResponse>(
      `/sales/from-prescription/${prescriptionId}`,
      payload,
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      },
    ),
};
