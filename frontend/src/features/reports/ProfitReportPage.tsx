import { useState } from 'react';
import { BadgeDollarSign, LineChart, RotateCcw, Wallet } from 'lucide-react';
import { Card } from '../../shared/components/Card';
import { DataTable } from '../../shared/components/DataTable';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton';
import { useToastStore } from '../../shared/components/toast.store';
import {
  formatDate,
  formatDateTimeWita,
  formatQty,
  formatRupiah,
} from '../../shared/utils/formatters';
import { defaultReportFilters } from './report.defaults';
import { downloadReport } from './report.api';
import { useProfitReport } from './report.hooks';
import { ReportPagination } from './ReportPagination';
import { ProfitCharts } from './ReportCharts';
import { ReportToolbar } from './ReportToolbar';
import type { ProfitReportRow, ReportFilters } from './report.types';

export function ProfitReportPage() {
  const [filters, setFilters] = useState<ReportFilters>(defaultReportFilters);
  const [isExporting, setIsExporting] = useState(false);
  const toast = useToastStore((state) => state.show);
  const report = useProfitReport(filters);

  const exportFile = async (format: 'xlsx' | 'pdf') => {
    setIsExporting(true);
    try {
      await downloadReport(
        `/exports/reports/profit.${format}`,
        filters,
        `laporan-laba.${format}`,
      );
      toast('Export laporan laba berhasil.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Export gagal.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Laporan Laba</h1>
        <p className="mt-1 text-sm text-slate-600">
          Laba dihitung dari snapshot historis transaksi dan koreksi retur.
        </p>
      </div>
      <ReportToolbar
        filters={filters}
        mode="profit"
        isExporting={isExporting}
        onChange={setFilters}
        onExport={exportFile}
      />
      {report.isLoading ? <LoadingSkeleton rows={5} /> : null}
      {report.error ? (
        <ErrorState
          title="Laporan laba gagal dimuat"
          message={report.error instanceof Error ? report.error.message : undefined}
        />
      ) : null}
      {report.data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ProfitSummaryCard
              title="Net Revenue"
              value={formatRupiah(report.data.summary.netRevenue)}
              helper={`${formatRupiah(report.data.summary.grossRevenue)} gross`}
              icon={Wallet}
            />
            <ProfitSummaryCard
              title="Net HPP"
              value={formatRupiah(report.data.summary.netHpp)}
              helper={`${formatRupiah(report.data.summary.returnHpp)} retur`}
              icon={BadgeDollarSign}
            />
            <ProfitSummaryCard
              title="Koreksi Retur"
              value={formatRupiah(report.data.summary.returnProfit)}
              helper={`${formatRupiah(report.data.summary.returnRevenue)} revenue retur`}
              icon={RotateCcw}
            />
            <ProfitSummaryCard
              title="Net Profit"
              value={formatRupiah(report.data.summary.netProfit)}
              helper={`${formatRupiah(report.data.summary.profitDisplay)} display`}
              icon={LineChart}
            />
          </section>
          <ProfitCharts charts={report.data.charts} />
          {report.data.data.length ? (
            <>
              <DataTable<ProfitReportRow>
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
                    key: 'productName',
                    header: 'Produk',
                    render: (row) => (
                      <div>
                        <div className="font-medium text-slate-900">
                          {row.productName}
                        </div>
                        <div className="text-xs text-slate-500">
                          Batch {row.batchNumber} · Exp {formatDate(row.expiredDate)}
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'qtyBase',
                    header: 'Qty',
                    render: (row) => formatQty(row.qtyBase),
                  },
                  {
                    key: 'grossRevenue',
                    header: 'Revenue',
                    render: (row) => formatRupiah(row.grossRevenue),
                  },
                  {
                    key: 'hppAmount',
                    header: 'HPP',
                    render: (row) => formatRupiah(row.hppAmount),
                  },
                  {
                    key: 'returnProfit',
                    header: 'Retur',
                    render: (row) => formatRupiah(row.returnProfit),
                  },
                  {
                    key: 'netProfit',
                    header: 'Net Profit',
                    render: (row) => (
                      <span className="font-semibold text-emerald-700">
                        {formatRupiah(row.netProfit)}
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
              title="Laporan laba kosong"
              message="Tidak ada detail laba sesuai filter yang dipilih."
            />
          )}
        </>
      ) : null}
    </div>
  );
}

function ProfitSummaryCard({
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
