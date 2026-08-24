import { useQuery } from '@tanstack/react-query';
import { auditLogsApi } from './auditLogs.api';

export function useAuditLogs() {
  return useQuery({
    queryKey: ['audit-logs'],
    queryFn: auditLogsApi.list,
  });
}
