import { useMemo, useState } from 'react';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { DataTable } from '../../shared/components/DataTable';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton';
import { formatDateTimeWita, formatQty, formatRupiah } from '../../shared/utils/formatters';
import type { Sale } from './salesHistory.types';
import { useSalesHistory } from './salesHistory.hooks';

export function SalesHistoryPage() {
  const { data = [], isLoading, error } = useSalesHistory();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => data.find((sale) => sale.id === selectedId) ?? data[0],
    [data, selectedId],
  );

  if (isLoading) return <LoadingSkeleton rows={5} />;
  if (error) return <ErrorState message={(error as Error).message} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Riwayat Transaksi</h1>
        <p className="mt-1 text-sm text-slate-600">
          Transaksi tersimpan dari backend. Kasir tidak menerima HPP atau laba.
        </p>
      </div>

      {!data.length ? (
        <EmptyState title="Belum ada transaksi" />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <DataTable<Sale & Record<string, unknown>>
            data={data as (Sale & Record<string, unknown>)[]}
            columns={[
              { key: 'saleNumber', header: 'No. Transaksi' },
              {
                key: 'createdAt',
                header: 'Waktu',
                render: (row) => formatDateTimeWita(row.createdAt),
              },
              {
                key: 'cashier',
                header: 'Kasir',
                render: (row) => row.cashier.name,
              },
              { key: 'paymentMethod', header: 'Bayar' },
              {
                key: 'grandTotal',
                header: 'Total',
                render: (row) => formatRupiah(row.grandTotal),
              },
              {
                key: 'actions',
                header: 'Aksi',
                render: (row) => (
                  <Button type="button" variant="secondary" onClick={() => setSelectedId(row.id)}>
                    Detail
                  </Button>
                ),
              },
            ]}
          />

          <Card>
            <h2 className="text-base font-semibold text-slate-950">Detail Transaksi</h2>
            {selected ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                  <div className="font-semibold text-slate-950">{selected.saleNumber}</div>
                  <div>{formatDateTimeWita(selected.createdAt)}</div>
                  <div>Kasir: {selected.cashier.name}</div>
                  <div>Total: {formatRupiah(selected.grandTotal)}</div>
                  {selected.totalProfit !== undefined ? (
                    <div>Laba: {formatRupiah(selected.totalProfit)}</div>
                  ) : null}
                </div>
                <div className="space-y-3">
                  {selected.items.map((item) => (
                    <div key={item.id} className="rounded-md border border-slate-200 p-3">
                      <div className="font-medium text-slate-950">{item.productName}</div>
                      <div className="text-sm text-slate-600">
                        {formatQty(item.qtySale, item.unitName)} x {formatRupiah(item.sellingPrice)}
                      </div>
                      <div className="text-sm text-slate-700">
                        Total item: {formatRupiah(item.totalAfterDiscount)}
                      </div>
                      {item.allocations?.length ? (
                        <div className="mt-2 text-xs text-slate-500">
                          Batch:{' '}
                          {item.allocations
                            .map((allocation) => allocation.batchNumber)
                            .join(', ')}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">Pilih transaksi untuk melihat detail.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
