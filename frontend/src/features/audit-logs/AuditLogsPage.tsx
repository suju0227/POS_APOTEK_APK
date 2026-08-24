import { Card } from '../../shared/components/Card';
import { DataTable } from '../../shared/components/DataTable';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton';
import { formatDateTimeWita } from '../../shared/utils/formatters';
import { useAuditLogs } from './auditLogs.hooks';
import type { AuditLogRow } from './auditLogs.types';

function formatActor(row: AuditLogRow) {
  if (!row.user) return 'Sistem';
  return `${row.user.name} (${row.user.role})`;
}

function summarizeValue(value: unknown) {
  if (!value || value === null) return '-';

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    const text = JSON.stringify(value);
    return text.length > 120 ? `${text.slice(0, 117)}...` : text;
  } catch {
    return 'Data tidak dapat ditampilkan';
  }
}

export function AuditLogsPage() {
  const { data = [], isLoading, error } = useAuditLogs();

  if (isLoading) return <LoadingSkeleton rows={6} />;
  if (error) return <ErrorState message={(error as Error).message} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Audit Log</h1>
        <p className="mt-1 text-sm text-slate-600">
          Riwayat aktivitas penting yang tercatat oleh backend. Halaman ini hanya untuk
          pemeriksaan internal Manager dan tidak menyediakan aksi ubah data.
        </p>
      </div>

      <Card className="bg-slate-50 shadow-none">
        <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total log tampil
            </div>
            <div className="mt-1 text-lg font-bold text-slate-950">{data.length}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Batas tampilan
            </div>
            <div className="mt-1 font-medium text-slate-950">200 aktivitas terbaru</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Akses
            </div>
            <div className="mt-1 font-medium text-slate-950">Manager saja</div>
          </div>
        </div>
      </Card>

      {!data.length ? (
        <EmptyState
          title="Belum ada audit log"
          message="Aktivitas sensitif yang dicatat backend akan tampil di sini."
        />
      ) : (
        <DataTable<AuditLogRow & Record<string, unknown>>
          data={data as (AuditLogRow & Record<string, unknown>)[]}
          columns={[
            {
              key: 'createdAt',
              header: 'Waktu',
              render: (row) => formatDateTimeWita(row.createdAt),
            },
            { key: 'action', header: 'Aksi' },
            {
              key: 'actor',
              header: 'Aktor',
              render: (row) => formatActor(row),
            },
            {
              key: 'entity',
              header: 'Entitas',
              render: (row) => (
                <div>
                  <div className="font-medium text-slate-800">{row.entityType}</div>
                  <div className="text-xs text-slate-500">{row.entityId ?? '-'}</div>
                </div>
              ),
            },
            {
              key: 'newValue',
              header: 'Data Baru',
              render: (row) => (
                <span className="block max-w-md break-words text-xs">
                  {summarizeValue(row.newValue)}
                </span>
              ),
            },
            {
              key: 'ipAddress',
              header: 'IP',
              render: (row) => row.ipAddress ?? '-',
            },
          ]}
        />
      )}
    </div>
  );
}
