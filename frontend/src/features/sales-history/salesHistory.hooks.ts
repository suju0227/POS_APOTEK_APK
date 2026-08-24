import { useQuery } from '@tanstack/react-query';
import { salesHistoryApi } from './salesHistory.api';

export function useSalesHistory() {
  return useQuery({
    queryKey: ['sales-history'],
    queryFn: salesHistoryApi.list,
  });
}
