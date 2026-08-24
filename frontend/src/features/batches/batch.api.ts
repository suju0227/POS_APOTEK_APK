import { apiClient } from '../../shared/api/apiClient';
import type { CreateBatchPayload, ProductBatch, StockMutation } from './batch.types';

export const batchApi = {
  list: () => apiClient.get<ProductBatch[]>('/batches'),
  create: (payload: CreateBatchPayload) =>
    apiClient.post<ProductBatch>('/batches', payload),
  deactivate: (id: string) =>
    apiClient.patch<ProductBatch>(`/batches/${id}/deactivate`),
  mutations: () => apiClient.get<StockMutation[]>('/stock/mutations'),
};
