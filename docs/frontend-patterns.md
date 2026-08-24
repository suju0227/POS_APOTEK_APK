# Frontend Patterns - POS Apotek V2

## Stack

- React + Vite + TypeScript
- Tailwind CSS + shadcn/ui style conventions
- TanStack Query untuk server state
- Zustand untuk local UI/session state
- React Hook Form + Zod bila form membutuhkan validasi kompleks

## Struktur Feature

Gunakan pola:

```text
frontend/src/features/<feature>/
  <feature>.api.ts
  <feature>.hooks.ts
  <feature>.types.ts
  <FeaturePage>.tsx
```

Route didaftarkan di `frontend/src/app/App.tsx`. Menu sidebar didaftarkan di `frontend/src/app/layout/AppShell.tsx` hanya bila halaman memang perlu terlihat pada role tersebut.

## API

- Semua request memakai `apiClient`.
- Path API relatif terhadap `VITE_API_BASE_URL`.
- Local production memakai `VITE_API_BASE_URL=/api`.
- Jangan hardcode URL cloud, `localhost:3000`, atau IP LAN di source code.
- API JSON memakai camelCase.

## Role UI

- Manager: dashboard, master data, pembelian, stok, laporan, export, users, settings, audit log.
- Apoteker: pelayanan resep dan konseling.
- Kasir: kasir, riwayat transaksi, retur penjualan.

Frontend boleh menyembunyikan menu berdasarkan role, tetapi backend tetap wajib menolak akses langsung ke endpoint sensitif.

## Guardrail Tampilan

- Frontend hanya menghitung estimasi subtotal, diskon, total, kembalian, dan tampilan stok.
- Frontend tidak menentukan stok final, FEFO, HPP, laba, diskon alokasi final, retur, atau mutasi stok.
- Jangan menyimpan transaksi final di localStorage.
- Kasir tidak boleh menerima atau melihat HPP, laba, margin, harga beli, laporan laba, pembelian supplier, koreksi stok, atau price setting.

## State UI

Setiap halaman data harus memiliki:

- loading state;
- empty state;
- error state;
- feedback sukses/gagal yang ramah operator;
- validasi input sebelum submit jika ada risiko salah operasi.
