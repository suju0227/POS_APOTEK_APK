import { useState } from 'react';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { DataTable } from '../../shared/components/DataTable';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { Input } from '../../shared/components/Input';
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton';
import { useToastStore } from '../../shared/components/toast.store';
import { formatDateTimeWita } from '../../shared/utils/formatters';
import { useCreateCounselingRecord, useCounselingRecords } from './counseling.hooks';
import type { CounselingRecord, CreateCounselingPayload } from './counseling.types';

export function CounselingPage() {
  const { data = [], isLoading, error } = useCounselingRecords();
  const createRecord = useCreateCounselingRecord();
  const showToast = useToastStore((state) => state.show);
  const [form, setForm] = useState<CreateCounselingPayload>({
    patientName: '',
    prescriptionId: '',
    saleId: '',
    counselingDate: new Date().toISOString().slice(0, 16),
    educationSummary: '',
    note: '',
  });

  const handleSubmit = async () => {
    if (!form.educationSummary.trim()) {
      showToast('Ringkasan edukasi wajib diisi.');
      return;
    }

    try {
      await createRecord.mutateAsync({
        patientName: form.patientName?.trim() || undefined,
        prescriptionId: form.prescriptionId?.trim() || undefined,
        saleId: form.saleId?.trim() || undefined,
        counselingDate: form.counselingDate || undefined,
        educationSummary: form.educationSummary.trim(),
        note: form.note?.trim() || undefined,
      });
      setForm({
        patientName: '',
        prescriptionId: '',
        saleId: '',
        counselingDate: new Date().toISOString().slice(0, 16),
        educationSummary: '',
        note: '',
      });
      showToast('Catatan konseling berhasil disimpan.');
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  if (isLoading) return <LoadingSkeleton rows={5} />;
  if (error) return <ErrorState message={(error as Error).message} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Konseling</h1>
        <p className="mt-1 text-sm text-slate-600">
          Catatan konseling tidak membuat tagihan dan tidak mengubah stok.
        </p>
      </div>

      <Card>
        <h2 className="text-base font-semibold text-slate-950">Catat Konseling</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Input label="Nama pasien" value={form.patientName ?? ''} onChange={(event) => setForm({ ...form, patientName: event.target.value })} />
          <Input label="ID resep opsional" value={form.prescriptionId ?? ''} onChange={(event) => setForm({ ...form, prescriptionId: event.target.value })} />
          <Input label="ID transaksi opsional" value={form.saleId ?? ''} onChange={(event) => setForm({ ...form, saleId: event.target.value })} />
          <Input label="Waktu konseling" type="datetime-local" value={form.counselingDate ?? ''} onChange={(event) => setForm({ ...form, counselingDate: event.target.value })} />
          <Input label="Ringkasan edukasi" value={form.educationSummary} onChange={(event) => setForm({ ...form, educationSummary: event.target.value })} />
          <Input label="Catatan" value={form.note ?? ''} onChange={(event) => setForm({ ...form, note: event.target.value })} />
        </div>
        <div className="mt-4">
          <Button type="button" onClick={handleSubmit} disabled={createRecord.isPending}>
            {createRecord.isPending ? 'Menyimpan...' : 'Simpan Konseling'}
          </Button>
        </div>
      </Card>

      {!data.length ? (
        <EmptyState title="Belum ada catatan konseling" />
      ) : (
        <DataTable<CounselingRecord & Record<string, unknown>>
          data={data as (CounselingRecord & Record<string, unknown>)[]}
          columns={[
            { key: 'patientName', header: 'Pasien', render: (row) => row.patientName ?? '-' },
            { key: 'counselingDate', header: 'Waktu', render: (row) => formatDateTimeWita(row.counselingDate) },
            { key: 'educationSummary', header: 'Ringkasan' },
            { key: 'prescriptionNumber', header: 'Resep', render: (row) => row.prescriptionNumber ?? '-' },
            { key: 'saleNumber', header: 'Transaksi', render: (row) => row.saleNumber ?? '-' },
            { key: 'pharmacist', header: 'Petugas', render: (row) => row.pharmacist.name },
          ]}
        />
      )}
    </div>
  );
}
