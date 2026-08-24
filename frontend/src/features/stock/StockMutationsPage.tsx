import { DataTable } from '../../shared/components/DataTable';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton';
import { formatDateTimeWita, formatQty } from '../../shared/utils/formatters';
import type { StockMutation } from './stock.types';
import { useStockMutations } from './stock.hooks';

export function StockMutationsPage() {
  const { data = [], isLoading, error } = useStockMutations();

  if (isLoading) return <LoadingSkeleton rows={5} />;
  if (error) return <ErrorState message={(error as Error).message} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Mutasi Stok</h1>
        <p className="mt-1 text-sm text-slate-600">
          Jejak perubahan stok dari pembelian, penjualan, retur, dan koreksi.
        </p>
      </div>

      {!data.length ? (
        <EmptyState title="Belum ada mutasi stok" />
      ) : (
        <DataTable<StockMutation & Record<string, unknown>>
          data={data as (StockMutation & Record<string, unknown>)[]}
          columns={[
            {
              key: 'createdAt',
              header: 'Waktu',
              render: (row) => formatDateTimeWita(row.createdAt),
            },
            {
              key: 'product',
              header: 'Produk',
              render: (row) => row.product.name,
            },
            {
              key: 'batch',
              header: 'Batch',
              render: (row) => row.batch.batchNumber,
            },
            { key: 'mutationType', header: 'Tipe' },
            {
              key: 'qtyChange',
              header: 'Perubahan',
              render: (row) => formatQty(row.qtyChange, 'base'),
            },
            {
              key: 'qtyAfter',
              header: 'Sisa',
              render: (row) => formatQty(row.qtyAfter, 'base'),
            },
            {
              key: 'createdBy',
              header: 'User',
              render: (row) => row.createdBy.name,
            },
            { key: 'reason', header: 'Alasan' },
          ]}
        />
      )}
    </div>
  );
}
