import { apiClient } from '../../shared/api/apiClient';
import type { CounselingRecord, CreateCounselingPayload } from './counseling.types';

export const counselingApi = {
  list: () => apiClient.get<CounselingRecord[]>('/counseling-records'),
  create: (payload: CreateCounselingPayload) =>
    apiClient.post<CounselingRecord>('/counseling-records', payload),
  update: (id: string, payload: CreateCounselingPayload) =>
    apiClient.patch<CounselingRecord>(`/counseling-records/${id}`, payload),
};
