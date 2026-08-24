import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { purchaseReturnApi } from './purchaseReturn.api';
import type { CreatePurchaseReturnPayload } from './purchaseReturn.types';

export function usePurchaseReturns() {
  return useQuery({
    queryKey: ['purchase-returns'],
    queryFn: purchaseReturnApi.list,
  });
}

export function useCreatePurchaseReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      payload,
      idempotencyKey,
    }: {
      payload: CreatePurchaseReturnPayload;
      idempotencyKey: string;
    }) => purchaseReturnApi.create(payload, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-returns'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
  });
}
