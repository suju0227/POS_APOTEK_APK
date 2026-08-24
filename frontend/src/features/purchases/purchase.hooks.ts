import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { purchaseApi } from './purchase.api';

export function usePurchases() {
  return useQuery({
    queryKey: ['purchases'],
    queryFn: purchaseApi.list,
  });
}

export function usePurchase(id: string | null) {
  return useQuery({
    queryKey: ['purchases', id],
    queryFn: () => purchaseApi.detail(id ?? ''),
    enabled: Boolean(id),
  });
}

export function usePurchaseDraftFromPo(poId: string | null) {
  return useQuery({
    queryKey: ['purchases', 'draft-from-po', poId],
    queryFn: () => purchaseApi.draftFromPo(poId ?? ''),
    enabled: Boolean(poId),
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      payload,
      idempotencyKey,
    }: {
      payload: Parameters<typeof purchaseApi.create>[0];
      idempotencyKey: string;
    }) => purchaseApi.create(payload, idempotencyKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchases'] }),
  });
}
