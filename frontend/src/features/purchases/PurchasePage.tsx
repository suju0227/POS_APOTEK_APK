import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { DataTable } from '../../shared/components/DataTable';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { Input } from '../../shared/components/Input';
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton';
import { useToastStore } from '../../shared/components/toast.store';
import { useConnectionStatus } from '../../shared/hooks/useConnectionStatus';
import { formatDate, formatQty, formatRupiah } from '../../shared/utils/formatters';
import {
  useProductUnits,
  useProducts,
  useSuppliers,
} from '../master-data/masterData.hooks';
import type { Product, ProductUnit } from '../master-data/masterData.types';
import {
  useCreatePurchase,
  usePurchaseDraftFromPo,
  usePurchases,
} from './purchase.hooks';
import type {
  CreatePurchasePayload,
  Purchase,
  PurchaseDiscountType,
  PurchaseSellingPricePayload,
  PurchaseTaxMode,
} from './purchase.types';

const purchaseSchema = z.object({
  supplierId: z.string().min(1, 'Supplier wajib dipilih'),
  purchaseDate: z.string().min(1, 'Tanggal pembelian wajib diisi'),
  invoiceDate: z
    .string()
    .transform((value) => (value.length ? value : undefined))
    .optional(),
  invoiceNumber: z
    .string()
    .trim()
    .transform((value) => (value.length ? value : undefined))
    .optional(),
  taxMode: z.enum(['NON_PPN', 'PPN_INCLUDED', 'PPN_EXCLUDED']),
  taxRatePercent: z.coerce.number().min(0, 'PPN tidak boleh negatif'),
  invoiceTotalInput: z.coerce.number().min(0, 'Total faktur wajib diisi'),
  roundingAdjustment: z.coerce.number(),
  differenceNote: z
    .string()
    .trim()
    .transform((value) => (value.length ? value : undefined))
    .optional(),
});

const itemSchema = z.object({
  productId: z.string().min(1, 'Produk wajib dipilih'),
  productUnitId: z.string().min(1, 'Satuan wajib dipilih'),
  batchNumber: z.string().trim().min(1, 'Nomor batch wajib diisi'),
  expiredDate: z.string().min(1, 'Expired date wajib diisi'),
  qtyPurchase: z.coerce.number().min(0.0001, 'Qty harus lebih dari 0'),
  purchasePrice: z.coerce.number().min(0, 'Harga beli tidak boleh negatif'),
  discountType: z.enum(['NONE', 'NOMINAL', 'PERCENT']),
  discountValue: z.coerce.number().min(0, 'Diskon tidak boleh negatif'),
});

type PurchaseForm = z.infer<typeof purchaseSchema>;
type PurchaseFormInput = z.input<typeof purchaseSchema>;
type ItemForm = z.infer<typeof itemSchema>;
type ItemFormInput = z.input<typeof itemSchema>;

type PurchaseFormItem = ItemForm & {
  id: string;
  purchaseOrderItemId?: string;
  productName: string;
  unitName: string;
  conversionToBase: number;
  sellingPrices: PurchaseSellingPricePayload[];
};

const emptyItemDefaults: ItemFormInput = {
  productId: '',
  productUnitId: '',
  batchNumber: '',
  expiredDate: '',
  qtyPurchase: 1,
  purchasePrice: 0,
  discountType: 'NONE',
  discountValue: 0,
};

function FormError({ error }: { error?: unknown }) {
  if (!error) return null;
  return (
    <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
      {error instanceof Error ? error.message : 'Request gagal'}
    </p>
  );
}

function taxModeLabel(mode: PurchaseTaxMode) {
  const labels = {
    NON_PPN: 'Non PPN',
    PPN_INCLUDED: 'PPN termasuk',
    PPN_EXCLUDED: 'PPN di luar',
  };
  return labels[mode];
}

function discountAmount(grossTotal: number, type: PurchaseDiscountType, value: number) {
  if (type === 'NONE') return 0;
  if (type === 'PERCENT') return (grossTotal * Math.min(value, 100)) / 100;
  return Math.min(value, grossTotal);
}

function calculateTax(subtotal: number, mode: PurchaseTaxMode, taxRatePercent: number) {
  if (mode === 'NON_PPN' || taxRatePercent <= 0) return 0;
  if (mode === 'PPN_INCLUDED') {
    return subtotal - subtotal / (1 + taxRatePercent / 100);
  }
  return (subtotal * taxRatePercent) / 100;
}

function buildSellingPrices(
  productUnits: ProductUnit[] | undefined,
  productUnitId: string,
  existing: PurchaseSellingPricePayload[] = [],
) {
  const activeUnits = (productUnits ?? []).filter((unit) => unit.isActive);
  const source = activeUnits.length
    ? activeUnits
    : productUnitId
      ? [{ id: productUnitId }]
      : [];
  return source.map((unit) => {
    const existingPrice = existing.find((price) => price.productUnitId === unit.id);
    return {
      productUnitId: unit.id,
      sellingPrice: existingPrice?.sellingPrice ?? 0,
    };
  });
}

function PurchaseSummary({
  subtotal,
  discountTotal,
  taxAmount,
  calculatedTotal,
  invoiceTotalInput,
  difference,
}: {
  subtotal: number;
  discountTotal: number;
  taxAmount: number;
  calculatedTotal: number;
  invoiceTotalInput: number;
  difference: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[
        ['Subtotal barang', subtotal],
        ['Total diskon', discountTotal],
        ['PPN preview', taxAmount],
        ['Total sistem preview', calculatedTotal],
        ['Total faktur input', invoiceTotalInput],
        ['Selisih', difference],
      ].map(([label, value]) => (
        <div key={label} className="rounded-md border border-slate-200 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {formatRupiah(Number(value))}
          </p>
        </div>
      ))}
    </div>
  );
}

function PurchaseDetail({ purchase }: { purchase: Purchase }) {
  return (
    <Card className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-500">Detail pembelian</p>
        <h3 className="text-xl font-bold text-slate-900">{purchase.purchaseNumber}</h3>
        <p className="text-sm text-slate-600">
          {purchase.supplier.name} • {formatDate(purchase.purchaseDate)} •{' '}
          {taxModeLabel(purchase.taxMode)}
        </p>
      </div>
      <PurchaseSummary
        subtotal={purchase.subtotal}
        discountTotal={purchase.purchaseDiscountAmount}
        taxAmount={purchase.taxAmount}
        calculatedTotal={purchase.calculatedTotal}
        invoiceTotalInput={purchase.invoiceTotalInput ?? 0}
        difference={(purchase.invoiceTotalInput ?? 0) - purchase.calculatedTotal}
      />
      <DataTable
        data={purchase.items}
        columns={[
          { key: 'product', header: 'Produk', render: (row) => row.product.name },
          {
            key: 'batchNumber',
            header: 'Batch',
            render: (row) => `${row.batchNumber} / exp ${formatDate(row.expiredDate)}`,
          },
          {
            key: 'qtyPurchase',
            header: 'Qty',
            render: (row) =>
              formatQty(
                row.qtyPurchase,
                row.productUnit.unit.symbol ?? row.productUnit.unit.name,
              ),
          },
          {
            key: 'purchasePrice',
            header: 'Harga beli',
            render: (row) => formatRupiah(row.purchasePrice),
          },
          {
            key: 'discountAmount',
            header: 'Diskon',
            render: (row) => formatRupiah(row.discountAmount),
          },
          {
            key: 'hppBase',
            header: 'HPP base',
            render: (row) => formatRupiah(row.hppBase),
          },
        ]}
      />
    </Card>
  );
}

export function PurchasePage() {
  const { poId } = useParams();
  const navigate = useNavigate();
  const toast = useToastStore((state) => state.show);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [items, setItems] = useState<PurchaseFormItem[]>([]);
  const [itemProductId, setItemProductId] = useState('');
  const [filterSupplierId, setFilterSupplierId] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [search, setSearch] = useState('');

  const purchases = usePurchases();
  const suppliers = useSuppliers();
  const products = useProducts('');
  const productUnits = useProductUnits(itemProductId || null);
  const draftFromPo = usePurchaseDraftFromPo(poId ?? null);
  const createPurchase = useCreatePurchase();
  const connection = useConnectionStatus();

  const purchaseForm = useForm<PurchaseFormInput, unknown, PurchaseForm>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      supplierId: '',
      purchaseDate: new Date().toISOString().slice(0, 10),
      invoiceDate: '',
      invoiceNumber: '',
      taxMode: 'NON_PPN',
      taxRatePercent: 0,
      invoiceTotalInput: 0,
      roundingAdjustment: 0,
      differenceNote: '',
    },
  });
  const itemForm = useForm<ItemFormInput, unknown, ItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: emptyItemDefaults,
  });

  const taxMode = purchaseForm.watch('taxMode');
  const taxRatePercent = purchaseForm.watch('taxRatePercent');
  const invoiceTotalInput = purchaseForm.watch('invoiceTotalInput');
  const roundingAdjustment = purchaseForm.watch('roundingAdjustment');

  useEffect(() => {
    const draft = draftFromPo.data;
    if (!draft) return;

    purchaseForm.reset({
      supplierId: draft.supplierId,
      purchaseDate: draft.purchaseDate,
      invoiceDate: '',
      invoiceNumber: '',
      taxMode: draft.taxMode,
      taxRatePercent: draft.taxRatePercent,
      invoiceTotalInput: 0,
      roundingAdjustment: 0,
      differenceNote: '',
    });
    setItems(
      draft.items.map((item) => ({
        id: crypto.randomUUID(),
        purchaseOrderItemId: item.purchaseOrderItemId,
        productId: item.productId,
        productUnitId: item.productUnitId,
        batchNumber: item.batchNumber,
        expiredDate: item.expiredDate,
        qtyPurchase: item.qtyPurchase,
        purchasePrice: item.purchasePrice,
        discountType: item.discountType,
        discountValue: item.discountValue,
        productName: item.product.name,
        unitName: item.productUnit.unit.symbol ?? item.productUnit.unit.name,
        conversionToBase: item.productUnit.conversionToBase,
        sellingPrices: item.sellingPrices.length
          ? item.sellingPrices
          : [{ productUnitId: item.productUnitId, sellingPrice: 0 }],
      })),
    );
  }, [draftFromPo.data, purchaseForm]);

  const selectedProduct = useMemo(
    () => products.data?.find((product) => product.id === itemProductId),
    [itemProductId, products.data],
  );

  const summary = useMemo(() => {
    const rows = items.map((item) => {
      const grossTotal = item.qtyPurchase * item.purchasePrice;
      const discount = discountAmount(grossTotal, item.discountType, item.discountValue);
      return { grossTotal, discount, netTotal: grossTotal - discount };
    });
    const subtotal = rows.reduce((sum, row) => sum + row.netTotal, 0);
    const discountTotal = rows.reduce((sum, row) => sum + row.discount, 0);
    const taxAmount = calculateTax(subtotal, taxMode, Number(taxRatePercent));
    const calculatedTotal =
      subtotal + (taxMode === 'PPN_EXCLUDED' ? taxAmount : 0) + Number(roundingAdjustment);
    return {
      subtotal,
      discountTotal,
      taxAmount,
      calculatedTotal,
      invoiceTotalInput: Number(invoiceTotalInput),
      difference: Number(invoiceTotalInput) - calculatedTotal,
    };
  }, [invoiceTotalInput, items, roundingAdjustment, taxMode, taxRatePercent]);

  const filteredPurchases = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (purchases.data ?? []).filter((purchase) => {
      const matchesSupplier =
        !filterSupplierId || purchase.supplierId === filterSupplierId;
      const matchesDate =
        !filterDate || purchase.purchaseDate.slice(0, 10) === filterDate;
      const matchesSearch =
        !query ||
        purchase.purchaseNumber.toLowerCase().includes(query) ||
        purchase.invoiceNumber?.toLowerCase().includes(query) ||
        purchase.supplier.name.toLowerCase().includes(query);
      return matchesSupplier && matchesDate && matchesSearch;
    });
  }, [filterDate, filterSupplierId, purchases.data, search]);

  function addItem(values: ItemForm) {
    const product = products.data?.find((candidate) => candidate.id === values.productId);
    const unit = productUnits.data?.find(
      (candidate) => candidate.id === values.productUnitId,
    );
    const sellingPrices = buildSellingPrices(productUnits.data, values.productUnitId);

    setItems((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        ...values,
        productName: product?.name ?? 'Produk',
        unitName: unit?.unit.symbol ?? unit?.unit.name ?? 'Satuan',
        conversionToBase: unit?.conversionToBase ?? 1,
        sellingPrices,
      },
    ]);
    itemForm.reset(emptyItemDefaults);
    setItemProductId('');
  }

  function updateSellingPrice(itemId: string, productUnitId: string, sellingPrice: number) {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              sellingPrices: item.sellingPrices.map((price) =>
                price.productUnitId === productUnitId
                  ? { ...price, sellingPrice }
                  : price,
              ),
            }
          : item,
      ),
    );
  }

  async function submitPurchase(values: PurchaseForm) {
    if (connection.isOffline) {
      toast('Server lokal tidak terhubung. Periksa jaringan atau pastikan PC server aktif.');
      return;
    }

    if (!items.length) {
      toast('Item pembelian wajib diisi');
      return;
    }

    const payload: CreatePurchasePayload = {
      ...values,
      purchaseOrderId: poId,
      items: items.map((item) => ({
        purchaseOrderItemId: item.purchaseOrderItemId,
        productId: item.productId,
        productUnitId: item.productUnitId,
        batchNumber: item.batchNumber,
        expiredDate: item.expiredDate,
        qtyPurchase: item.qtyPurchase,
        purchasePrice: item.purchasePrice,
        discountType: item.discountType,
        discountValue: item.discountValue,
        sellingPrices: item.sellingPrices.map((price) => ({
          productUnitId: price.productUnitId,
          sellingPrice: Math.trunc(price.sellingPrice),
        })),
      })),
    };

    const created = await createPurchase.mutateAsync({
      payload,
      idempotencyKey: createIdempotencyKey('purchase'),
    });
    setSelectedPurchase(created);
    setItems([]);
    itemForm.reset(emptyItemDefaults);
    purchaseForm.reset({
      supplierId: '',
      purchaseDate: new Date().toISOString().slice(0, 10),
      invoiceDate: '',
      invoiceNumber: '',
      taxMode: 'NON_PPN',
      taxRatePercent: 0,
      invoiceTotalInput: 0,
      roundingAdjustment: 0,
      differenceNote: '',
    });
    toast('Pembelian berhasil disimpan');
    if (poId) navigate('/pembelian', { replace: true });
  }

  const loading = purchases.isLoading || suppliers.isLoading || products.isLoading;
  const error = purchases.error ?? suppliers.error ?? products.error ?? draftFromPo.error;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-emerald-700">Pembelian supplier</p>
        <h1 className="text-2xl font-bold text-slate-900">Pembelian</h1>
        <p className="text-sm text-slate-600">
          Catat faktur supplier, batch, expired date, harga beli presisi, dan harga
          jual final manual.
        </p>
      </div>

      {loading ? <LoadingSkeleton /> : null}
      {error ? <ErrorState message={error.message} /> : null}
      {draftFromPo.isLoading ? <LoadingSkeleton /> : null}

      <Card className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <Input
            label="Cari"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nomor pembelian, faktur, supplier"
          />
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Supplier
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={filterSupplierId}
              onChange={(event) => setFilterSupplierId(event.target.value)}
            >
              <option value="">Semua supplier</option>
              {suppliers.data?.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Tanggal"
            type="date"
            value={filterDate}
            onChange={(event) => setFilterDate(event.target.value)}
          />
        </div>
        {filteredPurchases.length ? (
          <DataTable<Purchase>
            data={filteredPurchases}
            columns={[
              { key: 'purchaseNumber', header: 'Nomor' },
              {
                key: 'supplier',
                header: 'Supplier',
                render: (row) => row.supplier.name,
              },
              {
                key: 'purchaseDate',
                header: 'Tanggal',
                render: (row) => formatDate(row.purchaseDate),
              },
              {
                key: 'invoiceNumber',
                header: 'Faktur',
                render: (row) => row.invoiceNumber ?? '-',
              },
              {
                key: 'taxMode',
                header: 'PPN',
                render: (row) => taxModeLabel(row.taxMode),
              },
              {
                key: 'calculatedTotal',
                header: 'Total sistem',
                render: (row) => formatRupiah(row.calculatedTotal),
              },
              {
                key: 'invoiceTotalInput',
                header: 'Total faktur',
                render: (row) =>
                  row.invoiceTotalInput === null
                    ? '-'
                    : formatRupiah(row.invoiceTotalInput),
              },
              {
                key: 'items',
                header: 'Item',
                render: (row) => String(row.items.length),
              },
              {
                key: 'actions',
                header: 'Aksi',
                render: (row) => (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setSelectedPurchase(row)}
                  >
                    Detail
                  </Button>
                ),
              },
            ]}
          />
        ) : (
          <EmptyState title="Belum ada pembelian" message="Pembelian tersimpan akan muncul di sini." />
        )}
      </Card>

      {selectedPurchase ? <PurchaseDetail purchase={selectedPurchase} /> : null}

      <Card className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {poId ? 'Form pembelian dari PO' : 'Form pembelian baru'}
          </h2>
          <p className="text-sm text-slate-600">
            Preview total hanya bantuan UI. Backend menghitung final HPP, batch,
            mutasi stok, dan total pembelian.
          </p>
        </div>
        <form className="space-y-5" onSubmit={purchaseForm.handleSubmit(submitPurchase)}>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Supplier
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                disabled={Boolean(poId)}
                {...purchaseForm.register('supplierId')}
              >
                <option value="">Pilih supplier</option>
                {suppliers.data?.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
              {purchaseForm.formState.errors.supplierId ? (
                <span className="text-xs text-red-600">
                  {purchaseForm.formState.errors.supplierId.message}
                </span>
              ) : null}
            </label>
            <Input
              label="Tanggal pembelian"
              type="date"
              {...purchaseForm.register('purchaseDate')}
              error={purchaseForm.formState.errors.purchaseDate?.message}
            />
            <Input label="Nomor faktur" {...purchaseForm.register('invoiceNumber')} />
            <Input
              label="Tanggal faktur"
              type="date"
              {...purchaseForm.register('invoiceDate')}
            />
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Mode PPN
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...purchaseForm.register('taxMode')}
              >
                <option value="NON_PPN">Non PPN</option>
                <option value="PPN_INCLUDED">PPN termasuk</option>
                <option value="PPN_EXCLUDED">PPN di luar</option>
              </select>
            </label>
            <Input
              label="Tarif PPN (%)"
              type="number"
              step="0.01"
              {...purchaseForm.register('taxRatePercent')}
              error={purchaseForm.formState.errors.taxRatePercent?.message}
            />
            <Input
              label="Total faktur input"
              type="number"
              step="0.01"
              {...purchaseForm.register('invoiceTotalInput')}
              error={purchaseForm.formState.errors.invoiceTotalInput?.message}
            />
            <Input
              label="Pembulatan/koreksi"
              type="number"
              step="0.01"
              {...purchaseForm.register('roundingAdjustment')}
              error={purchaseForm.formState.errors.roundingAdjustment?.message}
            />
            <Input
              label="Catatan selisih"
              {...purchaseForm.register('differenceNote')}
              placeholder="Wajib bila faktur berbeda signifikan"
            />
          </div>

          <PurchaseSummary {...summary} />

          <div className="rounded-md border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">Tambah item pembelian</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Produk
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  {...itemForm.register('productId', {
                    onChange: (event) => {
                      setItemProductId(event.target.value);
                      itemForm.setValue('productUnitId', '');
                    },
                  })}
                >
                  <option value="">Pilih produk</option>
                  {products.data?.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                {itemForm.formState.errors.productId ? (
                  <span className="text-xs text-red-600">
                    {itemForm.formState.errors.productId.message}
                  </span>
                ) : null}
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Satuan pembelian
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  {...itemForm.register('productUnitId')}
                >
                  <option value="">Pilih satuan</option>
                  {productUnits.data?.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unit.symbol ?? unit.unit.name} • isi {formatQty(unit.conversionToBase)}
                    </option>
                  ))}
                </select>
                {itemForm.formState.errors.productUnitId ? (
                  <span className="text-xs text-red-600">
                    {itemForm.formState.errors.productUnitId.message}
                  </span>
                ) : null}
              </label>
              <Input
                label="Qty diterima"
                type="number"
                step="0.0001"
                {...itemForm.register('qtyPurchase')}
                error={itemForm.formState.errors.qtyPurchase?.message}
              />
              <Input
                label="Harga beli/modal"
                type="number"
                step="0.000001"
                {...itemForm.register('purchasePrice')}
                error={itemForm.formState.errors.purchasePrice?.message}
              />
              <Input
                label="Nomor batch"
                {...itemForm.register('batchNumber')}
                error={itemForm.formState.errors.batchNumber?.message}
              />
              <Input
                label="Expired date"
                type="date"
                {...itemForm.register('expiredDate')}
                error={itemForm.formState.errors.expiredDate?.message}
              />
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Jenis diskon
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  {...itemForm.register('discountType')}
                >
                  <option value="NONE">Tidak ada</option>
                  <option value="NOMINAL">Nominal</option>
                  <option value="PERCENT">Persen</option>
                </select>
              </label>
              <Input
                label="Nilai diskon"
                type="number"
                step="0.01"
                {...itemForm.register('discountValue')}
                error={itemForm.formState.errors.discountValue?.message}
              />
              <div className="flex items-end">
                <Button type="button" onClick={itemForm.handleSubmit(addItem)}>
                  <Plus className="h-4 w-4" />
                  Tambah item
                </Button>
              </div>
            </div>
            {selectedProduct ? (
              <p className="mt-3 text-xs text-slate-500">
                Satuan base: {selectedProduct.baseUnit.symbol ?? selectedProduct.baseUnit.name}
              </p>
            ) : null}
          </div>

          {items.length ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">Item siap disimpan</h3>
              {items.map((item) => (
                <div key={item.id} className="rounded-md border border-slate-200 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{item.productName}</p>
                      <p className="text-sm text-slate-600">
                        {formatQty(item.qtyPurchase)} {item.unitName} • batch {item.batchNumber} • exp{' '}
                        {formatDate(item.expiredDate)}
                      </p>
                      <p className="text-xs text-slate-500">
                        HPP preview/base:{' '}
                        {formatRupiah(
                          item.conversionToBase
                            ? item.purchasePrice / item.conversionToBase
                            : item.purchasePrice,
                        )}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        setItems((current) =>
                          current.filter((candidate) => candidate.id !== item.id),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                      Hapus
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {item.sellingPrices.map((price) => {
                      const unitName =
                        productNameForUnit(products.data, item.productId, price.productUnitId) ??
                        item.unitName;
                      return (
                        <Input
                          key={price.productUnitId}
                          label={`Harga jual ${unitName}`}
                          type="number"
                          step="1"
                          value={price.sellingPrice}
                          onChange={(event) =>
                            updateSellingPrice(
                              item.id,
                              price.productUnitId,
                              Number(event.target.value),
                            )
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Belum ada item"
              message="Tambahkan minimal satu item pembelian sebelum menyimpan."
            />
          )}

          <FormError error={createPurchase.error} />
          <div className="flex justify-end">
            <Button type="submit" disabled={createPurchase.isPending || connection.isOffline}>
              {createPurchase.isPending ? 'Menyimpan...' : 'Simpan pembelian'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function createIdempotencyKey(prefix: string) {
  if ('crypto' in window && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function productNameForUnit(
  products: Product[] | undefined,
  productId: string,
  productUnitId: string,
) {
  const product = products?.find((candidate) => candidate.id === productId);
  const unit = product?.productUnits.find((candidate) => candidate.id === productUnitId);
  return unit?.unit.symbol ?? unit?.unit.name;
}
