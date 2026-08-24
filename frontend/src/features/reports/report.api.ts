import { useAuthStore } from '../auth/auth.store';
import { apiClient } from '../../shared/api/apiClient';
import { API_BASE_URL } from '../../shared/config';
import type {
  ProfitReportResponse,
  ReportFilters,
  SalesReportResponse,
} from './report.types';

export function buildQuery(filters: ReportFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const reportsApi = {
  sales: (filters: ReportFilters) =>
    apiClient.get<SalesReportResponse>(`/reports/sales${buildQuery(filters)}`),
  profit: (filters: ReportFilters) =>
    apiClient.get<ProfitReportResponse>(`/reports/profit${buildQuery(filters)}`),
};

export async function downloadReport(
  path: string,
  filters: ReportFilters,
  fallbackFilename: string,
) {
  const token = useAuthStore.getState().accessToken;
  const response = await fetch(`${API_BASE_URL}${path}${buildQuery(filters)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (response.status === 401) {
    useAuthStore.getState().logout();
    window.location.assign('/login');
    throw new Error('Sesi berakhir. Silakan login ulang.');
  }

  if (!response.ok) {
    throw new Error('Ekspor laporan gagal. Silakan ulangi.');
  }

  const blob = await response.blob();
  const filename = filenameFromDisposition(
    response.headers.get('content-disposition'),
    fallbackFilename,
  );
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function filenameFromDisposition(value: string | null, fallback: string) {
  const match = value?.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? fallback;
}
