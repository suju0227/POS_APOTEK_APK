import { apiClient } from '../../shared/api/apiClient';
import type {
  CreatePurchaseOrderPayload,
  PurchaseDraftFromPo,
  PurchaseOrder,
  PurchaseOrderPrintPreview,
} from './purchaseOrder.types';

export const purchaseOrderApi = {
  list: () => apiClient.get<PurchaseOrder[]>('/purchase-orders'),
  create: (payload: CreatePurchaseOrderPayload) =>
    apiClient.post<PurchaseOrder>('/purchase-orders', payload),
  markSent: (id: string) =>
    apiClient.post<PurchaseOrder>(`/purchase-orders/${id}/mark-sent`),
  cancel: (id: string) =>
    apiClient.post<PurchaseOrder>(`/purchase-orders/${id}/cancel`),
  printPreview: (id: string) =>
    apiClient.get<PurchaseOrderPrintPreview>(
      `/purchase-orders/${id}/print-preview`,
    ),
  convertToPurchase: (id: string) =>
    apiClient.post<PurchaseDraftFromPo>(
      `/purchase-orders/${id}/convert-to-purchase`,
    ),
};
