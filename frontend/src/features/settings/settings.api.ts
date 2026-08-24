import { apiClient } from '../../shared/api/apiClient';
import type { AppSettings, UpdateSettingsPayload } from './settings.types';

export const settingsApi = {
  get: () => apiClient.get<AppSettings>('/settings'),
  update: (payload: UpdateSettingsPayload) =>
    apiClient.patch<AppSettings>('/settings', payload),
};
