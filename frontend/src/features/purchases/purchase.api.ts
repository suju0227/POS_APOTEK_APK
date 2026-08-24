import { apiClient } from '../../shared/api/apiClient';
import type {
  CreatePurchasePayload,
  Purchase,
  PurchaseDraftFromPo,
} from './purchase.types';

export const purchaseApi = {
  list: () => apiClient.get<Purchase[]>('/purchases'),
  detail: (id: string) => apiClient.get<Purchase>(`/purchases/${id}`),
  create: (payload: CreatePurchasePayload, idempotencyKey: string) =>
    apiClient.post<Purchase>('/purchases', payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  draftFromPo: (poId: string) =>
    apiClient.get<PurchaseDraftFromPo>(`/purchases/create-from-po/${poId}`),
};
