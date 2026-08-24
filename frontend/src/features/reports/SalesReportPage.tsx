import { useState } from 'react';
import { BarChart3, ReceiptText, RotateCcw, Wallet } from 'lucide-react';
import { Card } from '../../shared/components/Card';
import { DataTable } from '../../shared/components/DataTable';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton';
import { useToastStore } from '../../shared/components/toast.store';
import { formatDateTimeWita, formatRupiah } from '../../shared/utils/formatters';
import { defaultReportFilters } from './report.defaults';
import { downloadReport } from './report.api';
import { useSalesReport } from './report.hooks';
import { ReportPagination } from './ReportPagination';
import { SalesCharts } from './ReportCharts';
import { ReportToolbar } from './ReportToolbar';
import type { ReportFilters, SalesReportRow } from './report.types';

export function SalesReportPage() {
  const [filters, setFilters] = useState<ReportFilters>(defaultReportFilters);
  const [isExporting, setIsExporting] = useState(false);
  const toast = useToastStore((state) => state.show);
  const report = useSalesReport(filters);

  const exportFile = async (format: 'xlsx' | 'pdf') => {
    setIsExporting(true);
    try {
      await downloadReport(
        `/exports/reports/sales.${format}`,
        filters,
        `laporan-penjualan.${format}`,
      );
      toast('Export laporan penjualan berhasil.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Export gagal.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Laporan Penjualan"
        description="Pantau transaksi, diskon, retur, dan omzet bersih."
      />
      <ReportToolbar
        filters={filters}
        mode="sales"
        isExporting={isExporting}
        onChange={setFilters}
        onExport={exportFile}
      />
      {report.isLoading ? <LoadingSkeleton rows={5} /> : null}
      {report.error ? (
        <ErrorState
          title="Laporan penjualan gagal dimuat"
          message={report.error instanceof Error ? report.error.message : undefined}
        />
      ) : null}
      {report.data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Transaksi"
              value={String(report.data.summary.transactionCount)}
              helper={`${report.data.summary.returnCount} retur`}
              icon={ReceiptText}
            />
            <SummaryCard
              title="Subtotal"
              value={formatRupiah(report.data.summary.subtotal)}
              helper={`${formatRupiah(report.data.summary.discountTotal)} diskon`}
              icon={BarChart3}
            />
            <SummaryCard
              title="Retur"
              value={formatRupiah(report.data.summary.returnTotal)}
              helper="Koreksi transaksi"
              icon={RotateCcw}
            />
            <SummaryCard
              title="Net Revenue"
              value={formatRupiah(report.data.summary.netRevenue)}
              helper={`${formatRupiah(report.data.summary.grandTotal)} total`}
              icon={Wallet}
            />
          </section>
          <SalesCharts charts={report.data.charts} />
          {report.data.data.length ? (
            <>
              <DataTable<SalesReportRow>
                data={report.data.data}
                columns={[
                  {
                    key: 'saleNumber',
                    header: 'Transaksi',
                    render: (row) => (
                      <div>
                        <div className="font-medium text-slate-900">
                          {row.saleNumber}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDateTimeWita(row.saleDate)}
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'cashier',
                    header: 'Kasir',
                    render: (row) => row.cashier.name,
                  },
                  { key: 'paymentMethod', header: 'Bayar' },
                  {
                    key: 'subtotal',
                    header: 'Subtotal',
                    render: (row) => formatRupiah(row.subtotal),
                  },
                  {
                    key: 'discountTotal',
                    header: 'Diskon',
                    render: (row) => formatRupiah(row.discountTotal),
                  },
                  {
                    key: 'returnTotal',
                    header: 'Retur',
                    render: (row) => formatRupiah(row.returnTotal),
                  },
                  {
                    key: 'netTotal',
                    header: 'Net',
                    render: (row) => (
                      <span className="font-semibold text-emerald-700">
                        {formatRupiah(row.netTotal)}
                      </span>
                    ),
                  },
                ]}
              />
              <ReportPagination
                pagination={report.data.pagination}
                filters={filters}
                onChange={setFilters}
              />
            </>
          ) : (
            <EmptyState
              title="Laporan penjualan kosong"
              message="Tidak ada transaksi sesuai filter yang dipilih."
            />
          )}
        </>
      ) : null}
    </div>
  );
}

function ReportHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-950">{title}</h1>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  helper,
  icon: Icon,
}: {
  title: string;
  value: string;
  helper: string;
  icon: React.ComponentType<{ size?: number }>;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{helper}</p>
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-700">
          <Icon size={20} />
        </div>
      </div>
    </Card>
  );
}
