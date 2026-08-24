import { useQuery } from '@tanstack/react-query';
import { reportsApi } from './report.api';
import type { ReportFilters } from './report.types';

export function useSalesReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['reports', 'sales', filters],
    queryFn: () => reportsApi.sales(filters),
  });
}

export function useProfitReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['reports', 'profit', filters],
    queryFn: () => reportsApi.profit(filters),
  });
}
