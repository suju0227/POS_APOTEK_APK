import { apiClient } from '../../shared/api/apiClient';
import type {
  CreateSalesReturnPayload,
  ReturnableSale,
  SalesReturn,
} from './salesReturn.types';

export const salesReturnApi = {
  list: () => apiClient.get<SalesReturn[]>('/sales-returns'),
  returnableItems: (saleId: string) =>
    apiClient.get<ReturnableSale>(`/sales/${saleId}/returnable-items`),
  create: (payload: CreateSalesReturnPayload, idempotencyKey: string) =>
    apiClient.post<SalesReturn>('/sales-returns', payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
};
