import { useMemo, useState } from 'react';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { DataTable } from '../../shared/components/DataTable';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { Input } from '../../shared/components/Input';
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton';
import { useToastStore } from '../../shared/components/toast.store';
import { useConnectionStatus } from '../../shared/hooks/useConnectionStatus';
import { formatDateTimeWita, formatQty, formatRupiah } from '../../shared/utils/formatters';
import type { ReturnableItem, SalesReturn } from './salesReturn.types';
import {
  useCreateSalesReturn,
  useReturnableItems,
  useSalesReturns,
} from './salesReturn.hooks';

export function SalesReturnPage() {
  const [saleId, setSaleId] = useState('');
  const [reason, setReason] = useState('');
  const [qtyByAllocation, setQtyByAllocation] = useState<Record<string, number>>({});
  const { data: returns = [], isLoading, error } = useSalesReturns();
  const returnable = useReturnableItems(saleId.trim());
  const createReturn = useCreateSalesReturn();
  const connection = useConnectionStatus();
  const showToast = useToastStore((state) => state.show);

  const selectedItems = useMemo(
    () =>
      (returnable.data?.items ?? [])
        .map((item) => ({
          saleBatchAllocationId: item.saleBatchAllocationId,
          qtyBaseReturned: Number(qtyByAllocation[item.saleBatchAllocationId] ?? 0),
        }))
        .filter((item) => item.qtyBaseReturned > 0),
    [qtyByAllocation, returnable.data?.items],
  );

  const handleSubmit = async () => {
    if (connection.isOffline) {
      showToast('Server lokal tidak terhubung. Periksa jaringan atau pastikan PC server aktif.');
      return;
    }

    if (!saleId.trim()) {
      showToast('Masukkan ID transaksi asal.');
      return;
    }
    if (!reason.trim()) {
      showToast('Alasan retur wajib diisi.');
      return;
    }
    if (!selectedItems.length) {
      showToast('Pilih minimal satu item retur.');
      return;
    }

    try {
      await createReturn.mutateAsync({
        payload: { saleId: saleId.trim(), reason: reason.trim(), items: selectedItems },
        idempotencyKey: createIdempotencyKey(),
      });
      setReason('');
      setQtyByAllocation({});
      showToast('Retur penjualan berhasil diproses.');
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  if (isLoading) return <LoadingSkeleton rows={5} />;
  if (error) return <ErrorState message={(error as Error).message} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Retur Penjualan</h1>
        <p className="mt-1 text-sm text-slate-600">
          Retur wajib mengacu transaksi asal dan backend mengembalikan stok ke batch asal.
        </p>
      </div>

      <Card>
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
          <Input
            label="ID transaksi asal"
            value={saleId}
            onChange={(event) => setSaleId(event.target.value)}
            placeholder="Paste sale id dari riwayat transaksi"
          />
          <Input
            label="Alasan retur"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Contoh: salah item / pelanggan batal"
          />
          <div className="flex items-end">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                createReturn.isPending || returnable.isLoading || connection.isOffline
              }
            >
              {createReturn.isPending ? 'Memproses...' : 'Simpan Retur'}
            </Button>
          </div>
        </div>
      </Card>

      {returnable.error ? <ErrorState message={(returnable.error as Error).message} /> : null}
      {returnable.isLoading ? <LoadingSkeleton rows={2} /> : null}
      {returnable.data ? (
        <Card>
          <h2 className="text-base font-semibold text-slate-950">
            Item Bisa Diretur: {returnable.data.saleNumber}
          </h2>
          {!returnable.data.items.length ? (
            <p className="mt-3 text-sm text-slate-600">Tidak ada item yang masih bisa diretur.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {returnable.data.items.map((item) => (
                <ReturnableItemRow
                  key={item.saleBatchAllocationId}
                  item={item}
                  value={qtyByAllocation[item.saleBatchAllocationId] ?? 0}
                  onChange={(value) =>
                    setQtyByAllocation((current) => ({
                      ...current,
                      [item.saleBatchAllocationId]: value,
                    }))
                  }
                />
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {!returns.length ? (
        <EmptyState title="Belum ada retur penjualan" />
      ) : (
        <DataTable<SalesReturn & Record<string, unknown>>
          data={returns as (SalesReturn & Record<string, unknown>)[]}
          columns={[
            { key: 'returnNumber', header: 'No. Retur' },
            { key: 'saleNumber', header: 'Transaksi' },
            {
              key: 'createdAt',
              header: 'Waktu',
              render: (row) => formatDateTimeWita(row.createdAt),
            },
            {
              key: 'cashier',
              header: 'Petugas',
              render: (row) => row.cashier.name,
            },
            {
              key: 'totalRefund',
              header: 'Refund',
              render: (row) => formatRupiah(row.totalRefund),
            },
            { key: 'reason', header: 'Alasan' },
          ]}
        />
      )}
    </div>
  );
}

function ReturnableItemRow({
  item,
  value,
  onChange,
}: {
  item: ReturnableItem;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-slate-200 p-3 lg:grid-cols-[1fr_180px]">
      <div>
        <div className="font-medium text-slate-950">{item.productName}</div>
        <div className="text-sm text-slate-600">
          Batch {item.batchNumber} - tersedia retur{' '}
          {formatQty(item.returnableQtyBase, 'base')}
        </div>
        <div className="text-sm text-slate-600">
          Estimasi refund penuh: {formatRupiah(item.refundableAmount)}
        </div>
      </div>
      <Input
        label="Qty base retur"
        type="number"
        min={0}
        max={item.returnableQtyBase}
        step="0.0001"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function createIdempotencyKey() {
  if ('crypto' in window && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `sales-return-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
