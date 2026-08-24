import { apiClient } from '../../shared/api/apiClient';
import type { StockMutation, StockSummary } from './stock.types';

export const stockApi = {
  list: () => apiClient.get<StockSummary[]>('/stock'),
  mutations: () => apiClient.get<StockMutation[]>('/stock/mutations'),
};
