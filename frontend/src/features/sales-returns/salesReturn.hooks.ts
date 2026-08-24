import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { salesReturnApi } from './salesReturn.api';
import type { CreateSalesReturnPayload } from './salesReturn.types';

export function useSalesReturns() {
  return useQuery({
    queryKey: ['sales-returns'],
    queryFn: salesReturnApi.list,
  });
}

export function useReturnableItems(saleId: string) {
  return useQuery({
    queryKey: ['sales', saleId, 'returnable-items'],
    queryFn: () => salesReturnApi.returnableItems(saleId),
    enabled: Boolean(saleId),
  });
}

export function useCreateSalesReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      payload,
      idempotencyKey,
    }: {
      payload: CreateSalesReturnPayload;
      idempotencyKey: string;
    }) => salesReturnApi.create(payload, idempotencyKey),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sales-returns'] }),
        queryClient.invalidateQueries({ queryKey: ['sales-history'] }),
        queryClient.invalidateQueries({ queryKey: ['stock'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['reports'] }),
      ]);
    },
  });
}
