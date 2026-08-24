import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { prescriptionApi } from './prescription.api';
import type { CreatePrescriptionPayload, CreateSaleFromPrescriptionPayload } from './prescription.types';

export function usePrescriptions() {
  return useQuery({
    queryKey: ['prescriptions'],
    queryFn: prescriptionApi.list,
  });
}

export function useReadyPrescriptions() {
  return useQuery({
    queryKey: ['prescriptions', 'ready-for-payment'],
    queryFn: prescriptionApi.readyForPayment,
  });
}

export function useCreatePrescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: prescriptionApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prescriptions'] }),
  });
}

export function useUpdatePrescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreatePrescriptionPayload }) =>
      prescriptionApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prescriptions'] }),
  });
}

export function useMarkPrescriptionReady() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: prescriptionApi.markReady,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['prescriptions', 'ready-for-payment'] });
    },
  });
}

export function useCancelPrescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: prescriptionApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['prescriptions', 'ready-for-payment'] });
    },
  });
}

export function useCheckoutPrescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      prescriptionId,
      payload,
      idempotencyKey,
    }: {
      prescriptionId: string;
      payload: CreateSaleFromPrescriptionPayload;
      idempotencyKey: string;
    }) => prescriptionApi.checkout(prescriptionId, payload, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['prescriptions', 'ready-for-payment'] });
      queryClient.invalidateQueries({ queryKey: ['cashier', 'products'] });
    },
  });
}
