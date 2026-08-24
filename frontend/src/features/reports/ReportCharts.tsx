import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '../../shared/components/Card';
import { EmptyState } from '../../shared/components/EmptyState';
import { formatDate, formatRupiah } from '../../shared/utils/formatters';
import type { ProfitReportCharts, SalesReportCharts } from './report.types';

type TooltipPayload = {
  name?: string;
  value?: number;
  dataKey?: string;
  payload?: Record<string, unknown>;
};

const moneyKeys = new Set([
  'grossRevenue',
  'discountTotal',
  'returnTotal',
  'netRevenue',
  'netHpp',
  'netProfit',
  'returnProfit',
]);

export function SalesCharts({ charts }: { charts: SalesReportCharts }) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <ChartCard title="Tren Penjualan Harian">
        {charts.daily.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={charts.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <YAxis
                yAxisId="money"
                tickFormatter={formatShortRupiah}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <YAxis
                yAxisId="count"
                orientation="right"
                allowDecimals={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <Tooltip content={<ReportTooltip />} />
              <Bar
                yAxisId="money"
                dataKey="netRevenue"
                name="Net Revenue"
                fill="#059669"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="count"
                type="monotone"
                dataKey="transactionCount"
                name="Transaksi"
                stroke="#0f172a"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty />
        )}
      </ChartCard>
      <ChartCard title="Metode Pembayaran">
        {charts.paymentMethods.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={charts.paymentMethods}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="paymentMethod" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis
                tickFormatter={formatShortRupiah}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <Tooltip content={<ReportTooltip />} />
              <Bar
                dataKey="netRevenue"
                name="Net Revenue"
                fill="#0284c7"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty />
        )}
      </ChartCard>
    </section>
  );
}

export function ProfitCharts({ charts }: { charts: ProfitReportCharts }) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <ChartCard title="Tren Laba Harian">
        {charts.daily.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={charts.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <YAxis
                tickFormatter={formatShortRupiah}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <Tooltip content={<ReportTooltip />} />
              <Bar
                dataKey="netRevenue"
                name="Net Revenue"
                fill="#0f766e"
                radius={[4, 4, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="netProfit"
                name="Net Profit"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty />
        )}
      </ChartCard>
      <ChartCard title="Produk Laba Tertinggi">
        {charts.topProducts.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={charts.topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                type="number"
                tickFormatter={formatShortRupiah}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="productName"
                width={120}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <Tooltip content={<ReportTooltip />} />
              <Bar
                dataKey="netProfit"
                name="Net Profit"
                fill="#059669"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty />
        )}
      </ChartCard>
    </section>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
      {children}
    </Card>
  );
}

function ChartEmpty() {
  return (
    <div className="flex min-h-[280px] items-center justify-center">
      <EmptyState
        title="Grafik kosong"
        message="Tidak ada data pada filter ini."
      />
    </div>
  );
}

function ReportTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 text-xs shadow-sm">
      <p className="mb-2 font-semibold text-slate-900">{label}</p>
      <div className="space-y-1">
        {payload.map((item) => {
          const key = String(item.dataKey ?? '');
          const value = Number(item.value ?? 0);
          return (
            <p key={key} className="text-slate-600">
              {item.name}: {moneyKeys.has(key) ? formatRupiah(value) : value}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function formatShortRupiah(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${Math.round(value / 1_000_000)} jt`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)} rb`;
  return String(value);
}
