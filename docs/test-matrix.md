# Test Matrix - POS Apotek V2

## Kebijakan Sesi

Sesi implementasi harian hanya menjalankan validasi ringan:

```powershell
npm.cmd --prefix frontend run build
git diff --check
```

Backend regression, Docker build, E2E, dan backup/restore penuh dijalankan hanya pada sesi testing/deployment khusus.

## Backend Regression

- Auth, refresh token, inactive user, dan RBAC.
- Products, categories, suppliers, units, dan product units.
- Batch, batch prices, purchase orders, dan purchases.
- PO tidak mengubah stok.
- Pembelian final menambah stok via transaksi database.
- Sales checkout memakai FEFO server-side.
- Split batch allocation tersimpan.
- Idempotency checkout, purchase, return, dan stock adjustment.
- Retur penjualan dan retur pembelian mengacu transaksi asal.
- Reports memakai histori detail transaksi.
- Cashier response tidak memuat HPP, laba, margin, atau harga beli.
- Concurrent sale tidak membuat stok batch negatif.

## Manual Smoke

### Manager

- Login.
- Dashboard.
- Master data.
- PO dan pembelian.
- Batch, stok, dan mutasi.
- Retur pembelian.
- Laporan penjualan dan laba.
- Export XLSX/PDF.
- Users, settings, dan audit log.

### Apoteker

- Login.
- Buat resep.
- Mark ready.
- Cancel resep.
- Buat catatan konseling.
- Pastikan resep tidak mengurangi stok sebelum checkout.

### Kasir

- Login.
- Checkout produk reguler.
- Checkout resep siap bayar.
- Riwayat transaksi.
- Retur penjualan.
- Pastikan endpoint dan UI sensitif Manager ditolak.
- Pastikan response kasir tidak berisi HPP, laba, margin, atau harga beli.

## Docker Full Local Mode

```powershell
docker compose -f docker-compose.local.yml config
docker compose -f docker-compose.local.yml up -d
Invoke-RestMethod http://localhost/api/health
docker compose -f docker-compose.local.yml ps
```

Acceptance:

- frontend expose `80`;
- backend `3000` internal;
- PostgreSQL `5432` internal;
- frontend memakai `/api`;
- tidak ada URL cloud atau IP lokal hardcode di source.

## Backup dan Restore

- Jalankan `scripts\backup-db.bat`.
- Pastikan file `.sql` terbentuk.
- Restore hanya ke database/volume test bersih.
- Jangan menghapus volume database aktif tanpa persetujuan eksplisit.
