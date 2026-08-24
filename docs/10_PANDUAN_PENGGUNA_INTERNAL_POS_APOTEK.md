# Panduan Pengguna Internal - POS Apotek

## 1. Tujuan

Panduan ini dipakai operator internal apotek untuk menjalankan POS Apotek V1. Sistem dirancang agar transaksi final, stok batch, FEFO, HPP, laba, retur, dan mutasi stok tetap diproses oleh backend.

## 2. Role Pengguna

| Role | Fokus Kerja | Batasan Penting |
|---|---|---|
| `KASIR` | Penjualan produk, menarik resep siap bayar, riwayat transaksi, retur penjualan. | Tidak boleh melihat HPP, laba, margin, harga beli, pembelian, koreksi stok, laporan laba, users, settings, atau audit log. |
| `APOTEKER` | Membuat resep dasar dan catatan konseling. | Resep belum mengurangi stok sampai ditarik kasir dan checkout berhasil. |
| `MANAGER` | Master data, pembelian, stok, retur pembelian, laporan, export, users, settings, audit log. | Bertanggung jawab memastikan harga jual, batch, expiry, dan akses user benar. |

## 3. Alur Manager

1. Login sebagai Manager.
2. Lengkapi master data:
   - kategori;
   - supplier;
   - satuan;
   - produk;
   - satuan jual aktif per produk.
3. Catat pembelian supplier melalui `/pembelian` atau konversi dari `/pemesanan`.
4. Pastikan batch, tanggal expired, harga beli, dan harga jual manual benar.
5. Pantau stok melalui `/stok`, `/batch`, dan `/mutasi-stok`.
6. Gunakan `/retur-pembelian` untuk retur ke supplier berdasarkan batch asal.
7. Cek dashboard dan laporan:
   - `/dashboard`;
   - `/laporan/penjualan`;
   - `/laporan/laba`;
   - `/export`.
8. Kelola akun melalui `/users`.
9. Kelola profil apotek melalui `/settings`.
10. Pantau aktivitas penting melalui `/audit-log`.

## 4. Alur Apoteker

1. Login sebagai Apoteker.
2. Buka `/pelayanan/resep`.
3. Buat resep dasar dengan item produk, satuan, jumlah, dan aturan pakai.
4. Tandai resep sebagai siap bayar jika sudah selesai disiapkan.
5. Jika resep batal, gunakan aksi cancel.
6. Catat konseling pasien di `/pelayanan/konseling` jika diperlukan.

Catatan: resep bukan transaksi final dan tidak mengurangi stok sebelum kasir melakukan checkout.

## 5. Alur Kasir

1. Login sebagai Kasir.
2. Buka `/kasir`.
3. Cari produk dari daftar produk kasir yang sudah disediakan backend.
4. Tambahkan item ke keranjang dan periksa estimasi subtotal, diskon, total, dan kembalian.
5. Untuk resep, pilih resep siap bayar dari daftar yang tersedia di kasir.
6. Submit checkout. Backend akan menentukan stok final, FEFO, split batch, HPP internal, laba, dan mutasi stok.
7. Cek transaksi di `/riwayat-transaksi`.
8. Gunakan `/retur-penjualan` untuk retur dengan referensi transaksi asal.

Catatan: kasir tidak boleh membuat transaksi final di luar backend dan tidak boleh menyimpan transaksi final di browser.

## 6. Hal yang Harus Dihindari

- Jangan memakai batch expired untuk transaksi normal.
- Jangan mengubah harga transaksi lama ketika harga produk berubah.
- Jangan menghapus permanen transaksi, batch, retur, pembelian, atau mutasi stok.
- Jangan membuat stok dari resep atau PO.
- Jangan membagikan akun Manager ke kasir.
- Jangan menghapus volume database Docker saat masih memakai data operasional.

## 7. Jika Terjadi Masalah

| Gejala | Langkah Awal |
|---|---|
| Browser tidak bisa membuka aplikasi | Pastikan server lokal hidup dan perangkat tersambung ke LAN yang sama. |
| Kasir tidak melihat produk | Minta Manager cek produk, satuan jual aktif, batch aktif, dan stok. |
| Resep tidak muncul di kasir | Pastikan Apoteker sudah menandai resep sebagai siap bayar. |
| Stok tidak sesuai | Cek `/mutasi-stok`, batch asal, pembelian, retur, dan transaksi terakhir. |
| User tidak bisa login | Manager cek status aktif user di `/users`. |
