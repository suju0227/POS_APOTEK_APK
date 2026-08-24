import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { DataTable } from '../../shared/components/DataTable';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { Input } from '../../shared/components/Input';
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton';
import { useToastStore } from '../../shared/components/toast.store';
import {
  formatDate,
  formatDateTimeWita,
  formatQty,
  formatRupiah,
} from '../../shared/utils/formatters';
import {
  useProducts,
  useProductUnits,
  useSuppliers,
} from '../master-data/masterData.hooks';
import type { ProductBatch } from './batch.types';
import {
  useBatches,
  useCreateBatch,
  useDeactivateBatch,
  useStockMutations,
} from './batch.hooks';

const batchSchema = z.object({
  productId: z.string().min(1, 'Produk wajib dipilih'),
  supplierId: z.string().optional(),
  batchNumber: z.string().trim().min(1, 'Nomor batch wajib diisi'),
  expiredDate: z.string().min(1, 'Tanggal kedaluwarsa wajib diisi'),
  initialStockBase: z.coerce.number().min(0, 'Stok awal tidak boleh negatif'),
  currentStockBase: z.coerce.number().min(0, 'Stok kini tidak boleh negatif'),
  hppBase: z.coerce.number().min(0, 'HPP tidak boleh negatif'),
});

const priceSchema = z
  .array(
    z.object({
      productUnitId: z.string().min(1),
      sellingPrice: z.coerce
        .number()
        .int('Harga jual harus rupiah bulat')
        .min(0, 'Harga jual tidak boleh negatif'),
    }),
  )
  .min(1, 'Minimal satu harga jual batch wajib diisi');

type BatchForm = z.infer<typeof batchSchema>;
type BatchFormInput = z.input<typeof batchSchema>;

function StatusBadge({ status }: { status: ProductBatch['status'] }) {
  const labels = {
    ACTIVE: 'Aktif',
    INACTIVE: 'Nonaktif',
    OUT_OF_STOCK: 'Stok habis',
    EXPIRED: 'Expired',
  };
  const classes = {
    ACTIVE: 'bg-emerald-50 text-emerald-700',
    INACTIVE: 'bg-slate-100 text-slate-500',
    OUT_OF_STOCK: 'bg-amber-50 text-amber-700',
    EXPIRED: 'bg-red-50 text-red-700',
  };

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${classes[status]}`}>
      {labels[status]}
    </span>
  );
}

function FormError({ error }: { error?: unknown }) {
  if (!error) return null;
  return (
    <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
      {error instanceof Error ? error.message : 'Request gagal'}
    </p>
  );
}

export function BatchPage() {
  const toast = useToastStore((state) => state.show);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('');
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [priceError, setPriceError] = useState<string | null>(null);

  const products = useProducts('');
  const suppliers = useSuppliers();
  const productUnits = useProductUnits(selectedProductId || null);
  const batches = useBatches();
  const mutations = useStockMutations();
  const createBatch = useCreateBatch();
  const deactivateBatch = useDeactivateBatch();

  const form = useForm<BatchFormInput, unknown, BatchForm>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      productId: '',
      supplierId: '',
      batchNumber: '',
      expiredDate: '',
      initialStockBase: 0,
      currentStockBase: 0,
      hppBase: 0,
    },
  });

  const saleUnits = useMemo(
    () =>
      (productUnits.data ?? []).filter(
        (productUnit) => productUnit.isActive && productUnit.isSaleUnit,
      ),
    [productUnits.data],
  );

  useEffect(() => {
    setPriceInputs({});
    setPriceError(null);
  }, [selectedProductId]);

  const selectedProduct = products.data?.find(
    (product) => product.id === selectedProductId,
  );
  const filteredBatches = useMemo(() => {
    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    const query = search.trim().toLowerCase();

    return (batches.data ?? []).filter((batch) => {
      const matchesSearch =
        !query ||
        batch.batchNumber.toLowerCase().includes(query) ||
        batch.product.name.toLowerCase().includes(query) ||
        (batch.supplier?.name.toLowerCase().includes(query) ?? false);
      const matchesStatus = !statusFilter || batch.status === statusFilter;
      const expiredDate = new Date(batch.expiredDate);
      const matchesExpiry =
        !expiryFilter ||
        (expiryFilter === 'expired' && expiredDate < now) ||
        (expiryFilter === 'soon' && expiredDate >= now && expiredDate <= soon) ||
        (expiryFilter === 'valid' && expiredDate > soon);

      return matchesSearch && matchesStatus && matchesExpiry;
    });
  }, [batches.data, expiryFilter, search, statusFilter]);
  const selectedBatch =
    batches.data?.find((batch) => batch.id === selectedBatchId) ?? null;
  const selectedBatchMutations = (mutations.data ?? []).filter(
    (mutation) => mutation.batchId === selectedBatchId,
  );

  function resolveExpiryLabel(expiredDateValue: string) {
    const now = new Date();
    const expiredDate = new Date(expiredDateValue);
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);

    if (expiredDate < now) return 'Expired';
    if (expiredDate <= soon) return 'Mendekati expired';
    return 'Aman';
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const prices = saleUnits
      .map((productUnit) => ({
        productUnitId: productUnit.id,
        sellingPrice: priceInputs[productUnit.id],
      }))
      .filter((price) => price.sellingPrice !== undefined && price.sellingPrice !== '')
      .map((price) => ({
        productUnitId: price.productUnitId,
        sellingPrice: Number(price.sellingPrice),
      }));
    const parsedPrices = priceSchema.safeParse(prices);
    if (!parsedPrices.success) {
      setPriceError(parsedPrices.error.issues[0]?.message ?? 'Harga batch tidak valid');
      return;
    }

    await createBatch.mutateAsync({
      ...values,
      supplierId: values.supplierId || undefined,
      prices: parsedPrices.data,
    });
    form.reset({
      productId: '',
      supplierId: '',
      batchNumber: '',
      expiredDate: '',
      initialStockBase: 0,
      currentStockBase: 0,
      hppBase: 0,
    });
    setSelectedProductId('');
    setPriceInputs({});
    setPriceError(null);
    toast('Batch berhasil ditambahkan');
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Batch</h1>
        <p className="mt-1 text-sm text-slate-600">
          Kelola batch, stok dasar, HPP presisi, expiry, dan harga jual per satuan.
        </p>
      </div>

      <Card>
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="grid gap-4 lg:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Produk
              </span>
              <select
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                {...form.register('productId', {
                  onChange: (event) => setSelectedProductId(event.target.value),
                })}
              >
                <option value="">Pilih produk</option>
                {(products.data ?? []).map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.productId?.message ? (
                <span className="mt-1 block text-xs text-red-600">
                  {form.formState.errors.productId.message}
                </span>
              ) : null}
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Supplier
              </span>
              <select
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                {...form.register('supplierId')}
              >
                <option value="">Tanpa supplier</option>
                {(suppliers.data ?? []).map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Nomor batch"
              {...form.register('batchNumber')}
              error={form.formState.errors.batchNumber?.message}
            />
            <Input
              label="Tanggal kedaluwarsa"
              type="date"
              {...form.register('expiredDate')}
              error={form.formState.errors.expiredDate?.message}
            />
            <Input
              label="Stok awal satuan dasar"
              type="number"
              step="0.0001"
              {...form.register('initialStockBase')}
              error={form.formState.errors.initialStockBase?.message}
            />
            <Input
              label="Stok kini satuan dasar"
              type="number"
              step="0.0001"
              {...form.register('currentStockBase')}
              error={form.formState.errors.currentStockBase?.message}
            />
            <Input
              label="HPP per satuan dasar"
              type="number"
              step="0.00000001"
              {...form.register('hppBase')}
              error={form.formState.errors.hppBase?.message}
            />
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <div className="mb-3">
              <h2 className="text-base font-semibold text-slate-950">
                Harga jual batch
              </h2>
              <p className="text-sm text-slate-600">
                Harga jual pelanggan tetap rupiah bulat dan diisi manual per satuan jual aktif.
              </p>
            </div>
            {!selectedProductId ? (
              <p className="text-sm text-slate-500">
                Pilih produk untuk melihat satuan jual aktif.
              </p>
            ) : null}
            {productUnits.isLoading ? <LoadingSkeleton rows={2} /> : null}
            {selectedProductId && saleUnits.length === 0 && !productUnits.isLoading ? (
              <ErrorState
                title="Satuan jual belum tersedia"
                message="Atur satuan jual aktif produk sebelum membuat batch."
              />
            ) : null}
            {saleUnits.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {saleUnits.map((productUnit) => (
                  <Input
                    key={productUnit.id}
                    label={`${productUnit.unit.name} (${productUnit.conversionToBase} ${selectedProduct?.baseUnit.name ?? 'dasar'})`}
                    type="number"
                    step="1"
                    value={priceInputs[productUnit.id] ?? ''}
                    onChange={(event) => {
                      setPriceInputs((current) => ({
                        ...current,
                        [productUnit.id]: event.target.value,
                      }));
                      setPriceError(null);
                    }}
                    placeholder="Harga jual"
                  />
                ))}
              </div>
            ) : null}
            {priceError ? (
              <p className="mt-2 text-sm font-medium text-red-600">{priceError}</p>
            ) : null}
          </div>

          <div className="flex justify-end">
            <Button disabled={createBatch.isPending || saleUnits.length === 0}>
              Simpan batch
            </Button>
          </div>
          <FormError error={createBatch.error} />
        </form>
      </Card>

      <Card className="p-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <Input
            label="Cari batch"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Produk, batch, atau supplier"
          />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Status
            </span>
            <select
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">Semua status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="OUT_OF_STOCK">Stok habis</option>
              <option value="EXPIRED">Expired</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Expired
            </span>
            <select
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              value={expiryFilter}
              onChange={(event) => setExpiryFilter(event.target.value)}
            >
              <option value="">Semua expiry</option>
              <option value="soon">Mendekati expired</option>
              <option value="expired">Expired</option>
              <option value="valid">Masih aman</option>
            </select>
          </label>
        </div>
      </Card>

      {batches.isLoading ? <LoadingSkeleton rows={5} /> : null}
      {batches.isError ? <ErrorState message={batches.error.message} /> : null}
      {batches.data?.length === 0 ? (
        <EmptyState title="Batch kosong" message="Tambahkan batch produk pertama." />
      ) : null}
      {batches.data?.length && filteredBatches.length === 0 ? (
        <EmptyState
          title="Batch tidak ditemukan"
          message="Ubah kata kunci atau filter untuk melihat batch lain."
        />
      ) : null}
      {filteredBatches.length ? (
        <DataTable<ProductBatch>
          data={filteredBatches}
          columns={[
            {
              key: 'product',
              header: 'Produk',
              render: (row) => row.product.name,
            },
            { key: 'batchNumber', header: 'Batch' },
            {
              key: 'expiredDate',
              header: 'Expired',
              render: (row) =>
                `${formatDate(row.expiredDate)} (${resolveExpiryLabel(row.expiredDate)})`,
            },
            {
              key: 'stock',
              header: 'Stok',
              render: (row) =>
                formatQty(row.currentStockBase, row.product.baseUnit.name),
            },
            {
              key: 'hppBase',
              header: 'HPP dasar',
              render: (row) => formatRupiah(row.hppBase),
            },
            {
              key: 'prices',
              header: 'Harga jual',
              render: (row) =>
                row.prices
                  .map(
                    (price) =>
                      `${price.productUnit.unit.name}: ${formatRupiah(price.sellingPrice)}`,
                  )
                  .join(', '),
            },
            {
              key: 'supplier',
              header: 'Supplier',
              render: (row) => row.supplier?.name ?? '-',
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => <StatusBadge status={row.status} />,
            },
            {
              key: 'actions',
              header: 'Aksi',
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={selectedBatchId === row.id ? 'primary' : 'secondary'}
                    onClick={() => setSelectedBatchId(row.id)}
                  >
                    Detail
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={deactivateBatch.isPending || !row.isActive}
                    onClick={async () => {
                      await deactivateBatch.mutateAsync(row.id);
                      if (selectedBatchId === row.id) setSelectedBatchId(null);
                      toast('Batch dinonaktifkan');
                    }}
                  >
                    Nonaktifkan
                  </Button>
                </div>
              ),
            },
          ]}
        />
      ) : null}
      {selectedBatch ? (
        <Card className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Detail batch {selectedBatch.batchNumber}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {selectedBatch.product.name} - {selectedBatch.supplier?.name ?? 'Tanpa supplier'}
              </p>
            </div>
            <Button type="button" variant="ghost" onClick={() => setSelectedBatchId(null)}>
              Tutup
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-xs font-medium uppercase text-slate-500">Status</div>
              <div className="mt-1">
                <StatusBadge status={selectedBatch.status} />
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase text-slate-500">Expired</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {formatDate(selectedBatch.expiredDate)} ({resolveExpiryLabel(selectedBatch.expiredDate)})
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase text-slate-500">Stok awal</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {formatQty(selectedBatch.initialStockBase, selectedBatch.product.baseUnit.name)}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase text-slate-500">Stok kini</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {formatQty(selectedBatch.currentStockBase, selectedBatch.product.baseUnit.name)}
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-950">
              Harga jual per satuan
            </h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {selectedBatch.prices.map((price) => (
                <div key={price.id} className="rounded-md border border-slate-200 p-3">
                  <div className="text-sm font-semibold text-slate-900">
                    {price.productUnit.unit.name}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {formatRupiah(price.sellingPrice)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-950">
              Mutasi stok batch
            </h3>
            {mutations.isLoading ? <LoadingSkeleton rows={3} /> : null}
            {mutations.isError ? <ErrorState message={mutations.error.message} /> : null}
            {selectedBatchMutations.length === 0 && !mutations.isLoading ? (
              <EmptyState
                title="Belum ada mutasi"
                message="Mutasi akan muncul setelah pembelian, penjualan, retur, atau koreksi stok."
              />
            ) : null}
            {selectedBatchMutations.length ? (
              <DataTable
                data={selectedBatchMutations}
                columns={[
                  {
                    key: 'createdAt',
                    header: 'Waktu',
                    render: (row) => formatDateTimeWita(row.createdAt),
                  },
                  { key: 'mutationType', header: 'Jenis' },
                  {
                    key: 'qtyChange',
                    header: 'Perubahan',
                    render: (row) =>
                      formatQty(row.qtyChange, selectedBatch.product.baseUnit.name),
                  },
                  {
                    key: 'qtyAfter',
                    header: 'Stok akhir',
                    render: (row) =>
                      formatQty(row.qtyAfter, selectedBatch.product.baseUnit.name),
                  },
                  { key: 'referenceType', header: 'Referensi' },
                ]}
              />
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
