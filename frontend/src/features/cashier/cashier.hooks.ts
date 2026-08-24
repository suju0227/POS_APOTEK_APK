import { useMutation, useQuery } from '@tanstack/react-query';
import { cashierApi } from './cashier.api';
import type { CreateSaleFromPrescriptionPayload, CreateSalePayload } from './cashier.types';

export function useCashierProducts(q: string) {
  return useQuery({
    queryKey: ['cashier', 'products', q],
    queryFn: () => cashierApi.products(q),
  });
}

export function useCreateCashierSale() {
  return useMutation({
    mutationFn: ({
      payload,
      idempotencyKey,
    }: {
      payload: CreateSalePayload;
      idempotencyKey: string;
    }) => cashierApi.createSale(payload, idempotencyKey),
  });
}

export function useReadyPrescriptions() {
  return useQuery({
    queryKey: ['cashier', 'ready-prescriptions'],
    queryFn: cashierApi.readyPrescriptions,
  });
}

export function useCreateSaleFromPrescription() {
  return useMutation({
    mutationFn: ({
      prescriptionId,
      payload,
      idempotencyKey,
    }: {
      prescriptionId: string;
      payload: CreateSaleFromPrescriptionPayload;
      idempotencyKey: string;
    }) =>
      cashierApi.createSaleFromPrescription(
        prescriptionId,
        payload,
        idempotencyKey,
      ),
  });
}
