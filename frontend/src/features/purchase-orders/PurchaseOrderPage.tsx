import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { DataTable } from '../../shared/components/DataTable';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { Input } from '../../shared/components/Input';
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton';
import { useToastStore } from '../../shared/components/toast.store';
import { formatDate, formatQty } from '../../shared/utils/formatters';
import {
  useProducts,
  useProductUnits,
  useSuppliers,
} from '../master-data/masterData.hooks';
import type {
  CreatePurchaseOrderItemPayload,
  PurchaseOrder,
} from './purchaseOrder.types';
import {
  useCancelPurchaseOrder,
  useCreatePurchaseOrder,
  useMarkPurchaseOrderSent,
  usePrintPurchaseOrderPreview,
  usePurchaseOrders,
} from './purchaseOrder.hooks';

const poSchema = z.object({
  supplierId: z.string().min(1, 'Supplier wajib dipilih'),
  orderDate: z.string().min(1, 'Tanggal PO wajib diisi'),
  note: z
    .string()
    .trim()
    .transform((value) => (value.length ? value : undefined))
    .optional(),
});

const itemSchema = z.object({
  productId: z.string().min(1, 'Produk wajib dipilih'),
  productUnitId: z.string().min(1, 'Satuan wajib dipilih'),
  qtyOrdered: z.coerce.number().min(0.0001, 'Qty harus lebih dari 0'),
  note: z
    .string()
    .trim()
    .transform((value) => (value.length ? value : undefined))
    .optional(),
});

type PoForm = z.infer<typeof poSchema>;
type ItemForm = z.infer<typeof itemSchema>;
type ItemFormInput = z.input<typeof itemSchema>;

function StatusBadge({ status }: { status: PurchaseOrder['status'] }) {
  const labels = {
    DRAFT: 'Draft',
    SENT: 'Terkirim',
    PARTIALLY_RECEIVED: 'Diterima sebagian',
    RECEIVED: 'Diterima',
    CANCELLED: 'Batal',
  };
  const classes = {
    DRAFT: 'bg-slate-100 text-slate-700',
    SENT: 'bg-blue-50 text-blue-700',
    PARTIALLY_RECEIVED: 'bg-amber-50 text-amber-700',
    RECEIVED: 'bg-emerald-50 text-emerald-700',
    CANCELLED: 'bg-red-50 text-red-700',
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

export function PurchaseOrderPage() {
  const toast = useToastStore((state) => state.show);
  const navigate = useNavigate();
  const [items, setItems] = useState<CreatePurchaseOrderItemPayload[]>([]);
  const [itemProductId, setItemProductId] = useState('');
  const [previewText, setPreviewText] = useState('');

  const suppliers = useSuppliers();
  const products = useProducts('');
  const productUnits = useProductUnits(itemProductId || null);
  const purchaseOrders = usePurchaseOrders();
  const createPo = useCreatePurchaseOrder();
  const markSent = useMarkPurchaseOrderSent();
  const cancelPo = useCancelPurchaseOrder();
  const printPreview = usePrintPurchaseOrderPreview();

  const poForm = useForm<PoForm>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      supplierId: '',
      orderDate: new Date().toISOString().slice(0, 10),
      note: '',
    },
  });
  const itemForm = useForm<ItemFormInput, unknown, ItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      productId: '',
      productUnitId: '',
      qtyOrdered: 1,
      note: '',
    },
  });

  const selectedProduct = products.data?.find((product) => product.id === itemProductId);
  const saleUnits = useMemo(
    () => (productUnits.data ?? []).filter((unit) => unit.isActive),
    [productUnits.data],
  );

  useEffect(() => {
    itemForm.setValue('productUnitId', '');
  }, [itemForm, itemProductId]);

  const addItem = itemForm.handleSubmit((values) => {
    setItems((current) => [...current, values]);
    itemForm.reset({ productId: '', productUnitId: '', qtyOrdered: 1, note: '' });
    setItemProductId('');
  });

  const submitPo = poForm.handleSubmit(async (values) => {
    if (!items.length) {
      toast('Minimal satu item PO wajib ditambahkan');
      return;
    }
    await createPo.mutateAsync({ ...values, items });
    setItems([]);
    poForm.reset({
      supplierId: '',
      orderDate: new Date().toISOString().slice(0, 10),
      note: '',
    });
    toast('PO berhasil dibuat');
  });

  function itemLabel(item: CreatePurchaseOrderItemPayload) {
    const product = products.data?.find((entry) => entry.id === item.productId);
    const productUnit = product?.productUnits.find(
      (entry) => entry.id === item.productUnitId,
    );
    return {
      productName: product?.name ?? '-',
      unitName: productUnit?.unit.name ?? '-',
    };
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Pemesanan</h1>
        <p className="mt-1 text-sm text-slate-600">
          Buat PO obat tanpa menambah stok. Stok bertambah hanya setelah pembelian final.
        </p>
      </div>

      <Card className="space-y-5">
        <form className="grid gap-4 lg:grid-cols-3" onSubmit={submitPo}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Supplier
            </span>
            <select
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              {...poForm.register('supplierId')}
            >
              <option value="">Pilih supplier</option>
              {(suppliers.data ?? []).map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Tanggal PO"
            type="date"
            {...poForm.register('orderDate')}
            error={poForm.formState.errors.orderDate?.message}
          />
          <Input label="Catatan PO" {...poForm.register('note')} />
        </form>

        <div className="rounded-lg border border-slate-200 p-4">
          <h2 className="mb-3 text-base font-semibold text-slate-950">Item PO</h2>
          <form className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]" onSubmit={addItem}>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Produk
              </span>
              <select
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                {...itemForm.register('productId', {
                  onChange: (event) => setItemProductId(event.target.value),
                })}
              >
                <option value="">Pilih produk</option>
                {(products.data ?? []).map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Satuan
              </span>
              <select
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                {...itemForm.register('productUnitId')}
              >
                <option value="">Pilih satuan</option>
                {saleUnits.map((productUnit) => (
                  <option key={productUnit.id} value={productUnit.id}>
                    {productUnit.unit.name}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Qty pesan"
              type="number"
              step="0.0001"
              {...itemForm.register('qtyOrdered')}
              error={itemForm.formState.errors.qtyOrdered?.message}
            />
            <Input label="Catatan item" {...itemForm.register('note')} />
            <Button className="self-end" type="submit">
              Tambah
            </Button>
          </form>
          {itemProductId && saleUnits.length === 0 && !productUnits.isLoading ? (
            <p className="mt-2 text-sm font-medium text-red-600">
              Produk {selectedProduct?.name ?? ''} belum memiliki satuan aktif.
            </p>
          ) : null}
        </div>

        {items.length ? (
          <DataTable
            data={items.map((item, index) => ({ ...item, index }))}
            columns={[
              {
                key: 'product',
                header: 'Produk',
                render: (row) => itemLabel(row).productName,
              },
              {
                key: 'unit',
                header: 'Satuan',
                render: (row) => itemLabel(row).unitName,
              },
              {
                key: 'qtyOrdered',
                header: 'Qty',
                render: (row) => formatQty(row.qtyOrdered),
              },
              { key: 'note', header: 'Catatan' },
              {
                key: 'actions',
                header: 'Aksi',
                render: (row) => (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      setItems((current) =>
                        current.filter((_, itemIndex) => itemIndex !== row.index),
                      )
                    }
                  >
                    Hapus
                  </Button>
                ),
              },
            ]}
          />
        ) : (
          <EmptyState title="Item PO kosong" message="Tambahkan item yang akan dipesan." />
        )}

        <div className="flex justify-end">
          <Button onClick={submitPo} disabled={createPo.isPending}>
            Simpan PO
          </Button>
        </div>
        <FormError error={createPo.error} />
      </Card>

      {purchaseOrders.isLoading ? <LoadingSkeleton rows={5} /> : null}
      {purchaseOrders.isError ? (
        <ErrorState message={purchaseOrders.error.message} />
      ) : null}
      {purchaseOrders.data?.length === 0 ? (
        <EmptyState title="PO kosong" message="Belum ada pemesanan obat." />
      ) : null}
      {purchaseOrders.data?.length ? (
        <DataTable<PurchaseOrder>
          data={purchaseOrders.data}
          columns={[
            { key: 'poNumber', header: 'Nomor PO' },
            {
              key: 'orderDate',
              header: 'Tanggal',
              render: (row) => formatDate(row.orderDate),
            },
            {
              key: 'supplier',
              header: 'Supplier',
              render: (row) => row.supplier.name,
            },
            {
              key: 'items',
              header: 'Item',
              render: (row) =>
                row.items
                  .map((item) => `${item.product.name} ${formatQty(item.qtyOrdered, item.productUnit.unit.name)}`)
                  .join(', '),
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
                    variant="secondary"
                    disabled={markSent.isPending || row.status !== 'DRAFT'}
                    onClick={async () => {
                      await markSent.mutateAsync(row.id);
                      toast('PO ditandai terkirim');
                    }}
                  >
                    Kirim
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={
                      cancelPo.isPending ||
                      row.status === 'RECEIVED' ||
                      row.status === 'CANCELLED'
                    }
                    onClick={async () => {
                      await cancelPo.mutateAsync(row.id);
                      toast('PO dibatalkan');
                    }}
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={async () => {
                      const preview = await printPreview.mutateAsync(row.id);
                      setPreviewText(JSON.stringify(preview, null, 2));
                    }}
                  >
                    Preview
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={row.status === 'CANCELLED'}
                    onClick={() => navigate(`/pembelian/dari-po/${row.id}`)}
                  >
                    Convert
                  </Button>
                </div>
              ),
            },
          ]}
        />
      ) : null}
      <FormError error={markSent.error ?? cancelPo.error ?? printPreview.error} />
      {previewText ? (
        <Card>
          <h2 className="mb-2 text-base font-semibold text-slate-950">
            Print preview PO
          </h2>
          <pre className="max-h-96 overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-50">
            {previewText}
          </pre>
        </Card>
      ) : null}
    </div>
  );
}
