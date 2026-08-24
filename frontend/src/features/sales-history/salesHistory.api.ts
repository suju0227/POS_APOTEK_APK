import { apiClient } from '../../shared/api/apiClient';
import type { Sale } from './salesHistory.types';

export const salesHistoryApi = {
  list: () => apiClient.get<Sale[]>('/sales'),
  detail: (id: string) => apiClient.get<Sale>(`/sales/${id}`),
};
