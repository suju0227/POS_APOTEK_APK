import { apiClient } from '../../shared/api/apiClient';
import type { CreateUserPayload, UpdateUserPayload, UserRow } from './users.types';

export const usersApi = {
  list: () => apiClient.get<UserRow[]>('/users'),
  create: (payload: CreateUserPayload) => apiClient.post<UserRow>('/users', payload),
  update: (id: string, payload: UpdateUserPayload) =>
    apiClient.patch<UserRow>(`/users/${id}`, payload),
  deactivate: (id: string) => apiClient.patch<UserRow>(`/users/${id}/deactivate`),
};
