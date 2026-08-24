import { Button } from '../../shared/components/Button';
import type { Pagination, ReportFilters } from './report.types';

export function ReportPagination({
  pagination,
  filters,
  onChange,
}: {
  pagination: Pagination;
  filters: ReportFilters;
  onChange: (filters: ReportFilters) => void;
}) {
  const previousDisabled = pagination.page <= 1;
  const nextDisabled =
    pagination.totalPages === 0 || pagination.page >= pagination.totalPages;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <span>
        Halaman {pagination.page} dari {Math.max(pagination.totalPages, 1)} ·{' '}
        {pagination.total} data
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={previousDisabled}
          onClick={() => onChange({ ...filters, page: pagination.page - 1 })}
        >
          Sebelumnya
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={nextDisabled}
          onClick={() => onChange({ ...filters, page: pagination.page + 1 })}
        >
          Berikutnya
        </Button>
      </div>
    </div>
  );
}
