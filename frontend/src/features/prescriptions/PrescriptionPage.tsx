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
import { formatDateTimeWita, formatQty } from '../../shared/utils/formatters';
import { useProducts } from '../master-data/masterData.hooks';
import type { Product } from '../master-data/masterData.types';
import {
  useCancelPrescription,
  useCreatePrescription,
  useMarkPrescriptionReady,
  usePrescriptions,
} from './prescription.hooks';
import type { CreatePrescriptionPayload, Prescription, PrescriptionItemPayload } from './prescription.types';

type DraftItem = PrescriptionItemPayload & { key: string };

const today = new Date().toISOString().slice(0, 10);

export function PrescriptionPage() {
  const { data = [], isLoading, error } = usePrescriptions();
  const products = useProducts('');
  const createPrescription = useCreatePrescription();
  const markReady = useMarkPrescriptionReady();
  const cancelPrescription = useCancelPrescription();
  const showToast = useToastStore((state) => state.show);
  const [form, setForm] = useState<CreatePrescriptionPayload>({
    patientName: '',
    patientPhone: '',
    doctorName: '',
    prescriptionDate: today,
    note: '',
    items: [],
  });
  const [items, setItems] = useState<DraftItem[]>([newDraftItem()]);

  const activeProducts = useMemo(
    () => (products.data ?? []).filter((product) => product.isActive),
    [products.data],
  );

  const handleSubmit = async () => {
    const payloadItems = items
      .map(({ key: _key, ...item }) => ({
        ...item,
        instruction: item.instruction?.trim() || undefined,
        note: item.note?.trim() || undefined,
      }))
      .filter((item) => item.productId && item.productUnitId && item.qtySaleUnit > 0);

    if (!form.patientName.trim()) {
      showToast('Nama pasien wajib diisi.');
      return;
    }
    if (!payloadItems.length) {
      showToast('Tambahkan minimal satu item resep.');
      return;
    }

    try {
      await createPrescription.mutateAsync({
        patientName: form.patientName.trim(),
        patientPhone: form.patientPhone?.trim() || undefined,
        doctorName: form.doctorName?.trim() || undefined,
        prescriptionDate: form.prescriptionDate,
        note: form.note?.trim() || undefined,
        items: payloadItems,
      });
      setForm({
        patientName: '',
        patientPhone: '',
        doctorName: '',
        prescriptionDate: today,
        note: '',
        items: [],
      });
      setItems([newDraftItem()]);
      showToast('Resep berhasil dibuat. Stok belum berubah sampai checkout kasir.');
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const handleReady = async (id: string) => {
    try {
      await markReady.mutateAsync(id);
      showToast('Resep ditandai siap bayar.');
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelPrescription.mutateAsync(id);
      showToast('Resep dibatalkan.');
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  if (isLoading) return <LoadingSkeleton rows={6} />;
  if (error) return <ErrorState message={(error as Error).message} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Pelayanan Resep</h1>
        <p className="mt-1 text-sm text-slate-600">
          Resep disiapkan oleh apoteker/manager dan tidak mengurangi stok sebelum checkout kasir berhasil.
        </p>
      </div>

      <Card>
        <h2 className="text-base font-semibold text-slate-950">Buat Resep</h2>
        {products.isError ? (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Produk gagal dimuat: {products.error.message}
          </div>
        ) : products.isLoading ? (
          <div className="mt-3 text-sm text-slate-500">Memuat produk aktif...</div>
        ) : null}
        <div className="mt-4 grid gap-4 lg:grid-cols-4">
          <Input label="Nama pasien" value={form.patientName} onChange={(event) => setForm({ ...form, patientName: event.target.value })} />
          <Input label="No. telepon" value={form.patientPhone ?? ''} onChange={(event) => setForm({ ...form, patientPhone: event.target.value })} />
          <Input label="Dokter" value={form.doctorName ?? ''} onChange={(event) => setForm({ ...form, doctorName: event.target.value })} />
          <Input label="Tanggal resep" type="date" value={form.prescriptionDate} onChange={(event) => setForm({ ...form, prescriptionDate: event.target.value })} />
        </div>
        <div className="mt-4">
          <Input label="Catatan resep" value={form.note ?? ''} onChange={(event) => setForm({ ...form, note: event.target.value })} />
        </div>

        <div className="mt-5 space-y-3">
          {items.map((item, index) => (
            <PrescriptionItemEditor
              key={item.key}
              item={item}
              products={activeProducts}
              onChange={(next) =>
                setItems((current) =>
                  current.map((row) => (row.key === item.key ? next : row)),
                )
              }
              onRemove={() =>
                setItems((current) => current.filter((row) => row.key !== item.key))
              }
              canRemove={items.length > 1}
              index={index}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setItems([...items, newDraftItem()])}>
            <Plus size={16} />
            Tambah Item
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={createPrescription.isPending}>
            {createPrescription.isPending ? 'Menyimpan...' : 'Simpan Resep'}
          </Button>
        </div>
      </Card>

      {!data.length ? (
        <EmptyState title="Belum ada resep" />
      ) : (
        <DataTable<Prescription & Record<string, unknown>>
          data={data as (Prescription & Record<string, unknown>)[]}
          columns={[
            { key: 'prescriptionNumber', header: 'No. Resep' },
            { key: 'patientName', header: 'Pasien' },
            { key: 'doctorName', header: 'Dokter', render: (row) => row.doctorName ?? '-' },
            {
              key: 'status',
              header: 'Status',
              render: (row) => (
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                  {row.status}
                </span>
              ),
            },
            {
              key: 'items',
              header: 'Item',
              render: (row) => (
                <div className="space-y-1">
                  {row.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="text-xs text-slate-600">
                      {item.productName}: {formatQty(item.qtySaleUnit, item.unitSymbol)}
                    </div>
                  ))}
                  {row.items.length > 3 ? (
                    <div className="text-xs text-slate-500">
                      +{row.items.length - 3} item lain
                    </div>
                  ) : null}
                </div>
              ),
            },
            { key: 'createdAt', header: 'Dibuat', render: (row) => formatDateTimeWita(row.createdAt) },
            {
              key: 'actions',
              header: 'Aksi',
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  {['DRAFT', 'REVIEWED', 'NEED_CONFIRMATION'].includes(row.status) ? (
                    <Button type="button" className="h-8 px-3" onClick={() => handleReady(row.id)} disabled={markReady.isPending}>
                      Siap Bayar
                    </Button>
                  ) : null}
                  {!['PAID', 'COMPLETED', 'CANCELLED'].includes(row.status) ? (
                    <Button type="button" className="h-8 px-3" variant="secondary" onClick={() => handleCancel(row.id)} disabled={cancelPrescription.isPending}>
                      Batalkan
                    </Button>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}

function PrescriptionItemEditor({
  item,
  products,
  onChange,
  onRemove,
  canRemove,
  index,
}: {
  item: DraftItem;
  products: Product[];
  onChange: (item: DraftItem) => void;
  onRemove: () => void;
  canRemove: boolean;
  index: number;
}) {
  const selectedProduct = products.find((product) => product.id === item.productId);
  const saleUnits = selectedProduct?.productUnits.filter((unit) => unit.isActive && unit.isSaleUnit) ?? [];

  return (
    <div className="grid gap-3 rounded-md border border-slate-200 p-3 lg:grid-cols-[1.3fr_1fr_120px_1fr_1fr_auto]">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Produk {index + 1}</span>
        <select
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          value={item.productId}
          onChange={(event) =>
            onChange({ ...item, productId: event.target.value, productUnitId: '' })
          }
        >
          <option value="">Pilih produk</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.code})
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Satuan jual</span>
        <select
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          value={item.productUnitId}
          onChange={(event) => onChange({ ...item, productUnitId: event.target.value })}
          disabled={!selectedProduct}
        >
          <option value="">Pilih satuan</option>
          {saleUnits.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.unit.symbol ?? unit.unit.name} - min {formatQty(unit.minSaleQty)}
            </option>
          ))}
        </select>
      </label>
      <Input label="Qty" type="number" min={0.0001} step="0.0001" value={item.qtySaleUnit} onChange={(event) => onChange({ ...item, qtySaleUnit: Number(event.target.value) })} />
      <Input label="Aturan pakai" value={item.instruction ?? ''} onChange={(event) => onChange({ ...item, instruction: event.target.value })} />
      <Input label="Catatan item" value={item.note ?? ''} onChange={(event) => onChange({ ...item, note: event.target.value })} />
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
    productId: '',
    productUnitId: '',
    qtySaleUnit: 1,
    instruction: '',
    note: '',
  };
}
