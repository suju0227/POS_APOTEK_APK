import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { purchaseOrderApi } from './purchaseOrder.api';

export function usePurchaseOrders() {
  return useQuery({
    queryKey: ['purchase-orders'],
    queryFn: purchaseOrderApi.list,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: purchaseOrderApi.create,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }),
  });
}

export function useMarkPurchaseOrderSent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: purchaseOrderApi.markSent,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }),
  });
}

export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: purchaseOrderApi.cancel,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }),
  });
}

export function usePrintPurchaseOrderPreview() {
  return useMutation({
    mutationFn: purchaseOrderApi.printPreview,
  });
}

export function useConvertPurchaseOrder() {
  return useMutation({
    mutationFn: purchaseOrderApi.convertToPurchase,
  });
}
