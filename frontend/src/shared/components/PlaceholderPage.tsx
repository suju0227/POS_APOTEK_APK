import { Card } from './Card';

export function PlaceholderPage({
  title,
  description = 'Halaman ini sudah terdaftar di routing dan siap dihubungkan ke API backend.',
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">{title}</h1>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      <Card>
        <p className="text-sm text-slate-600">
          Fondasi frontend sudah menyiapkan guard role, layout, dan navigasi untuk
          modul ini.
        </p>
      </Card>
    </div>
  );
}
