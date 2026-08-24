import { Plus, Trash2 } from 'lucide-react';
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
import { useBatches } from '../batches/batch.hooks';
import type { ProductBatch } from '../batches/batch.types';
import { useCreatePurchaseReturn, usePurchaseReturns } from './purchaseReturn.hooks';
import type { PurchaseReturn } from './purchaseReturn.types';

type DraftItem = { key: string; batchId: string; qtyBaseReturned: number };

export function PurchaseReturnPage() {
  const { data = [], isLoading, error } = usePurchaseReturns();
  const batches = useBatches();
  const createReturn = useCreatePurchaseReturn();
  const connection = useConnectionStatus();
  const showToast = useToastStore((state) => state.show);
  const [purchaseId, setPurchaseId] = useState('');
  const [reason, setReason] = useState('');
  const [items, setItems] = useState<DraftItem[]>([newDraftItem()]);

  const returnableBatches = useMemo(
    () =>
      (batches.data ?? []).filter(
        (batch) => batch.isActive && batch.currentStockBase > 0,
      ),
    [batches.data],
  );

  const handleSubmit = async () => {
    if (connection.isOffline) {
      showToast('Server lokal tidak terhubung. Periksa jaringan atau pastikan PC server aktif.');
      return;
    }

    const payloadItems = items
      .filter((item) => item.batchId && item.qtyBaseReturned > 0)
      .map(({ batchId, qtyBaseReturned }) => ({ batchId, qtyBaseReturned }));
    const invalidOverStock = payloadItems.some((item) => {
      const batch = returnableBatches.find((row) => row.id === item.batchId);
      return batch ? item.qtyBaseReturned > batch.currentStockBase : true;
    });

    if (!reason.trim()) {
      showToast('Alasan retur wajib diisi.');
      return;
    }
    if (!payloadItems.length) {
      showToast('Tambahkan minimal satu batch retur.');
      return;
    }
    if (invalidOverStock) {
      showToast('Qty retur tidak boleh melebihi stok batch tersedia.');
      return;
    }

    try {
      await createReturn.mutateAsync({
        idempotencyKey: makeIdempotencyKey('purchase-return'),
        payload: {
          purchaseId: purchaseId.trim() || undefined,
          reason: reason.trim(),
          items: payloadItems,
        },
      });
      setPurchaseId('');
      setReason('');
      setItems([newDraftItem()]);
      showToast('Retur pembelian berhasil disimpan dan stok batch dikurangi backend.');
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  if (isLoading) return <LoadingSkeleton rows={5} />;
  if (error) return <ErrorState message={(error as Error).message} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Retur Pembelian</h1>
        <p className="mt-1 text-sm text-slate-600">
          Retur ke supplier mengurangi stok batch melalui backend dan mencatat mutasi stok.
        </p>
      </div>

      <Card>
        <h2 className="text-base font-semibold text-slate-950">Buat Retur Pembelian</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Input label="ID pembelian asal opsional" value={purchaseId} onChange={(event) => setPurchaseId(event.target.value)} />
          <Input label="Alasan retur" value={reason} onChange={(event) => setReason(event.target.value)} />
        </div>
        <div className="mt-4 space-y-3">
          {items.map((item, index) => (
            <PurchaseReturnItemEditor
              key={item.key}
              item={item}
              index={index}
              batches={returnableBatches}
              canRemove={items.length > 1}
              onChange={(next) =>
                setItems((current) =>
                  current.map((row) => (row.key === item.key ? next : row)),
                )
              }
              onRemove={() =>
                setItems((current) => current.filter((row) => row.key !== item.key))
              }
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setItems([...items, newDraftItem()])}>
            <Plus size={16} />
            Tambah Batch
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={createReturn.isPending || connection.isOffline}>
            {createReturn.isPending ? 'Menyimpan...' : 'Simpan Retur Pembelian'}
          </Button>
        </div>
      </Card>

      {!data.length ? (
        <EmptyState title="Belum ada retur pembelian" />
      ) : (
        <DataTable<PurchaseReturn & Record<string, unknown>>
          data={data as (PurchaseReturn & Record<string, unknown>)[]}
          columns={[
            { key: 'returnNumber', header: 'No. Retur' },
            { key: 'purchaseNumber', header: 'Pembelian', render: (row) => row.purchaseNumber ?? '-' },
            { key: 'createdAt', header: 'Waktu', render: (row) => formatDateTimeWita(row.createdAt) },
            { key: 'totalAmount', header: 'Nilai HPP', render: (row) => formatRupiah(row.totalAmount) },
            {
              key: 'items',
              header: 'Item',
              render: (row) => (
                <div className="space-y-1">
                  {row.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="text-xs text-slate-600">
                      {item.productName} / {item.batchNumber}:{' '}
                      {formatQty(item.qtyBaseReturned, 'base')}
                    </div>
                  ))}
                  {row.items.length > 3 ? (
                    <div className="text-xs text-slate-500">
                      +{row.items.length - 3} batch lain
                    </div>
                  ) : null}
                </div>
              ),
            },
            { key: 'reason', header: 'Alasan' },
          ]}
        />
      )}
    </div>
  );
}

function PurchaseReturnItemEditor({
  item,
  index,
  batches,
  canRemove,
  onChange,
  onRemove,
}: {
  item: DraftItem;
  index: number;
  batches: ProductBatch[];
  canRemove: boolean;
  onChange: (item: DraftItem) => void;
  onRemove: () => void;
}) {
  const selectedBatch = batches.find((batch) => batch.id === item.batchId);

  return (
    <div className="grid gap-3 rounded-md border border-slate-200 p-3 lg:grid-cols-[1fr_160px_1fr_auto]">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Batch {index + 1}</span>
        <select
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          value={item.batchId}
          onChange={(event) => onChange({ ...item, batchId: event.target.value })}
        >
          <option value="">Pilih batch</option>
          {batches.map((batch) => (
            <option key={batch.id} value={batch.id}>
              {batch.product.name} - {batch.batchNumber} - stok {formatQty(batch.currentStockBase, batch.product.baseUnit.symbol)}
            </option>
          ))}
        </select>
      </label>
      <Input
        label="Qty base retur"
        type="number"
        min={0.0001}
        max={selectedBatch?.currentStockBase}
        step="0.0001"
        value={item.qtyBaseReturned}
        onChange={(event) =>
          onChange({ ...item, qtyBaseReturned: Number(event.target.value) })
        }
      />
      <div className="text-sm text-slate-600 lg:pt-7">
        {selectedBatch ? (
          <>
            Maks: {formatQty(selectedBatch.currentStockBase, selectedBatch.product.baseUnit.symbol)}
            <br />
            HPP: {formatRupiah(selectedBatch.hppBase)}
          </>
        ) : (
          'Pilih batch aktif dengan stok.'
        )}
      </div>
      <div className="flex items-end">
        <Button type="button" variant="ghost" disabled={!canRemove} onClick={onRemove}>
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  );
}

function newDraftItem(): DraftItem {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    batchId: '',
    qtyBaseReturned: 1,
  };
}

function makeIdempotencyKey(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
