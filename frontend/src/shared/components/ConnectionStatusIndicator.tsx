import { Wifi, WifiOff } from 'lucide-react';
import type { ConnectionStatus } from '../hooks/useConnectionStatus';

export function ConnectionStatusIndicator({
  status,
}: {
  status: ConnectionStatus;
}) {
  const isOnline = status === 'online';
  const isChecking = status === 'checking';
  const Icon = isOnline ? Wifi : WifiOff;
  const label = isChecking
    ? 'Memeriksa koneksi'
    : isOnline
      ? 'Terhubung ke server'
      : 'Koneksi server bermasalah';

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold ${
        isChecking
          ? 'border-slate-200 bg-slate-50 text-slate-600'
          : isOnline
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-red-200 bg-red-50 text-red-700'
      }`}
      title={
        isOnline
          ? 'Backend lokal dapat dijangkau.'
          : 'Koneksi ke server lokal terputus. Periksa Wi-Fi/LAN atau pastikan PC server masih menyala.'
      }
    >
      <Icon size={14} />
      <span>{label}</span>
    </div>
  );
}
