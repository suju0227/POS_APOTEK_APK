# Checklist Sesi Testing - POS Apotek

## 1. Prinsip

Checklist ini dipakai saat user secara eksplisit membuka sesi testing. Jangan menjalankan regression backend, Docker build, E2E, atau backup/restore penuh pada sesi implementasi harian.

## 2. Validasi Ringan Sebelum Commit

- [ ] `npm.cmd --prefix frontend run build`
- [ ] `git diff --check`
- [ ] Tidak ada perubahan Docker jika sesi bukan deployment.
- [ ] Tidak ada transaksi final disimpan di localStorage.

## 3. Smoke Manual Role

### Manager

- [ ] Login Manager berhasil.
- [ ] Dashboard terbuka.
- [ ] Produk, kategori, supplier, satuan, batch dapat dibuka.
- [ ] Pembelian manual dapat dibuat pada data test.
- [ ] PO dapat dibuat dan dikonversi ke pembelian.
- [ ] Stok dan mutasi stok berubah sesuai transaksi test.
- [ ] Retur pembelian mengurangi stok batch yang benar.
- [ ] Laporan penjualan dan laba terbuka.
- [ ] Export XLSX/PDF berhasil diunduh.
- [ ] Users dapat create, ubah role, aktif/nonaktif.
- [ ] Settings dapat disimpan.
- [ ] Audit log menampilkan aktivitas terbaru.

### Apoteker

- [ ] Login Apoteker berhasil.
- [ ] Buat resep dasar.
- [ ] Resep tidak mengurangi stok saat dibuat.
- [ ] Mark ready membuat resep muncul di kasir.
- [ ] Cancel resep mencegah resep ditarik kasir.
- [ ] Catatan konseling dapat dibuat.

### Kasir

- [ ] Login Kasir berhasil.
- [ ] Produk kasir tampil tanpa HPP, laba, margin, atau harga beli.
- [ ] Checkout produk berhasil.
- [ ] Checkout resep siap bayar berhasil.
- [ ] Stok baru berkurang setelah checkout sukses.
- [ ] Riwayat transaksi terbuka.
- [ ] Retur penjualan dengan referensi transaksi asal berhasil pada data test.
- [ ] Akses langsung ke laporan laba, pembelian, stok adjustment, users, settings, dan audit log ditolak.

## 4. Backend Regression

- [ ] Auth, refresh token, user inactive, dan RBAC.
- [ ] Master data produk, satuan, product unit.
- [ ] Batch dan batch unit price.
- [ ] Purchase order tidak mengubah stok.
- [ ] Pembelian menambah stok via transaksi database.
- [ ] Sales FEFO dan split batch allocation.
- [ ] Idempotency checkout.
- [ ] Retur penjualan dan retur pembelian dengan referensi asal.
- [ ] Reports menggunakan histori transaction detail.
- [ ] Kasir tidak menerima HPP, profit, margin, atau purchase price.
- [ ] Concurrent sale tidak membuat stok negatif.

## 5. Docker Full Local Mode

- [ ] `docker compose -f docker-compose.local.yml config`
- [ ] `docker compose -f docker-compose.local.yml up -d`
- [ ] `Invoke-RestMethod http://localhost/api/health`
- [ ] Hanya frontend expose port `80`.
- [ ] Backend `3000` dan PostgreSQL `5432` tetap internal.
- [ ] Frontend memakai `/api`, bukan URL cloud, `localhost:3000`, atau IP lokal hardcode.

## 6. Backup dan Restore

- [ ] Jalankan `scripts\backup-db.bat`.
- [ ] File `.sql` terbentuk di folder backup.
- [ ] Restore diuji hanya pada database/volume test bersih.
- [ ] Jangan menjalankan `docker compose down -v` pada volume aktif kecuali reset data memang diminta eksplisit.

## 7. Kriteria Lulus Sesi Testing

- [ ] Semua role menjalankan alur utama sesuai kewenangan.
- [ ] Backend tetap menjadi sumber kebenaran stok, batch, FEFO, HPP, laba, retur, diskon alokasi, dan mutasi stok.
- [ ] Tidak ada stok batch negatif.
- [ ] Tidak ada data sensitif Manager muncul pada kasir.
- [ ] Backup dapat dibuat dan restore test terbukti.
- [ ] Docker Full Local Mode sehat untuk akses `http://localhost` dan LAN.
