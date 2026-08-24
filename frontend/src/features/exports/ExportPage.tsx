import { Download } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { Input } from '../../shared/components/Input';
import { useToastStore } from '../../shared/components/toast.store';
import { downloadReport, type ExportFormat, type ExportKind } from './export.api';

const reportKinds: Array<{ value: ExportKind; label: string }> = [
  { value: 'sales', label: 'Laporan Penjualan' },
  { value: 'profit', label: 'Laporan Laba' },
];

const formats: Array<{ value: ExportFormat; label: string }> = [
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'pdf', label: 'PDF' },
];

export function ExportPage() {
  const showToast = useToastStore((state) => state.show);
  const [kind, setKind] = useState<ExportKind>('sales');
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (startDate && endDate && startDate > endDate) {
      showToast('Tanggal awal harus sebelum tanggal akhir.');
      return;
    }

    try {
      setIsDownloading(true);
      await downloadReport(kind, format, { startDate, endDate });
      showToast('File export mulai diunduh.');
    } catch (err) {
      showToast((err as Error).message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Export</h1>
        <p className="mt-1 text-sm text-slate-600">
          Unduh laporan penjualan dan laba dari data historis transaksi backend.
        </p>
      </div>

      <Card>
        <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Export memakai data laporan dari backend. Kasir tidak memiliki akses ke
          halaman ini, sehingga laporan laba dan HPP tetap aman.
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Jenis laporan</span>
            <select className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={kind} onChange={(event) => setKind(event.target.value as ExportKind)}>
              {reportKinds.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Format</span>
            <select className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={format} onChange={(event) => setFormat(event.target.value as ExportFormat)}>
              {formats.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <Input label="Tanggal awal" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          <Input label="Tanggal akhir" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </div>
        <div className="mt-5">
          <Button type="button" onClick={handleDownload} disabled={isDownloading}>
            <Download size={16} />
            {isDownloading ? 'Mengunduh...' : 'Download Export'}
          </Button>
          <p className="mt-2 text-xs text-slate-500">
            Kosongkan tanggal untuk mengunduh seluruh data yang tersedia.
          </p>
        </div>
      </Card>
    </div>
  );
}
