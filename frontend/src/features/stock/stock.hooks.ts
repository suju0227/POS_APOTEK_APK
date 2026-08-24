import { useQuery } from '@tanstack/react-query';
import { stockApi } from './stock.api';

export function useStock() {
  return useQuery({
    queryKey: ['stock'],
    queryFn: stockApi.list,
  });
}

export function useStockMutations() {
  return useQuery({
    queryKey: ['stock-mutations'],
    queryFn: stockApi.mutations,
  });
}
