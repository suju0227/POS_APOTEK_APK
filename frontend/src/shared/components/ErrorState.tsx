import { Card } from './Card';

export function ErrorState({
  title = 'Terjadi kesalahan',
  message = 'Silakan ulangi beberapa saat lagi.',
}: {
  title?: string;
  message?: string;
}) {
  return (
    <Card className="border-red-200 bg-red-50">
      <h2 className="text-base font-semibold text-red-900">{title}</h2>
      <p className="mt-1 text-sm text-red-700">{message}</p>
    </Card>
  );
}
