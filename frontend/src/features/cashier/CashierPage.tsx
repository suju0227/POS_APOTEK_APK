import {
  Banknote,
  CreditCard,
  Minus,
  Plus,
  QrCode,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { Input } from '../../shared/components/Input';
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton';
import { useToastStore } from '../../shared/components/toast.store';
import { useConnectionStatus } from '../../shared/hooks/useConnectionStatus';
import { formatQty, formatRupiah } from '../../shared/utils/formatters';
import {
  useCashierProducts,
  useCreateCashierSale,
  useCreateSaleFromPrescription,
  useReadyPrescriptions,
} from './cashier.hooks';
import { useCashierCartStore } from './cashierCart.store';
import type {
  CashierCartItem,
  CashierProduct,
  CashierProductUnit,
  DiscountType,
  PaymentMethod,
  ReadyPrescription,
} from './cashier.types';

const paymentMethods: Array<{
  value: PaymentMethod;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}> = [
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'TRANSFER', label: 'Transfer', icon: Receipt },
  { value: 'QRIS', label: 'QRIS', icon: QrCode },
  { value: 'DEBIT', label: 'Debit', icon: CreditCard },
];

const discountTypes: Array<{ value: DiscountType; label: string }> = [
  { value: 'NONE', label: 'Tanpa diskon' },
  { value: 'PERCENT', label: 'Persen' },
  { value: 'NOMINAL', label: 'Nominal' },
];

export function CashierPage() {
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paidAmount, setPaidAmount] = useState(0);
  const [discountType, setDiscountType] = useState<DiscountType>('NONE');
  const [discountValue, setDiscountValue] = useState(0);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const productsQuery = useCashierProducts(search);
  const createSaleMutation = useCreateCashierSale();
  const readyPrescriptionsQuery = useReadyPrescriptions();
  const createPrescriptionSaleMutation = useCreateSaleFromPrescription();
  const connection = useConnectionStatus();
  const { items, addItem, updateQty, removeItem, clear } = useCashierCartStore();
  const showToast = useToastStore((state) => state.show);

  const estimatedSubtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + item.qtySaleUnit * item.sellingPrice,
        0,
      ),
    [items],
  );
  const discountTotal = useMemo(
    () => calculateDiscount(discountType, discountValue, estimatedSubtotal),
    [discountType, discountValue, estimatedSubtotal],
  );
  const grandTotal = Math.max(estimatedSubtotal - discountTotal, 0);
  const changeAmount =
    paymentMethod === 'CASH' ? Math.max(paidAmount - grandTotal, 0) : 0;

  const handleAddItem = (product: CashierProduct, unit: CashierProductUnit) => {
    addItem({ product, unit });
    showToast(`${product.name} ditambahkan ke keranjang.`);
  };

  const handleCheckout = async () => {
    if (connection.isOffline) {
      const message =
        'Server lokal tidak terhubung. Periksa jaringan atau pastikan PC server aktif.';
      setCheckoutError(message);
      showToast(message);
      return;
    }

    const validationMessage = validateCheckout({
      items,
      paymentMethod,
      paidAmount,
      discountType,
      discountValue,
      subtotal: estimatedSubtotal,
      grandTotal,
    });

    if (validationMessage) {
      setCheckoutError(validationMessage);
      showToast(validationMessage);
      return;
    }

    setCheckoutError(null);

    try {
      const sale = await createSaleMutation.mutateAsync({
        idempotencyKey: makeIdempotencyKey(),
        payload: {
          paymentMethod,
          paidAmount,
          discountType,
          discountValue: discountType === 'NONE' ? 0 : discountValue,
          items: items.map((item) => ({
            productId: item.productId,
            productUnitId: item.productUnitId,
            qtySaleUnit: item.qtySaleUnit,
          })),
        },
      });

      clear();
      setPaidAmount(0);
      setDiscountType('NONE');
      setDiscountValue(0);
      showToast(`Transaksi ${sale.saleNumber} berhasil disimpan.`);
      void productsQuery.refetch();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Transaksi gagal disimpan.';
      setCheckoutError(message);
      showToast(message);
    }
  };

  const handlePrescriptionCheckout = async (prescription: ReadyPrescription) => {
    if (connection.isOffline) {
      const message =
        'Server lokal tidak terhubung. Periksa jaringan atau pastikan PC server aktif.';
      setCheckoutError(message);
      showToast(message);
      return;
    }

    if (discountValue < 0) {
      showToast('Diskon tidak boleh negatif.');
      return;
    }
    if (discountType === 'PERCENT' && discountValue > 100) {
      showToast('Diskon persen tidak boleh lebih dari 100.');
      return;
    }
    if (paidAmount < 0) {
      showToast('Nominal pembayaran tidak boleh negatif.');
      return;
    }

    try {
      const sale = await createPrescriptionSaleMutation.mutateAsync({
        prescriptionId: prescription.id,
        idempotencyKey: makeIdempotencyKey(),
        payload: {
          paymentMethod,
          paidAmount,
          discountType,
          discountValue: discountType === 'NONE' ? 0 : discountValue,
          customerName: prescription.patientName,
          note: `Checkout dari resep ${prescription.prescriptionNumber}`,
        },
      });
      showToast(`Resep ${prescription.prescriptionNumber} dibayar sebagai ${sale.saleNumber}.`);
      setPaidAmount(0);
      setDiscountType('NONE');
      setDiscountValue(0);
      void readyPrescriptionsQuery.refetch();
      void productsQuery.refetch();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Checkout resep gagal.';
      setCheckoutError(message);
      showToast(message);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-emerald-700">Kasir</p>
        <h1 className="text-2xl font-bold text-slate-950">Transaksi Kasir</h1>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4">
          <ReadyPrescriptionPanel
            prescriptions={readyPrescriptionsQuery.data ?? []}
            isLoading={readyPrescriptionsQuery.isLoading}
            error={
              readyPrescriptionsQuery.isError
                ? readyPrescriptionsQuery.error.message
                : null
            }
            isSubmitting={createPrescriptionSaleMutation.isPending}
            onCheckout={handlePrescriptionCheckout}
          />

          <Card>
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={(event) => {
                event.preventDefault();
                setSearch(searchDraft);
              }}
            >
              <div className="flex-1">
                <Input
                  label="Cari produk"
                  placeholder="Nama, kode, barcode, atau generik"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                />
              </div>
              <Button type="submit" variant="secondary" className="sm:mb-0">
                <Search size={16} />
                Cari
              </Button>
            </form>
          </Card>

          {productsQuery.isLoading ? (
            <LoadingSkeleton rows={6} />
          ) : productsQuery.isError ? (
            <ErrorState
              title="Produk gagal dimuat"
              message={productsQuery.error.message}
            />
          ) : productsQuery.data?.length ? (
            <div className="grid gap-3">
              {productsQuery.data.map((product) => (
                <ProductResult
                  key={product.id}
                  product={product}
                  onAddItem={handleAddItem}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Produk tidak ditemukan"
              message="Produk aktif dengan stok dan satuan jual aktif akan tampil di sini."
            />
          )}
        </section>

        <aside className="xl:sticky xl:top-20 xl:self-start">
          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Keranjang</h2>
                <p className="text-sm text-slate-500">{items.length} item</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                disabled={!items.length || createSaleMutation.isPending}
                onClick={() => {
                  clear();
                  setCheckoutError(null);
                  showToast('Keranjang dikosongkan.');
                }}
              >
                <Trash2 size={16} />
                Kosongkan
              </Button>
            </div>

            {items.length ? (
              <div className="divide-y divide-slate-200">
                {items.map((item) => (
                  <div key={item.cartItemId} className="space-y-3 py-4 first:pt-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-950">
                          {item.productName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.productCode} - {item.unitSymbol ?? item.unitName}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                        aria-label={`Hapus ${item.productName}`}
                        disabled={createSaleMutation.isPending}
                        onClick={() => removeItem(item.cartItemId)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <QtyStepper
                        value={item.qtySaleUnit}
                        min={item.minSaleQty}
                        max={item.stockAvailable}
                        disabled={createSaleMutation.isPending}
                        onChange={(qty) => updateQty(item.cartItemId, qty)}
                      />
                      <div className="text-right">
                        <div className="text-sm text-slate-500">
                          {formatRupiah(item.sellingPrice)}
                        </div>
                        <div className="font-semibold text-slate-950">
                          {formatRupiah(item.qtySaleUnit * item.sellingPrice)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-slate-300 p-6 text-center">
                <ShoppingCart className="mx-auto text-slate-400" size={28} />
                <p className="mt-2 text-sm font-medium text-slate-700">
                  Belum ada item
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Cari produk lalu pilih satuan jual untuk mulai transaksi.
                </p>
              </div>
            )}

            <PaymentPanel
              paymentMethod={paymentMethod}
              paidAmount={paidAmount}
              discountType={discountType}
              discountValue={discountValue}
              subtotal={estimatedSubtotal}
              discountTotal={discountTotal}
              grandTotal={grandTotal}
              changeAmount={changeAmount}
              isSubmitting={createSaleMutation.isPending}
              checkoutError={checkoutError}
              isServerOffline={connection.isOffline}
              onPaymentMethodChange={setPaymentMethod}
              onPaidAmountChange={setPaidAmount}
              onDiscountTypeChange={(value) => {
                setDiscountType(value);
                if (value === 'NONE') setDiscountValue(0);
              }}
              onDiscountValueChange={setDiscountValue}
              onCheckout={handleCheckout}
            />
          </Card>
        </aside>
      </div>
    </div>
  );
}

function ProductResult({
  product,
  onAddItem,
}: {
  product: CashierProduct;
  onAddItem: (product: CashierProduct, unit: CashierProductUnit) => void;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-950">{product.name}</h2>
            {product.category ? (
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                {product.category.name}
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {product.code}
            {product.barcode ? ` - ${product.barcode}` : ''}
            {product.genericName ? ` - ${product.genericName}` : ''}
          </div>
        </div>
        <div className="text-sm text-slate-600">
          Stok dasar:{' '}
          <span className="font-semibold text-slate-950">
            {formatQty(product.stockAvailableBase, product.baseUnit.symbol)}
          </span>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {product.units.map((unit) => (
          <ProductUnitButton
            key={unit.productUnitId}
            unit={unit}
            onClick={() => onAddItem(product, unit)}
          />
        ))}
      </div>
    </Card>
  );
}

function ReadyPrescriptionPanel({
  prescriptions,
  isLoading,
  error,
  isSubmitting,
  onCheckout,
}: {
  prescriptions: ReadyPrescription[];
  isLoading: boolean;
  error: string | null;
  isSubmitting: boolean;
  onCheckout: (prescription: ReadyPrescription) => void;
}) {
  if (isLoading) return <LoadingSkeleton rows={2} />;
  if (error) {
    return (
      <ErrorState
        title="Resep siap bayar gagal dimuat"
        message={error}
      />
    );
  }
  if (!prescriptions.length) return null;

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-slate-950">Resep Siap Bayar</h2>
        <p className="text-sm text-slate-600">
          Checkout resep tetap menjalankan FEFO dan pengurangan stok di backend.
        </p>
      </div>
      <div className="grid gap-3">
        {prescriptions.map((prescription) => (
          <div
            key={prescription.id}
            className="rounded-md border border-slate-200 p-3"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="font-semibold text-slate-950">
                  {prescription.prescriptionNumber} - {prescription.patientName}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {prescription.doctorName ? `Dokter ${prescription.doctorName} - ` : ''}
                  {prescription.items.length} item
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {prescription.items.map((item) => (
                    <span
                      key={item.id}
                      className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"
                    >
                      {item.productName} {formatQty(item.qtySaleUnit, item.unitSymbol)}
                    </span>
                  ))}
                </div>
              </div>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => onCheckout(prescription)}
              >
                {isSubmitting ? 'Memproses...' : 'Checkout Resep'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ProductUnitButton({
  unit,
  onClick,
}: {
  unit: CashierProductUnit;
  onClick: () => void;
}) {
  const isBelowMinimum = unit.stockAvailable < unit.minSaleQty;

  return (
    <button
      type="button"
      disabled={isBelowMinimum}
      className="rounded-md border border-slate-200 p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-slate-950">
            {unit.unitSymbol ?? unit.unitName}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Min {formatQty(unit.minSaleQty)} - Stok{' '}
            {formatQty(unit.stockAvailable, unit.unitSymbol)}
          </div>
          {isBelowMinimum ? (
            <div className="mt-1 text-xs font-medium text-amber-700">
              Stok kurang dari minimum jual
            </div>
          ) : unit.saleUnitNote ? (
            <div className="mt-1 text-xs text-slate-500">{unit.saleUnitNote}</div>
          ) : null}
        </div>
        <div className="text-right text-sm font-semibold text-emerald-700">
          {formatRupiah(unit.sellingPrice)}
        </div>
      </div>
    </button>
  );
}

function QtyStepper({
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const step = min || 1;

  return (
    <div className="flex items-center rounded-md border border-slate-200">
      <button
        type="button"
        className="grid h-9 w-9 place-items-center text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        disabled={disabled || value <= min}
        onClick={() => onChange(value - step)}
        aria-label="Kurangi qty"
      >
        <Minus size={15} />
      </button>
      <input
        className="h-9 w-20 border-x border-slate-200 text-center text-sm font-semibold outline-none disabled:bg-slate-50"
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <button
        type="button"
        className="grid h-9 w-9 place-items-center text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + step)}
        aria-label="Tambah qty"
      >
        <Plus size={15} />
      </button>
    </div>
  );
}

function PaymentPanel({
  paymentMethod,
  paidAmount,
  discountType,
  discountValue,
  subtotal,
  discountTotal,
  grandTotal,
  changeAmount,
  isSubmitting,
  checkoutError,
  isServerOffline,
  onPaymentMethodChange,
  onPaidAmountChange,
  onDiscountTypeChange,
  onDiscountValueChange,
  onCheckout,
}: {
  paymentMethod: PaymentMethod;
  paidAmount: number;
  discountType: DiscountType;
  discountValue: number;
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  changeAmount: number;
  isSubmitting: boolean;
  checkoutError: string | null;
  isServerOffline: boolean;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  onPaidAmountChange: (value: number) => void;
  onDiscountTypeChange: (value: DiscountType) => void;
  onDiscountValueChange: (value: number) => void;
  onCheckout: () => void;
}) {
  return (
    <div className="rounded-md bg-slate-50 p-4">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Pembayaran</h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const active = paymentMethod === method.value;
              return (
                <button
                  key={method.value}
                  type="button"
                  className={`flex h-10 items-center justify-center gap-2 rounded-md border text-sm font-semibold transition ${
                    active
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                  disabled={isSubmitting}
                  onClick={() => onPaymentMethodChange(method.value)}
                >
                  <Icon size={16} />
                  {method.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Jenis diskon
            </span>
            <select
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
              value={discountType}
              disabled={isSubmitting}
              onChange={(event) =>
                onDiscountTypeChange(event.target.value as DiscountType)
              }
            >
              {discountTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <Input
            label={discountType === 'PERCENT' ? 'Diskon persen' : 'Diskon nominal'}
            type="number"
            min={0}
            max={discountType === 'PERCENT' ? 100 : undefined}
            disabled={discountType === 'NONE' || isSubmitting}
            value={discountValue}
            onChange={(event) => onDiscountValueChange(Number(event.target.value))}
          />
          <Input
            label="Nominal diterima"
            type="number"
            min={0}
            disabled={isSubmitting}
            value={paidAmount}
            onChange={(event) => onPaidAmountChange(Number(event.target.value))}
          />
        </div>

        <div className="space-y-2 border-t border-slate-200 pt-4 text-sm">
          <SummaryRow label="Subtotal" value={formatRupiah(subtotal)} />
          <SummaryRow label="Diskon" value={formatRupiah(discountTotal)} />
          <SummaryRow
            label="Grand total"
            value={formatRupiah(grandTotal)}
            strong
          />
          <SummaryRow label="Kembalian" value={formatRupiah(changeAmount)} />
        </div>

        {checkoutError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {checkoutError}
          </div>
        ) : null}

        <Button
          type="button"
          fullWidth
          disabled={isSubmitting || isServerOffline}
          onClick={onCheckout}
        >
          {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${
        strong ? 'text-base font-bold text-slate-950' : 'text-slate-600'
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function calculateDiscount(
  discountType: DiscountType,
  discountValue: number,
  subtotal: number,
) {
  if (discountValue <= 0 || discountType === 'NONE') return 0;
  if (discountType === 'PERCENT') {
    return Math.round((subtotal * Math.min(discountValue, 100)) / 100);
  }
  return Math.round(Math.min(discountValue, subtotal));
}

function validateCheckout({
  items,
  paymentMethod,
  paidAmount,
  discountType,
  discountValue,
  subtotal,
  grandTotal,
}: {
  items: CashierCartItem[];
  paymentMethod: PaymentMethod;
  paidAmount: number;
  discountType: DiscountType;
  discountValue: number;
  subtotal: number;
  grandTotal: number;
}) {
  if (!items.length) return 'Keranjang masih kosong.';
  if (items.some((item) => item.qtySaleUnit < item.minSaleQty)) {
    return 'Qty item tidak boleh di bawah minimum jual.';
  }
  if (items.some((item) => item.qtySaleUnit > item.stockAvailable)) {
    return 'Qty item melebihi stok tersedia.';
  }
  if (discountValue < 0) return 'Diskon tidak boleh negatif.';
  if (discountType === 'PERCENT' && discountValue > 100) {
    return 'Diskon persen tidak boleh lebih dari 100.';
  }
  if (discountType === 'NOMINAL' && discountValue > subtotal) {
    return 'Diskon nominal tidak boleh melebihi subtotal.';
  }
  if (paidAmount < 0) return 'Nominal pembayaran tidak boleh negatif.';
  if (paymentMethod === 'CASH' && paidAmount < grandTotal) {
    return 'Nominal pembayaran belum mencukupi.';
  }
  return null;
}

function makeIdempotencyKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `sale-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
