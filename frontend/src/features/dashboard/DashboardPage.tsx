import type { ComponentType } from 'react';
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  History,
  LineChart as LineChartIcon,
  PackageSearch,
  ReceiptText,
  RefreshCw,
  Stethoscope,
  ShoppingCart,
  Wallet,
} from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../auth/auth.store';
import { Button } from '../../shared/components/Button';
import { Badge } from '../../shared/components/Badge';
import { Card } from '../../shared/components/Card';
import { ConnectionStatusIndicator } from '../../shared/components/ConnectionStatusIndicator';
import { EmptyState } from '../../shared/components/EmptyState';
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton';
import { ResponsiveDataView } from '../../shared/components/ResponsiveDataView';
import { useConnectionStatus } from '../../shared/hooks/useConnectionStatus';
import {
  formatDate,
  formatDateTimeWita,
  formatNumber,
  formatQty,
  formatRupiah,
} from '../../shared/utils/formatters';
import {
  canViewAuditSummary,
  canViewCashierShortcut,
  canViewExpiringBatches,
  canViewManagerDashboard,
  canViewPrescriptionSummary,
  canViewProfit,
  canViewPurchaseOrderSummary,
  canViewRecentSales,
  canViewRevenue,
  canViewStockSummary,
  canViewTransactionSummary,
} from './dashboard.permissions';
import {
  useDashboardProfitTrend,
  useDashboardPurchaseOrderSummary,
  useDashboardPrescriptionSummary,
  useDashboardRecentActivities,
  useDashboardRevenueTrend,
  useDashboardSummary,
  useExpiredBatches,
  useLowStock,
  useRecentTransactions,
} from './dashboard.hooks';
import type {
  DashboardTrendPoint,
  ExpiringBatchItem,
  LatestSaleItem,
  LowStockProduct,
  PrescriptionSummary,
  PurchaseOrderSummary,
  RecentActivity,
  DashboardSummary,
} from './types';

type SummaryTone = 'amber' | 'blue' | 'emerald' | 'red' | 'slate' | 'violet';

const summaryToneClasses: Record<
  SummaryTone,
  { border: string; icon: string }
> = {
  amber: {
    border: 'border-l-amber-500',
    icon: 'bg-amber-50 text-amber-700',
  },
  blue: {
    border: 'border-l-blue-500',
    icon: 'bg-blue-50 text-blue-700',
  },
  emerald: {
    border: 'border-l-emerald-500',
    icon: 'bg-emerald-50 text-emerald-700',
  },
  red: {
    border: 'border-l-red-500',
    icon: 'bg-red-50 text-red-700',
  },
  slate: {
    border: 'border-l-slate-400',
    icon: 'bg-slate-100 text-slate-700',
  },
  violet: {
    border: 'border-l-violet-500',
    icon: 'bg-violet-50 text-violet-700',
  },
};

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const role = user?.role;
  const connection = useConnectionStatus();
  const canViewFinancials = canViewProfit(role);
  const showRevenue = canViewRevenue(role);
  const showTransactionSummary = canViewTransactionSummary(role);
  const showRecentSales = canViewRecentSales(role);
  const showStock = canViewStockSummary(role);
  const showExpired = canViewExpiringBatches(role);
  const showStockAction = canViewManagerDashboard(role);
  const showPurchaseSummary = canViewPurchaseOrderSummary(role);
  const showPrescriptionSummary = canViewPrescriptionSummary(role);
  const showAudit = canViewAuditSummary(role);
  const showCashierShortcut = canViewCashierShortcut(role);
  const summary = useDashboardSummary();
  const revenueTrend = useDashboardRevenueTrend(showRevenue);
  const profitTrend = useDashboardProfitTrend(canViewFinancials);
  const lowStock = useLowStock();
  const expiredBatches = useExpiredBatches(showExpired);
  const recentTransactions = useRecentTransactions(showRecentSales);
  const purchaseOrderSummary =
    useDashboardPurchaseOrderSummary(showPurchaseSummary);
  const prescriptionSummary = useDashboardPrescriptionSummary(showPrescriptionSummary);
  const recentActivities = useDashboardRecentActivities(showAudit);
  const queries = [
    summary,
    revenueTrend,
    profitTrend,
    lowStock,
    expiredBatches,
    recentTransactions,
    purchaseOrderSummary,
    prescriptionSummary,
    recentActivities,
  ];

  const isFetching = queries.some((query) => query.isFetching);

  const refreshAll = () => {
    for (const query of queries) {
      void query.refetch();
    }
  };

  if (summary.isError && !summary.data) {
    return (
      <div className="space-y-4">
        <DashboardHeader
          connectionStatus={connection.status}
          generatedAt={null}
          isFetching={isFetching}
          onRefresh={refreshAll}
        />
        <DashboardSectionError onRetry={() => void summary.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        connectionStatus={connection.status}
        generatedAt={null}
        isFetching={isFetching}
        onRefresh={refreshAll}
      />
      {showCashierShortcut ? <CashierShortcut /> : null}
      {summary.isLoading ? (
        <SummarySkeleton />
      ) : summary.isError ? (
        <DashboardSectionError onRetry={() => void summary.refetch()} />
      ) : summary.data ? (
        <SummaryGrid
          canViewFinancials={canViewFinancials}
          canViewRevenue={showRevenue}
          canViewExpiringBatchSummary={showExpired}
          canViewStock={showStock}
          canViewTransactions={showTransactionSummary}
          summary={summary.data}
        />
      ) : (
        <EmptyState
          title="Dashboard belum memiliki data"
          message="Ringkasan operasional akan tampil setelah backend mengirim data."
        />
      )}
      {showRevenue ? (
        <TrendChartGrid
          canViewFinancials={canViewFinancials}
          profitError={profitTrend.isError}
          profitLoading={profitTrend.isLoading}
          profitTrend={profitTrend.data ?? []}
          revenueError={revenueTrend.isError}
          revenueLoading={revenueTrend.isLoading}
          revenueTrend={revenueTrend.data ?? []}
          onRetryProfit={() => void profitTrend.refetch()}
          onRetryRevenue={() => void revenueTrend.refetch()}
        />
      ) : null}
      <section className="grid gap-4 lg:grid-cols-2">
        {showRecentSales ? (
          <RecentTransactionSection
            isError={recentTransactions.isError}
            isLoading={recentTransactions.isLoading}
            items={recentTransactions.data ?? []}
            onRetry={() => void recentTransactions.refetch()}
          />
        ) : null}
        {showStock ? (
          <LowStockSection
            canViewStockAction={showStockAction}
            isError={lowStock.isError}
            isLoading={lowStock.isLoading}
            items={lowStock.data ?? []}
            onRetry={() => void lowStock.refetch()}
          />
        ) : null}
      </section>
      {showExpired ? (
        <ExpiredBatchSection
          isError={expiredBatches.isError}
          isLoading={expiredBatches.isLoading}
          items={expiredBatches.data ?? []}
          onRetry={() => void expiredBatches.refetch()}
        />
      ) : null}
      <section className="grid gap-4 lg:grid-cols-2">
        {showPurchaseSummary ? (
          <PurchaseSummarySection
            isError={purchaseOrderSummary.isError}
            isLoading={purchaseOrderSummary.isLoading}
            onRetry={() => void purchaseOrderSummary.refetch()}
            summary={purchaseOrderSummary.data}
          />
        ) : null}
        {showPrescriptionSummary ? (
          <ServiceSummarySection
            isError={prescriptionSummary.isError}
            isLoading={prescriptionSummary.isLoading}
            onRetry={() => void prescriptionSummary.refetch()}
            summary={prescriptionSummary.data}
          />
        ) : null}
      </section>
      {showAudit ? (
        <AuditLogSection
          isError={recentActivities.isError}
          isLoading={recentActivities.isLoading}
          items={recentActivities.data ?? []}
          onRetry={() => void recentActivities.refetch()}
        />
      ) : null}
    </div>
  );
}

function DashboardHeader({
  connectionStatus,
  generatedAt,
  isFetching,
  onRefresh,
}: {
  connectionStatus: ReturnType<typeof useConnectionStatus>['status'];
  generatedAt: string | null;
  isFetching: boolean;
  onRefresh: () => void;
}) {
  const today = formatDate(new Date());

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold text-slate-950">Dashboard</h1>
            <ConnectionStatusIndicator status={connectionStatus} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Ringkasan operasional apotek
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Hari ini: {today} WITA
          </p>
          {generatedAt ? (
            <p className="mt-1 text-xs text-slate-500">
              Diperbarui {formatDateTimeWita(generatedAt)}
              {isFetching ? ' - menyinkronkan data terbaru...' : ''}
            </p>
          ) : null}
        </div>
        <Button type="button" variant="secondary" onClick={onRefresh}>
          <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          Muat Ulang
        </Button>
      </div>
    </div>
  );
}

function CashierShortcut() {
  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionTitle
          icon={ShoppingCart}
          title="Mode Kasir"
          description="Dashboard terbatas. Lanjutkan transaksi dari halaman kasir."
        />
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
          to="/kasir"
        >
          <ShoppingCart size={16} />
          Buka Kasir
        </Link>
      </div>
    </Card>
  );
}

function DashboardSectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
      <h2 className="text-base font-semibold text-red-900">
        Dashboard gagal dimuat.
      </h2>
      <p className="mt-1 text-sm text-red-700">
        Periksa koneksi server atau coba muat ulang.
      </p>
      <Button className="mt-4" type="button" variant="secondary" onClick={onRetry}>
        <RefreshCw size={16} />
        Muat Ulang
      </Button>
    </div>
  );
}

function DashboardEmptyState({
  message,
  title,
}: {
  message: string;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{message}</p>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="min-h-32">
          <LoadingSkeleton rows={3} />
        </Card>
      ))}
    </section>
  );
}

function ChartSkeleton() {
  return (
    <div className="mt-4 h-72">
      <LoadingSkeleton rows={5} />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="mt-4">
      <LoadingSkeleton rows={5} />
    </div>
  );
}

function SummaryGrid({
  canViewFinancials,
  canViewExpiringBatchSummary,
  canViewRevenue,
  canViewStock,
  canViewTransactions,
  summary,
}: {
  canViewFinancials: boolean;
  canViewExpiringBatchSummary: boolean;
  canViewRevenue: boolean;
  canViewStock: boolean;
  canViewTransactions: boolean;
  summary: DashboardSummary;
}) {
  const cards = [
    canViewRevenue
      ? {
          label: 'Omzet Hari Ini',
          value: formatRupiah(summary.todayRevenue),
          helper: `${formatNumber(summary.todayTransactionCount)} transaksi`,
          icon: Wallet,
          tone: 'emerald' as const,
        }
      : null,
    canViewTransactions
      ? {
          label: 'Jumlah Transaksi Hari Ini',
          value: formatNumber(summary.todayTransactionCount),
          helper: 'Checkout berhasil hari ini',
          icon: ReceiptText,
          tone: 'blue' as const,
        }
      : null,
    canViewStock
      ? {
          label: 'Stok Kritis',
          value: formatNumber(summary.lowStockCount),
          helper: 'Produk perlu dicek',
          icon: PackageSearch,
          tone: summary.lowStockCount > 0 ? ('red' as const) : ('slate' as const),
        }
      : null,
    canViewExpiringBatchSummary
      ? {
          label: 'Batch Mendekati Expired',
          value: formatNumber(summary.expiringBatchCount),
          helper: 'Dalam 90 hari',
          icon: CalendarClock,
          tone:
            summary.expiringBatchCount > 0
              ? ('amber' as const)
              : ('slate' as const),
        }
      : null,
  ].filter((card): card is NonNullable<typeof card> => Boolean(card));
  const financialCards = [
    {
      label: 'Laba Hari Ini',
      value: formatRupiah(summary.todayProfit ?? 0),
      helper: 'Khusus manager/pemilik',
      icon: LineChartIcon,
      tone: 'violet' as const,
    },
    {
      label: 'Laba Minggu Ini',
      value: formatRupiah(summary.weeklyProfit ?? 0),
      helper: 'Khusus manager/pemilik',
      icon: LineChartIcon,
      tone: 'violet' as const,
    },
    {
      label: 'Laba Bulan Ini',
      value: formatRupiah(summary.monthlyProfit ?? 0),
      helper: 'Khusus manager/pemilik',
      icon: LineChartIcon,
      tone: 'violet' as const,
    },
    {
      label: 'Laba Tahun Ini',
      value: formatRupiah(summary.yearlyProfit ?? 0),
      helper: 'Khusus manager/pemilik',
      icon: LineChartIcon,
      tone: 'violet' as const,
    },
  ];
  const visibleCards = canViewFinancials
    ? [cards[0], ...financialCards, ...cards.slice(1)].filter(
        (card): card is NonNullable<typeof card> => Boolean(card),
      )
    : cards;

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {visibleCards.map((card) => {
        const Icon = card.icon;
        const toneClasses = summaryToneClasses[card.tone];
        return (
          <Card
            key={card.label}
            className={`min-h-32 border-l-4 ${toneClasses.border}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <p className="mt-3 text-2xl font-bold leading-tight text-slate-950">
                  {card.value}
                </p>
                <p className="mt-2 text-xs text-slate-500">{card.helper}</p>
              </div>
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${toneClasses.icon}`}
              >
                <Icon size={20} />
              </div>
            </div>
          </Card>
        );
      })}
    </section>
  );
}

function TrendChartGrid({
  canViewFinancials,
  profitError,
  profitLoading,
  profitTrend,
  revenueError,
  revenueLoading,
  revenueTrend,
  onRetryProfit,
  onRetryRevenue,
}: {
  canViewFinancials: boolean;
  profitError: boolean;
  profitLoading: boolean;
  profitTrend: DashboardTrendPoint[];
  revenueError: boolean;
  revenueLoading: boolean;
  revenueTrend: DashboardTrendPoint[];
  onRetryProfit: () => void;
  onRetryRevenue: () => void;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <TrendChart
        dataKey="revenue"
        description="Omzet bersih tujuh hari terakhir setelah koreksi retur."
        isError={revenueError}
        isLoading={revenueLoading}
        items={revenueTrend}
        onRetry={onRetryRevenue}
        title="Tren Omzet 7 Hari"
      />
      {canViewFinancials ? (
        <TrendChart
          dataKey="profit"
          description="Laba bersih tujuh hari terakhir dari detail transaksi historis."
          isError={profitError}
          isLoading={profitLoading}
          items={profitTrend}
          onRetry={onRetryProfit}
          title="Tren Laba 7 Hari"
        />
      ) : null}
    </section>
  );
}

function TrendChart({
  dataKey,
  description,
  isError,
  isLoading,
  items,
  onRetry,
  title,
}: {
  dataKey: 'revenue' | 'profit';
  description: string;
  isError: boolean;
  isLoading: boolean;
  items: DashboardTrendPoint[];
  onRetry: () => void;
  title: string;
}) {
  const data = items.map((item) => ({
    ...item,
    dateLabel: formatDate(item.date),
  }));
  const color = dataKey === 'revenue' ? '#059669' : '#2563eb';
  const total = data.reduce(
    (sum, item) => sum + Number((item as Record<string, unknown>)[dataKey] ?? 0),
    0,
  );

  return (
    <Card>
      <SectionTitle
        icon={Activity}
        title={title}
        description={description}
      />
      {isLoading ? (
        <ChartSkeleton />
      ) : isError ? (
        <div className="mt-4">
          <DashboardSectionError onRetry={onRetry} />
        </div>
      ) : data.length && total !== 0 ? (
        <div>
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-xs font-medium uppercase text-slate-500">
              Total 7 hari
            </div>
            <div className="mt-1 text-lg font-bold text-slate-950">
              {formatRupiah(total)}
            </div>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id={dataKey} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.22} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => formatRupiah(Number(value))}
                  tickLine={false}
                  width={56}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatRupiah(Number(value)),
                    name === 'revenue' ? 'Omzet bersih' : 'Laba bersih',
                  ]}
                  labelFormatter={(label) => `Tanggal ${label}`}
                />
                <Area
                  dataKey={dataKey}
                  fill={`url(#${dataKey})`}
                  name={dataKey === 'revenue' ? 'Omzet bersih' : 'Laba bersih'}
                  stroke={color}
                  strokeWidth={2}
                  type="monotone"
                />
                <Line
                  dataKey={dataKey}
                  dot={false}
                  name={dataKey === 'revenue' ? 'Omzet bersih' : 'Laba bersih'}
                  stroke={color}
                  strokeWidth={2}
                  type="monotone"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <DashboardEmptyState
            title={`${title} kosong`}
            message="Grafik akan terisi setelah backend memiliki data pada periode ini."
          />
        </div>
      )}
    </Card>
  );
}

function LowStockSection({
  canViewStockAction,
  isError,
  isLoading,
  items,
  onRetry,
}: {
  canViewStockAction: boolean;
  isError: boolean;
  isLoading: boolean;
  items: LowStockProduct[];
  onRetry: () => void;
}) {
  return (
    <Card>
      <SectionTitle
        icon={PackageSearch}
        title="Stok Kritis"
        description="Produk dengan stok tersedia <= stok minimum."
      />
      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <div className="mt-4">
          <DashboardSectionError onRetry={onRetry} />
        </div>
      ) : items.length ? (
        <div className="mt-4">
          <ResponsiveDataView<LowStockProduct>
            data={items.slice(0, 8)}
            columns={[
              {
                key: 'productName',
                header: 'Produk',
                render: (row) => (
                  <div>
                    <div className="font-medium text-slate-900">{row.productName}</div>
                    <div className="text-xs text-slate-500">{row.baseUnitName}</div>
                  </div>
                ),
              },
              {
                key: 'baseUnitName',
                header: 'Satuan dasar',
              },
              {
                key: 'currentStockBase',
                header: 'Stok saat ini',
                render: (row) => formatQty(row.currentStockBase, row.baseUnitName),
              },
              {
                key: 'minimumStockBase',
                header: 'Minimum',
                render: (row) => formatQty(row.minimumStockBase, row.baseUnitName),
              },
              {
                key: 'shortage',
                header: 'Selisih',
                render: (row) => formatQty(row.shortage, row.baseUnitName),
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => <StockStatusBadge item={row} />,
              },
              ...(canViewStockAction
                ? [
                    {
                      key: 'action',
                      header: 'Aksi',
                      render: (row: LowStockProduct) => (
                        <Link
                          className="font-semibold text-emerald-700 hover:text-emerald-800"
                          to={`/stok?productId=${row.productId}`}
                        >
                          Lihat stok
                        </Link>
                      ),
                    },
                  ]
                : []),
            ]}
            getCardTitle={(row) => row.productName}
            getCardSubtitle={(row) => row.baseUnitName}
            getCardRows={(row) => [
              {
                label: 'Stok saat ini',
                value: formatQty(row.currentStockBase, row.baseUnitName),
              },
              {
                label: 'Minimum',
                value: formatQty(row.minimumStockBase, row.baseUnitName),
              },
              {
                label: 'Selisih',
                value: formatQty(row.shortage, row.baseUnitName),
              },
              { label: 'Status', value: <StockStatusBadge item={row} /> },
              ...(canViewStockAction
                ? [
                    {
                      label: 'Aksi',
                      value: (
                        <Link
                          className="font-semibold text-emerald-700 hover:text-emerald-800"
                          to={`/stok?productId=${row.productId}`}
                        >
                          Lihat stok
                        </Link>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      ) : (
        <div className="mt-4">
          <DashboardEmptyState
            title="Tidak ada produk dengan stok rendah."
            message="Semua stok aktif masih berada di atas batas minimum."
          />
        </div>
      )}
    </Card>
  );
}

function ExpiredBatchSection({
  isError,
  isLoading,
  items,
  onRetry,
}: {
  isError: boolean;
  isLoading: boolean;
  items: ExpiringBatchItem[];
  onRetry: () => void;
}) {
  return (
    <Card>
      <SectionTitle
        icon={AlertTriangle}
        title="Batch Mendekati Expired"
        description="Batch aktif dengan stok tersisa dan masa expired dekat."
      />
      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <div className="mt-4">
          <DashboardSectionError onRetry={onRetry} />
        </div>
      ) : items.length ? (
        <div className="mt-4">
          <ResponsiveDataView<ExpiringBatchItem>
            data={items.slice(0, 8)}
            columns={[
              {
                key: 'productName',
                header: 'Produk',
                render: (row) => (
                  <div>
                    <div className="font-medium text-slate-900">{row.productName}</div>
                    <div className="text-xs text-slate-500">{row.baseUnitName}</div>
                  </div>
                ),
              },
              { key: 'batchNumber', header: 'No. batch' },
              {
                key: 'expiredDate',
                header: 'Expired',
                render: (row) => formatDate(row.expiredDate),
              },
              {
                key: 'daysRemaining',
                header: 'Sisa hari',
                render: (row) => formatNumber(row.daysRemaining),
              },
              {
                key: 'currentStockBase',
                header: 'Stok batch',
                render: (row) =>
                  formatQty(row.currentStockBase, row.baseUnitName),
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => <ExpiredStatusBadge status={row.status} />,
              },
            ]}
            getCardTitle={(row) => row.productName}
            getCardSubtitle={(row) => `${row.baseUnitName} - Batch ${row.batchNumber}`}
            getCardRows={(row) => [
              { label: 'Expired', value: formatDate(row.expiredDate) },
              { label: 'Sisa hari', value: formatNumber(row.daysRemaining) },
              {
                label: 'Stok batch',
                value: formatQty(row.currentStockBase, row.baseUnitName),
              },
              { label: 'Status', value: <ExpiredStatusBadge status={row.status} /> },
            ]}
          />
        </div>
      ) : (
        <div className="mt-4">
          <DashboardEmptyState
            title="Tidak ada batch yang mendekati expired."
            message="Belum ada batch aktif yang masuk periode alert."
          />
        </div>
      )}
    </Card>
  );
}

function RecentTransactionSection({
  isError,
  isLoading,
  items,
  onRetry,
}: {
  isError: boolean;
  isLoading: boolean;
  items: LatestSaleItem[];
  onRetry: () => void;
}) {
  return (
    <Card>
      <SectionTitle
        icon={ReceiptText}
        title="Transaksi Terbaru"
        description="Daftar transaksi penjualan terakhir dari backend."
      />
      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <div className="mt-4">
          <DashboardSectionError onRetry={onRetry} />
        </div>
      ) : items.length ? (
        <div className="mt-4">
          <ResponsiveDataView<LatestSaleItem>
            data={items}
            columns={[
              {
                key: 'saleTime',
                header: 'Waktu',
                render: (row) => formatDateTimeWita(row.saleTime),
              },
              {
                key: 'saleNumber',
                header: 'No. transaksi',
                render: (row) => (
                  <span className="font-medium text-slate-900">{row.saleNumber}</span>
                ),
              },
              {
                key: 'cashierName',
                header: 'Kasir',
                render: (row) => row.cashierName,
              },
              {
                key: 'paymentMethod',
                header: 'Bayar',
              },
              {
                key: 'total',
                header: 'Total',
                render: (row) => formatRupiah(row.total),
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => <Badge tone="emerald">{row.status}</Badge>,
              },
            ]}
            getCardTitle={(row) => row.saleNumber}
            getCardSubtitle={(row) => formatDateTimeWita(row.saleTime)}
            getCardRows={(row) => [
              { label: 'Kasir', value: row.cashierName },
              { label: 'Bayar', value: row.paymentMethod },
              { label: 'Total', value: formatRupiah(row.total) },
              { label: 'Status', value: <Badge tone="emerald">{row.status}</Badge> },
            ]}
          />
        </div>
      ) : (
        <div className="mt-4">
          <DashboardEmptyState
            title="Belum ada transaksi terbaru."
            message="Transaksi terbaru akan tampil setelah checkout berhasil."
          />
        </div>
      )}
    </Card>
  );
}

function PurchaseSummarySection({
  isError,
  isLoading,
  onRetry,
  summary,
}: {
  isError: boolean;
  isLoading: boolean;
  onRetry: () => void;
  summary: PurchaseOrderSummary | undefined;
}) {
  const hasActivePurchaseOrder = Boolean(
    summary &&
      (summary.draft > 0 ||
        summary.sent > 0 ||
        summary.partiallyReceived > 0 ||
        summary.received > 0 ||
        (summary.cancelled ?? 0) > 0 ||
        (summary.todayPurchases ?? 0) > 0),
  );
  const cards = [
    {
      label: 'PO Draft',
      value: summary?.draft ?? 0,
    },
    {
      label: 'PO Terkirim / Menunggu',
      value: summary?.sent ?? 0,
    },
    {
      label: 'PO Sebagian Diterima',
      value: summary?.partiallyReceived ?? 0,
    },
    {
      label: 'PO Selesai',
      value: summary?.received ?? 0,
    },
    {
      label: 'Pembelian Hari Ini',
      value: summary?.todayPurchases ?? 0,
    },
  ];

  return (
    <Card>
      <SectionTitle
        icon={ClipboardList}
        title="PO dan Pembelian"
        description="PO adalah rencana pemesanan; stok hanya bertambah setelah pembelian final."
      />
      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <div className="mt-4">
          <DashboardSectionError onRetry={onRetry} />
        </div>
      ) : hasActivePurchaseOrder ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {cards.map((item) => (
            <MetricPill key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <DashboardEmptyState
            title="Belum ada pemesanan aktif."
            message="Ringkasan PO akan tampil setelah pemesanan tercatat."
          />
        </div>
      )}
    </Card>
  );
}

function ServiceSummarySection({
  isError,
  isLoading,
  onRetry,
  summary,
}: {
  isError: boolean;
  isLoading: boolean;
  onRetry: () => void;
  summary: PrescriptionSummary | undefined;
}) {
  const hasActivePrescription = Boolean(
    summary && (summary.newPrescription > 0 || summary.readyForPayment > 0),
  );
  const cards = [
    {
      label: 'Resep Baru',
      value: summary?.newPrescription ?? 0,
    },
    {
      label: 'Resep Siap Bayar',
      value: summary?.readyForPayment ?? 0,
    },
    {
      label: 'Resep Selesai',
      value: summary?.completed ?? 0,
    },
    {
      label: 'Konseling Hari Ini',
      value: summary?.todayCounseling ?? 0,
    },
  ];

  return (
    <Card>
      <SectionTitle
        icon={Stethoscope}
        title="Resep dan Konseling"
        description="Resep dan konseling tidak mengurangi stok sebelum checkout kasir berhasil."
      />
      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <div className="mt-4">
          <DashboardSectionError onRetry={onRetry} />
        </div>
      ) : hasActivePrescription ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {cards.map((item) => (
            <MetricPill key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <DashboardEmptyState
            title="Belum ada resep aktif."
            message="Ringkasan resep akan tampil setelah pelayanan resep tercatat."
          />
        </div>
      )}
    </Card>
  );
}

function AuditLogSection({
  isError,
  isLoading,
  items,
  onRetry,
}: {
  isError: boolean;
  isLoading: boolean;
  items: RecentActivity[];
  onRetry: () => void;
}) {
  return (
    <Card>
      <SectionTitle
        icon={History}
        title="Aktivitas Terakhir"
        description="Maksimal lima aktivitas audit terbaru dari backend."
      />
      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <div className="mt-4">
          <DashboardSectionError onRetry={onRetry} />
        </div>
      ) : items.length ? (
        <div className="mt-4">
          <ResponsiveDataView<RecentActivity>
            data={items}
            columns={[
              {
                key: 'createdAt',
                header: 'Waktu',
                render: (row) => formatDateTimeWita(row.createdAt),
              },
              {
                key: 'actorName',
                header: 'User',
                render: (row) => row.actorName,
              },
              { key: 'action', header: 'Aksi' },
              { key: 'entityType', header: 'Entitas' },
              {
                key: 'summary',
                header: 'Ringkasan perubahan',
                render: (row) => row.summary,
              },
            ]}
            getCardTitle={(row) => row.action}
            getCardSubtitle={(row) => formatDateTimeWita(row.createdAt)}
            getCardRows={(row) => [
              { label: 'User', value: row.actorName },
              { label: 'Entitas', value: row.entityType },
              { label: 'Ringkasan', value: row.summary },
            ]}
          />
        </div>
      ) : (
        <div className="mt-4">
          <DashboardEmptyState
            title="Belum ada aktivitas terbaru."
            message="Audit log akan tampil setelah backend mencatat aktivitas penting."
          />
        </div>
      )}
    </Card>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-sm font-medium text-slate-600">{label}</div>
      <div className="mt-2 text-2xl font-bold leading-tight text-slate-950">
        {formatNumber(value)}
      </div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ size?: number }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-700">
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
    </div>
  );
}

function StockStatusBadge({ item }: { item: LowStockProduct }) {
  if (item.status === 'HABIS') return <Badge tone="red">Habis</Badge>;
  if (item.status === 'RENDAH') return <Badge tone="amber">Rendah</Badge>;
  return <Badge tone="emerald">Aman</Badge>;
}

function ExpiredStatusBadge({ status }: { status: ExpiringBatchItem['status'] }) {
  if (status === 'EXPIRED') return <Badge tone="red">Expired</Badge>;
  if (status === 'KRITIS') return <Badge tone="red">Kritis</Badge>;
  if (status === 'WASPADA') return <Badge tone="amber">Waspada</Badge>;
  return <Badge tone="emerald">Aman</Badge>;
}
