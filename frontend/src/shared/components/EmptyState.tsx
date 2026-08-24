import { Card } from './Card';

export function EmptyState({
  title = 'Data kosong',
  message = 'Belum ada data yang bisa ditampilkan.',
}: {
  title?: string;
  message?: string;
}) {
  return (
    <Card className="text-center">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{message}</p>
    </Card>
  );
}
