import type { ReactNode } from 'react';
import { DataTable } from './DataTable';

type Column<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
};

type ResponsiveDataViewProps<T extends object> = {
  columns: Column<T>[];
  data: T[];
  getCardRows: (row: T) => Array<{ label: string; value: ReactNode }>;
  getCardSubtitle?: (row: T) => ReactNode;
  getCardTitle: (row: T) => ReactNode;
};

export function ResponsiveDataView<T extends object>({
  columns,
  data,
  getCardRows,
  getCardSubtitle,
  getCardTitle,
}: ResponsiveDataViewProps<T>) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {data.map((row, index) => (
          <article
            key={index}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="font-semibold text-slate-950">{getCardTitle(row)}</div>
            {getCardSubtitle ? (
              <div className="mt-1 text-xs text-slate-500">
                {getCardSubtitle(row)}
              </div>
            ) : null}
            <dl className="mt-3 grid gap-2 text-sm">
              {getCardRows(row).map((item) => (
                <div
                  key={item.label}
                  className="flex items-start justify-between gap-4"
                >
                  <dt className="text-slate-500">{item.label}</dt>
                  <dd className="text-right font-medium text-slate-800">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
      <div className="hidden md:block">
        <DataTable<T> columns={columns} data={data} />
      </div>
    </>
  );
}
