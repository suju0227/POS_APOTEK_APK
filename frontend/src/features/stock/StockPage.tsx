import { Card } from '../../shared/components/Card';
import { DataTable } from '../../shared/components/DataTable';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton';
import { formatQty } from '../../shared/utils/formatters';
import type { StockSummary } from './stock.types';
import { useStock } from './stock.hooks';

export function StockPage() {
  const { data = [], isLoading, error } = useStock();

  if (isLoading) return <LoadingSkeleton rows={5} />;
  if (error) return <ErrorState message={(error as Error).message} />;

  const lowStockCount = data.filter((item) => item.isLowStock).length;
  const expiredBatchCount = data.reduce((sum, item) => sum + item.expiredBatchCount, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Stok</h1>
        <p className="mt-1 text-sm text-slate-600">
          Ringkasan stok tersedia dihitung dari batch aktif dan belum kedaluwarsa.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Produk" value={data.length} />
        <MetricCard label="Stok Rendah" value={lowStockCount} />
        <MetricCard label="Batch Kedaluwarsa" value={expiredBatchCount} />
      </div>

      {!data.length ? (
        <EmptyState title="Belum ada data stok" />
      ) : (
        <DataTable<StockSummary & Record<string, unknown>>
          data={data as (StockSummary & Record<string, unknown>)[]}
          columns={[
            { key: 'code', header: 'Kode' },
            { key: 'name', header: 'Produk' },
            {
              key: 'category',
              header: 'Kategori',
              render: (row) => row.category.name,
            },
            {
              key: 'totalStockBase',
              header: 'Stok Base',
              render: (row) => formatQty(row.totalStockBase, row.baseUnit.symbol ?? row.baseUnit.name),
            },
            {
              key: 'minStockBase',
              header: 'Min',
              render: (row) => formatQty(row.minStockBase, row.baseUnit.symbol ?? row.baseUnit.name),
            },
            {
              key: 'activeBatchCount',
              header: 'Batch Aktif',
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => (
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    row.isLowStock
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {row.isLowStock ? 'Stok Rendah' : 'Aman'}
                </span>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-950">{value}</div>
    </Card>
  );
}
