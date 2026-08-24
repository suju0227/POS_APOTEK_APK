import { apiClient } from '../../shared/api/apiClient';
import type { AuditLogRow } from './auditLogs.types';

export const auditLogsApi = {
  list: () => apiClient.get<AuditLogRow[]>('/audit-logs'),
};
