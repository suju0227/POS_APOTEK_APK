import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { batchApi } from './batch.api';

export function useBatches() {
  return useQuery({
    queryKey: ['batches'],
    queryFn: batchApi.list,
  });
}

export function useCreateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: batchApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['batches'] }),
  });
}

export function useDeactivateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: batchApi.deactivate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['batches'] }),
  });
}

export function useStockMutations() {
  return useQuery({
    queryKey: ['stock', 'mutations'],
    queryFn: batchApi.mutations,
  });
}
