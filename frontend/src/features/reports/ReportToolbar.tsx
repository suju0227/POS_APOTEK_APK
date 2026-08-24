import { FileDown, Search } from 'lucide-react';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import type { ReportFilters } from './report.types';

type ReportToolbarProps = {
  filters: ReportFilters;
  mode: 'sales' | 'profit';
  isExporting: boolean;
  onChange: (filters: ReportFilters) => void;
  onExport: (format: 'xlsx' | 'pdf') => void;
};

export function ReportToolbar({
  filters,
  mode,
  isExporting,
  onChange,
  onExport,
}: ReportToolbarProps) {
  const update = (key: keyof ReportFilters, value: string) => {
    onChange({ ...filters, [key]: value || undefined, page: 1 });
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Input
          label="Tanggal Mulai"
          type="date"
          value={filters.startDate ?? ''}
          onChange={(event) => update('startDate', event.target.value)}
        />
        <Input
          label="Tanggal Selesai"
          type="date"
          value={filters.endDate ?? ''}
          onChange={(event) => update('endDate', event.target.value)}
        />
        {mode === 'sales' ? (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Metode Bayar
            </span>
            <select
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              value={filters.paymentMethod ?? ''}
              onChange={(event) => update('paymentMethod', event.target.value)}
            >
              <option value="">Semua</option>
              <option value="CASH">CASH</option>
              <option value="TRANSFER">TRANSFER</option>
              <option value="QRIS">QRIS</option>
              <option value="DEBIT">DEBIT</option>
            </select>
          </label>
        ) : (
          <Input
            label="Batch ID"
            value={filters.batchId ?? ''}
            onChange={(event) => update('batchId', event.target.value)}
            placeholder="Opsional"
          />
        )}
        <Input
          label="Product ID"
          value={filters.productId ?? ''}
          onChange={(event) => update('productId', event.target.value)}
          placeholder="Opsional"
        />
        <Input
          label="Category ID"
          value={filters.categoryId ?? ''}
          onChange={(event) => update('categoryId', event.target.value)}
          placeholder="Opsional"
        />
        {mode === 'sales' ? (
          <Input
            label="Cashier ID"
            value={filters.cashierId ?? ''}
            onChange={(event) => update('cashierId', event.target.value)}
            placeholder="Opsional"
          />
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => onChange({ ...filters })}>
          <Search size={16} />
          Terapkan Filter
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isExporting}
          onClick={() => onExport('xlsx')}
        >
          <FileDown size={16} />
          Excel
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isExporting}
          onClick={() => onExport('pdf')}
        >
          <FileDown size={16} />
          PDF
        </Button>
      </div>
    </section>
  );
}
