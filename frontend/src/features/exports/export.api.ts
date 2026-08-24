import { useAuthStore } from '../auth/auth.store';
import { API_BASE_URL } from '../../shared/config';

export type ExportKind = 'sales' | 'profit';
export type ExportFormat = 'xlsx' | 'pdf';

export type ExportFilters = {
  startDate?: string;
  endDate?: string;
};

export async function downloadReport(
  kind: ExportKind,
  format: ExportFormat,
  filters: ExportFilters,
) {
  const params = new URLSearchParams();
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  const token = useAuthStore.getState().accessToken;
  const response = await fetch(
    `${API_BASE_URL}/exports/reports/${kind}.${format}${params.toString() ? `?${params}` : ''}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );

  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try {
      const data = JSON.parse(text) as { message?: string | string[] };
      message = Array.isArray(data.message)
        ? data.message.join(', ')
        : data.message || text;
    } catch {
      message = text;
    }
    throw new Error(message || 'Export gagal diunduh.');
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const filename =
    disposition.match(/filename="([^"]+)"/)?.[1] ??
    `${kind}-report.${format}`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
