import { apiClient } from '../../shared/api/apiClient';
import type {
  CreatePrescriptionPayload,
  CreateSaleFromPrescriptionPayload,
  Prescription,
} from './prescription.types';

export const prescriptionApi = {
  list: () => apiClient.get<Prescription[]>('/prescriptions'),
  readyForPayment: () =>
    apiClient.get<Prescription[]>('/prescriptions/ready-for-payment'),
  create: (payload: CreatePrescriptionPayload) =>
    apiClient.post<Prescription>('/prescriptions', payload),
  update: (id: string, payload: CreatePrescriptionPayload) =>
    apiClient.patch<Prescription>(`/prescriptions/${id}`, payload),
  markReady: (id: string) =>
    apiClient.post<Prescription>(`/prescriptions/${id}/mark-ready-for-payment`),
  cancel: (id: string) =>
    apiClient.post<Prescription>(`/prescriptions/${id}/cancel`),
  checkout: (
    prescriptionId: string,
    payload: CreateSaleFromPrescriptionPayload,
    idempotencyKey: string,
  ) =>
    apiClient.post(`/sales/from-prescription/${prescriptionId}`, payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
};
