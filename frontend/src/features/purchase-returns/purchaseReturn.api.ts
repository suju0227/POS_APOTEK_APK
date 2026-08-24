import { apiClient } from '../../shared/api/apiClient';
import type { CreatePurchaseReturnPayload, PurchaseReturn } from './purchaseReturn.types';

export const purchaseReturnApi = {
  list: () => apiClient.get<PurchaseReturn[]>('/purchase-returns'),
  create: (payload: CreatePurchaseReturnPayload, idempotencyKey: string) =>
    apiClient.post<PurchaseReturn>('/purchase-returns', payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
};
