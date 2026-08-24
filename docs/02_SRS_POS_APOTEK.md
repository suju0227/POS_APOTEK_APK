---
document_name: "02_SRS_POS_APOTEK_REVISI_V1_1"
document_type: "Software Requirements Specification"
project_name: "POS Apotek"
version: "1.1.0"
status: "Draft Revisi"
prepared_for: "AI Vibe Coding / Codex GPT"
prepared_by: "Suryadi Umar"
last_updated: "2026-06-02"
source_documents:
  - "01_PRD_POS_APOTEK.md"
  - "02_SRS_POS_APOTEK.md"
  - "06_FRONTEND_POS_APOTEK.md"
  - "07_BACKEND_POS_APOTEK.md"
related_documents:
  - "03_SDD_SYSTEM_DESIGN_POS_APOTEK.md"
  - "04_UI_UX_FLOW_POS_APOTEK.md"
  - "05_TASK_BREAKDOWN_POS_APOTEK.md"
---

# SRS - POS Apotek

## Versi Revisi 1.1.0

## 0. Instruksi Pembacaan untuk AI Coding

Dokumen ini merupakan **Software Requirements Specification (SRS)** untuk sistem **POS Apotek**. Dokumen ini disusun ulang agar lebih siap digunakan sebagai dasar sinkronisasi antara **backend**, **frontend**, **database design**, **API**, **UI/UX Flow**, dan **Task Breakdown**.

SRS ini menjelaskan:

- ruang lingkup sistem;
- aktor dan hak akses;
- kebutuhan fungsional;
- kebutuhan nonfungsional;
- aturan validasi;
- aturan perilaku sistem;
- aturan sinkronisasi frontend-backend;
- error state;
- acceptance criteria;
- traceability ke dokumen produk.

Dokumen ini **bukan desain database final**. Struktur tabel, relasi, tipe data, indeks, constraint, dan migration final harus diturunkan pada `03_SDD_SYSTEM_DESIGN_POS_APOTEK.md`.

Dokumen ini **bukan daftar pekerjaan implementasi final**. Daftar task rinci harus diturunkan pada `05_TASK_BREAKDOWN_POS_APOTEK.md`.

AI coding wajib mengikuti ketentuan berikut:

1. Jangan membuat fitur di luar scope SRS V1.
2. Jangan menjadikan frontend sebagai sumber kebenaran untuk stok, batch, FEFO, HPP, harga final, split batch, diskon alokasi, laba, retur, atau mutasi stok.
3. Backend wajib menjadi sumber kebenaran untuk transaksi final.
4. Data historis transaksi, batch, pembelian, retur, dan mutasi stok tidak boleh dihapus permanen sembarangan.
5. Jika terdapat konflik antara tampilan frontend dan aturan sistem, aturan sistem dalam SRS ini harus diutamakan.
6. Jika terdapat kebutuhan teknis yang belum detail, turunkan ke SDD, bukan diisi dengan asumsi bebas.
7. Semua fitur harus dapat diuji melalui acceptance criteria.

---

## 1. Tujuan Dokumen

Tujuan dokumen ini adalah menyediakan spesifikasi kebutuhan sistem POS Apotek secara jelas, terukur, dan dapat diuji.

Dokumen ini menjadi dasar untuk:

- penyusunan System Design Document;
- perancangan database;
- perancangan API;
- pengembangan backend;
- pengembangan frontend;
- penyusunan UI/UX Flow;
- penyusunan Task Breakdown;
- pengujian sistem;
- validasi implementasi oleh AI coding.

SRS ini berfungsi sebagai jembatan antara kebutuhan produk dan rancangan teknis. PRD menjelaskan tujuan produk, sedangkan SRS menjelaskan perilaku sistem yang wajib dipenuhi.

---

## 2. Kedudukan Dokumen dan Sumber Kebenaran

### 2.1 Urutan Rujukan Dokumen

Jika terjadi perbedaan antar dokumen, gunakan urutan rujukan berikut:

| Urutan | Dokumen | Fungsi |
|---:|---|---|
| 1 | PRD | Menentukan tujuan produk dan batas kebutuhan bisnis |
| 2 | SRS | Menentukan perilaku sistem dan aturan kebutuhan |
| 3 | SDD | Menentukan desain teknis, database, API, dan arsitektur |
| 4 | Frontend Specification | Menentukan UI, routing, state, dan integrasi API dari sisi frontend |
| 5 | Backend Specification | Menentukan service, transaksi database, auth, API, dan logic backend |
| 6 | Task Breakdown | Menentukan urutan implementasi |

### 2.2 Prinsip Sumber Kebenaran Sistem

| Area | Sumber Kebenaran |
|---|---|
| Stok final | Backend dan database |
| Batch final yang digunakan transaksi | Backend |
| FEFO final | Backend |
| Split batch final | Backend |
| HPP final | Backend |
| Harga jual final transaksi | Backend |
| Diskon alokasi final | Backend |
| Laba final | Backend |
| Mutasi stok | Backend dan database |
| Tampilan estimasi subtotal, diskon, total, kembalian | Frontend |
| Keranjang draft | Frontend lokal sebelum checkout |
| Hak akses final | Backend |
| Penyembunyian menu berdasarkan role | Frontend dan backend |

Frontend boleh menampilkan estimasi untuk membantu pengguna, tetapi nilai final tetap dihitung dan diputuskan oleh backend.

---

## 3. Ruang Lingkup Sistem

### 3.1 In Scope V1

| ID | Modul | Prioritas | Status |
|---|---|---|---|
| SCOPE-001 | Autentikasi dan role pengguna | Must Have | Wajib |
| SCOPE-002 | Manajemen user | Should Have | Disarankan untuk Manager |
| SCOPE-003 | Manajemen produk obat/barang | Must Have | Wajib |
| SCOPE-004 | Manajemen kategori | Must Have | Wajib |
| SCOPE-005 | Manajemen supplier | Must Have | Wajib |
| SCOPE-006 | Manajemen satuan dan konversi satuan | Must Have | Wajib |
| SCOPE-006A | Pembatasan satuan jual produk | Must Have | Wajib |
| SCOPE-007 | Manajemen batch obat | Must Have | Wajib |
| SCOPE-007A | Pemesanan / Purchase Order Obat | Should Have | Wajib masuk rancangan |
| SCOPE-008 | Pembelian supplier | Must Have | Wajib |
| SCOPE-008A | Pembelian dari PO, faktur supplier, diskon pembelian, dan PPN/non-PPN | Should Have | Wajib masuk rancangan |
| SCOPE-009 | Transaksi penjualan kasir | Must Have | Wajib |
| SCOPE-009A | Pelayanan Resep Dasar | Should Have | Wajib masuk rancangan |
| SCOPE-009B | Konseling Dasar | Could Have | Disarankan kuat |
| SCOPE-010 | FEFO otomatis | Must Have | Wajib |
| SCOPE-011 | Split transaksi multi-batch | Must Have | Wajib |
| SCOPE-012 | Diskon transaksi | Must Have | Wajib |
| SCOPE-013 | Retur penjualan | Must Have | Wajib |
| SCOPE-014 | Retur pembelian | Should Have | Disarankan |
| SCOPE-015 | Stok dan mutasi stok | Must Have | Wajib |
| SCOPE-016 | Koreksi stok | Should Have | Disarankan |
| SCOPE-017 | Dashboard ringkasan | Must Have | Wajib |
| SCOPE-018 | Laporan penjualan | Must Have | Wajib |
| SCOPE-019 | Laporan laba | Must Have | Wajib untuk Manager/Pemilik |
| SCOPE-020 | Ekspor laporan Excel dan PDF | Should Have | Disarankan |
| SCOPE-021 | Pengaturan profil apotek | Could Have | Opsional |

### 3.2 Out of Scope V1

| ID | Fitur | Status |
|---|---|---|
| OOS-001 | Integrasi BPJS | Tidak dikerjakan |
| OOS-002 | Payment gateway otomatis | Tidak dikerjakan |
| OOS-003 | Multi-cabang | Tidak dikerjakan |
| OOS-004 | Program loyalitas pelanggan | Tidak dikerjakan |
| OOS-005 | Akuntansi biaya operasional lengkap | Tidak dikerjakan |
| OOS-006 | Integrasi e-faktur/perpajakan lengkap | Tidak dikerjakan |
| OOS-007 | Manajemen resep dokter lanjutan, e-resep, validasi klinis otomatis, interaksi obat otomatis, dan integrasi fasilitas kesehatan | Tidak dikerjakan; Pelayanan Resep Dasar tetap masuk scope P1 |
| OOS-008 | Integrasi printer thermal khusus | Tidak wajib |
| OOS-009 | Integrasi barcode scanner hardware khusus | Tidak wajib |
| OOS-010 | Manajemen shift kasir kompleks | Tidak wajib |
| OOS-011 | PWA offline penuh | Tidak dikerjakan |
| OOS-012 | Clinical decision support otomatis | Tidak dikerjakan |
| OOS-013 | Piutang pelanggan | Future enhancement, bukan fitur inti V1 |

### 3.3 Prioritas Implementasi V1

| Tahap | Fokus Implementasi | Keterangan |
|---|---|---|
| Tahap 1 | Auth, user, role, kategori, produk, supplier, satuan | Fondasi master data |
| Tahap 2 | Batch, pembelian, stok, mutasi stok | Fondasi stok dan HPP |
| Tahap 3 | PO, pembelian dari PO, halaman kasir, transaksi penjualan, FEFO, split batch | Inti stok masuk dan POS |
| Tahap 4 | Diskon, retur penjualan, laporan penjualan, laporan laba | Operasional dan pelaporan |
| Tahap 5 | Pelayanan resep dasar, konseling, dashboard, retur pembelian, koreksi stok, ekspor | Penguatan sistem |
| Tahap 6 | Pengaturan profil apotek dan penyempurnaan UI | Pelengkap V1 |

---

## 4. Definisi Istilah

| Istilah | Definisi |
|---|---|
| POS | Point of Sale, sistem pencatatan transaksi penjualan |
| Produk | Obat atau barang apotek yang dijual |
| Kategori | Pengelompokan produk |
| Supplier | Pihak penyedia produk untuk apotek |
| Purchase Order / PO Obat | Dokumen rencana pemesanan obat ke supplier yang tidak mengubah stok |
| Faktur Supplier | Dokumen tagihan barang datang yang menjadi dasar pembelian final |
| Diskon Pembelian | Potongan harga dari supplier pada proses pembelian, berbeda dari diskon penjualan |
| PPN Pembelian | Pencatatan PPN faktur supplier untuk pencocokan total, bukan modul pajak lengkap |
| Batch | Kelompok stok berdasarkan produk, nomor batch, expired date, HPP, harga jual, dan stok |
| Expired Date | Tanggal kedaluwarsa batch |
| FEFO | First Expired First Out, metode pengeluaran stok berdasarkan tanggal kedaluwarsa terdekat |
| Satuan Dasar | Satuan terkecil untuk penyimpanan stok |
| Satuan Jual | Satuan yang dapat dipilih saat transaksi penjualan |
| Satuan Jual Aktif | Satuan produk yang boleh dipilih Kasir; satuan dasar stok tidak otomatis menjadi satuan jual |
| Konversi Satuan | Perbandingan jumlah satuan jual terhadap satuan dasar |
| HPP | Harga Pokok Penjualan |
| Harga Modal | Harga beli supplier yang disimpan dengan presisi desimal tinggi untuk kebutuhan HPP dan laba internal |
| Harga Jual Final | Harga jual rupiah bulat yang ditentukan manual oleh Manager dan dipakai pada kasir/transaksi |
| Presisi Harga Modal dan HPP | Requirement bahwa harga modal, HPP, dan laba internal berpresisi tinggi sementara harga jual pelanggan tetap rupiah bulat |
| Omzet | Nilai penjualan sebelum dikurangi HPP |
| Laba | Omzet detail dikurangi HPP detail dan diskon alokasi |
| Diskon Alokasi | Pembagian diskon transaksi ke detail transaksi secara proporsional |
| Mutasi Stok | Catatan perubahan stok masuk atau keluar |
| Retur Penjualan | Pengembalian barang dari pelanggan ke apotek |
| Retur Pembelian | Pengembalian barang dari apotek ke supplier |
| Pelayanan Resep Dasar | Pencatatan resep, aturan pakai, dan persiapan pembayaran tanpa mengurangi stok sebelum checkout |
| Konseling Dasar | Dokumentasi edukasi obat oleh Apoteker tanpa tagihan dan tanpa perubahan stok |
| Piutang | Future enhancement untuk penjualan belum lunas, bukan fitur inti V1 |
| Produk Aktif | Produk yang dapat digunakan dalam transaksi baru |
| Produk Nonaktif | Produk yang tidak dapat digunakan dalam transaksi baru, tetapi histori tetap tersedia |
| Server-side | Proses yang dihitung di backend |
| Client-side | Proses yang dihitung sementara di frontend |
| Atomic Transaction | Transaksi database yang harus berhasil seluruhnya atau gagal seluruhnya |
| Draft Keranjang | Data sementara di frontend sebelum transaksi final disimpan |

---

## 5. Aktor, Role, dan Hak Akses

### 5.1 Aktor Sistem

| ID | Aktor | Deskripsi |
|---|---|---|
| ACT-001 | Kasir | Pengguna yang melayani transaksi penjualan dan retur penjualan |
| ACT-002 | Manager | Pengguna yang mengelola master data, pembelian, stok, laporan, user, dan pengaturan |
| ACT-003 | Pemilik | Pengguna yang memantau dashboard dan laporan bisnis |
| ACT-004 | Apoteker | Pengguna yang membuat PO, memeriksa resep dasar, mencatat konseling, dan melihat stok pelayanan |
| ACT-005 | Sistem | Proses otomatis yang menjalankan validasi, FEFO, split batch, kalkulasi, dan mutasi stok |

### 5.2 Role Minimum V1

| Role | Status | Catatan |
|---|---|---|
| Kasir | Wajib | Fokus pada transaksi penjualan dan retur penjualan |
| Apoteker | Wajib masuk rancangan | Fokus pada PO, resep dasar, konseling, dan pelayanan obat |
| Manager | Wajib | Akses penuh terhadap fitur operasional |
| Pemilik | Opsional | Dapat dibuat sebagai role laporan, atau sementara memakai akses Manager terbatas |

Keputusan V1: sistem minimal wajib memiliki role **Kasir**, **Apoteker**, dan **Manager** dalam rancangan. Role **Pemilik** boleh ditambahkan jika implementasi role tambahan tidak mengganggu prioritas inti.

### 5.3 Matriks Hak Akses

| Modul/Fitur | Kasir | Apoteker | Manager | Pemilik |
|---|---:|---:|---:|---:|
| Login/logout | Ya | Ya | Ya | Ya |
| Dashboard | Terbatas | Terbatas | Ya | Ya |
| Halaman kasir | Ya | Opsional | Ya | Tidak wajib |
| Transaksi penjualan | Ya | Opsional | Ya | Tidak wajib |
| Resep Dokter | Tarik resep siap bayar | Ya | Ya | Lihat |
| Konseling | Tidak | Ya | Ya | Lihat |
| PO Obat | Tidak | Ya | Ya | Lihat |
| Retur penjualan | Ya | Terbatas | Ya | Tidak wajib |
| Produk | Lihat terbatas | Lihat | Kelola | Lihat |
| Kategori | Tidak | Lihat | Kelola | Lihat |
| Supplier | Tidak | Lihat | Kelola | Lihat |
| Satuan dan konversi | Tidak | Lihat | Kelola | Lihat |
| Batch | Lihat terbatas | Lihat | Kelola | Lihat |
| Pembelian supplier | Tidak | Terbatas/Lihat | Kelola | Lihat |
| Retur pembelian | Tidak | Tidak | Kelola | Lihat |
| Stok | Lihat terbatas | Lihat | Kelola/Lihat penuh | Lihat |
| Mutasi stok | Tidak | Lihat | Ya | Lihat |
| Koreksi stok | Tidak | Tidak | Ya | Tidak wajib |
| Laporan penjualan | Tidak | Tidak | Ya | Ya |
| Laporan laba | Tidak | Tidak | Ya | Ya |
| Ekspor laporan | Tidak | Tidak | Ya | Ya |
| Pengaturan sistem | Tidak | Tidak | Ya | Tidak wajib |
| Manajemen user | Tidak | Tidak | Ya | Tidak wajib |

### 5.4 Larangan Role Kasir

Kasir tidak boleh:

1. melihat HPP;
2. melihat laba;
3. melihat margin;
4. melihat harga beli supplier;
5. membuka laporan laba;
6. mengubah harga jual;
7. mengubah HPP;
8. melakukan koreksi stok;
9. mengelola supplier;
10. mengelola pembelian;
11. mengelola user;
12. mengakses endpoint Manager melalui URL langsung.

Apoteker tidak boleh melihat HPP, laba, margin, atau harga beli supplier kecuali ada izin khusus yang ditetapkan eksplisit pada fase implementasi lanjutan.

---

## 6. Asumsi dan Ketergantungan

| ID | Asumsi/Ketergantungan | Penjelasan |
|---|---|---|
| ASM-001 | Sistem berbasis web | Aplikasi digunakan melalui browser |
| ASM-002 | Backend/database menjadi penyimpanan utama | Frontend bukan penyimpanan final |
| ASM-003 | Setiap produk memiliki satuan dasar | Stok disimpan dalam satuan terkecil |
| ASM-004 | Setiap batch memiliki expired date | Diperlukan untuk FEFO |
| ASM-005 | Harga jual transaksi disimpan historis | Perubahan harga baru tidak mengubah histori |
| ASM-006 | HPP transaksi disimpan historis | Laporan laba lama tetap akurat |
| ASM-007 | Pembayaran V1 manual | Tidak ada verifikasi payment gateway otomatis |
| ASM-008 | Barcode scanner dianggap input keyboard | Tidak ada integrasi hardware khusus V1 |
| ASM-009 | Laba V1 adalah laba penjualan | Tidak mencakup biaya operasional, pajak lengkap, sewa, gaji, listrik |
| ASM-010 | Zona waktu aplikasi konsisten | Waktu transaksi dan laporan menggunakan waktu backend dengan zona Asia/Jakarta |

---

## 7. Prinsip Sistem dan Sinkronisasi Frontend-Backend

### 7.1 Prinsip Umum

| ID | Prinsip | Aturan |
|---|---|---|
| SYS-PRIN-001 | Backend sebagai sumber kebenaran | Semua nilai final transaksi dihitung backend |
| SYS-PRIN-002 | Frontend sebagai antarmuka dan estimasi | Frontend hanya menghitung nilai sementara |
| SYS-PRIN-003 | Stok berbasis batch | Stok tidak boleh hanya disimpan pada produk |
| SYS-PRIN-004 | FEFO server-side | Pemilihan batch final dilakukan backend |
| SYS-PRIN-005 | Transaksi atomic | Penjualan, pembelian, retur, dan koreksi stok harus atomic |
| SYS-PRIN-006 | Auditability | Setiap perubahan stok memiliki mutasi dan referensi |
| SYS-PRIN-007 | Histori tidak rusak | Perubahan harga, HPP, atau produk tidak boleh mengubah transaksi lama |
| SYS-PRIN-008 | Role enforced backend | UI role bukan pengamanan tunggal |
| SYS-PRIN-009 | Error harus jelas | Pengguna tidak boleh melihat error teknis mentah |
| SYS-PRIN-010 | Tidak membuat fitur liar | Fitur di luar scope V1 tidak boleh dibuat tanpa pembaruan dokumen |
| SYS-PRIN-011 | Presisi harga modal dan HPP | Presisi tinggi hanya untuk harga modal, HPP, dan laba internal |
| SYS-PRIN-012 | Harga jual manual | Harga jual pelanggan adalah rupiah bulat yang ditentukan Manager, bukan hasil otomatis dari harga modal |
| SYS-PRIN-013 | PO bukan stok | PO tidak menambah dan tidak mengurangi stok |
| SYS-PRIN-014 | Resep bukan transaksi final | Resep tidak mengurangi stok sebelum checkout berhasil |
| SYS-PRIN-015 | Satuan jual dibatasi | Kasir hanya boleh memilih satuan jual aktif yang ditentukan Manager |
| SYS-PRIN-016 | Pajak pembelian terbatas | PPN pembelian hanya untuk pencocokan faktur, bukan modul perpajakan lengkap |

### 7.2 Data yang Boleh Dihitung Frontend

Frontend boleh menghitung:

```text
estimated_subtotal
estimated_discount
estimated_total
estimated_change
estimated_stock_display
form_validation_warning
```

### 7.3 Data yang Wajib Dihitung Backend

Backend wajib menghitung:

```text
final_subtotal
final_discount_total
final_grand_total
final_change
final_batch_selection
final_fefo_result
final_split_batch
final_hpp
final_discount_allocation
final_profit
final_stock_mutation
final_report_value
```

### 7.4 Aturan Waktu Sistem

1. Waktu transaksi final harus berasal dari backend/server.
2. Zona waktu aplikasi menggunakan `Asia/Jakarta`.
3. Frontend boleh menampilkan jam real-time sebagai informasi UI, tetapi waktu transaksi final tetap dari backend.
4. Laporan harian, mingguan, bulanan, dan tahunan dihitung berdasarkan tanggal lokal aplikasi yang konsisten.
5. Semua timestamp penting harus disimpan dengan format yang aman untuk database dan dapat dikonversi ke zona waktu lokal.

---

## 8. Kebutuhan Fungsional

# 8.1 Modul Autentikasi dan User

## SRS-AUTH-001: Login Pengguna

**Prioritas:** Must Have
**Aktor:** Kasir, Manager, Pemilik

### Deskripsi
Sistem harus menyediakan fitur login agar pengguna dapat masuk sesuai akun, role, dan hak akses.

### Input

- username atau email;
- password.

### Proses

1. Pengguna memasukkan username/email dan password.
2. Sistem memvalidasi field kosong.
3. Sistem memeriksa kecocokan kredensial.
4. Sistem memeriksa status akun.
5. Sistem membaca role pengguna.
6. Sistem membuat sesi atau token.
7. Sistem mengarahkan pengguna sesuai role.

### Validation Rules

| ID | Aturan |
|---|---|
| VAL-AUTH-001 | Username/email wajib diisi |
| VAL-AUTH-002 | Password wajib diisi |
| VAL-AUTH-003 | Akun nonaktif tidak dapat login |
| VAL-AUTH-004 | Password tidak boleh disimpan plaintext |
| VAL-AUTH-005 | User wajib memiliki role valid |

### Acceptance Criteria

- Pengguna aktif dapat login.
- Pengguna nonaktif tidak dapat login.
- Kasir diarahkan ke halaman kasir.
- Manager diarahkan ke dashboard.
- Sistem menampilkan pesan error yang jelas jika login gagal.

## SRS-AUTH-002: Logout Pengguna

**Prioritas:** Must Have
**Aktor:** Kasir, Manager, Pemilik

### Deskripsi
Sistem harus menyediakan fitur logout untuk mengakhiri sesi pengguna.

### Acceptance Criteria

- Setelah logout, pengguna tidak dapat membuka halaman internal tanpa login ulang.
- Token atau sesi tidak dapat dipakai kembali setelah logout jika mekanisme revoke diterapkan.
- Data pengguna sebelumnya tidak tampil setelah logout.

## SRS-AUTH-003: Proteksi Halaman dan Endpoint Berdasarkan Role

**Prioritas:** Must Have
**Aktor:** Sistem

### Deskripsi
Sistem harus membatasi akses halaman, menu, dan endpoint berdasarkan role pengguna.

### Rules

| ID | Aturan |
|---|---|
| RULE-AUTH-001 | Halaman internal wajib membutuhkan login |
| RULE-AUTH-002 | Endpoint sensitif wajib memeriksa role di backend |
| RULE-AUTH-003 | Kasir tidak boleh membuka laporan laba |
| RULE-AUTH-004 | Kasir tidak boleh melakukan koreksi stok |
| RULE-AUTH-005 | Kasir tidak boleh mengakses HPP dan laba |
| RULE-AUTH-006 | Manager dapat mengakses fitur operasional sesuai scope |

### Acceptance Criteria

- URL internal tidak dapat dibuka tanpa login.
- URL Manager tidak dapat dibuka oleh Kasir.
- Backend tetap menolak request walaupun UI dimanipulasi.
- Sistem menampilkan 403 atau pesan akses ditolak jika role tidak berhak.

---

# 8.2 Modul Produk dan Kategori

## SRS-PROD-001: Membuat Produk

**Prioritas:** Must Have
**Aktor:** Manager

### Input

- kode produk;
- nama produk;
- kategori;
- satuan dasar;
- stok minimum;
- status aktif;
- nama generik opsional;
- barcode opsional;
- deskripsi opsional.

### Validation Rules

| ID | Aturan |
|---|---|
| VAL-PROD-001 | Kode produk wajib diisi |
| VAL-PROD-002 | Kode produk harus unik |
| VAL-PROD-003 | Nama produk wajib diisi |
| VAL-PROD-004 | Kategori wajib dipilih |
| VAL-PROD-005 | Satuan dasar wajib dipilih |
| VAL-PROD-006 | Stok minimum tidak boleh negatif |
| VAL-PROD-007 | Barcode tidak boleh duplikat pada produk aktif lain jika diisi |

### Acceptance Criteria

- Produk valid dapat disimpan.
- Produk baru muncul di daftar produk.
- Produk dapat digunakan pada batch dan pembelian.
- Sistem menolak kode produk duplikat.
- Sistem menolak produk tanpa nama, kategori, atau satuan dasar.

## SRS-PROD-002: Mengubah Produk

**Prioritas:** Must Have
**Aktor:** Manager

### Rules

| ID | Aturan |
|---|---|
| RULE-PROD-001 | Perubahan nama produk tidak mengubah transaksi lama yang sudah tersimpan |
| RULE-PROD-002 | Produk yang sudah memiliki histori tidak boleh dihapus permanen |
| RULE-PROD-003 | Perubahan kategori tidak mengubah nilai historis transaksi |
| RULE-PROD-004 | Perubahan stok minimum hanya memengaruhi alert setelah perubahan |
| RULE-PROD-005 | Perubahan satuan dasar pada produk historis harus dibatasi atau memerlukan migrasi eksplisit |

### Acceptance Criteria

- Produk dapat diperbarui oleh Manager.
- Histori transaksi tetap dapat dibaca.
- Sistem menolak perubahan kode menjadi kode yang sudah digunakan produk lain.

## SRS-PROD-003: Menonaktifkan Produk

**Prioritas:** Must Have
**Aktor:** Manager

### Rules

| ID | Aturan |
|---|---|
| RULE-PROD-006 | Produk nonaktif tidak muncul pada pencarian kasir untuk transaksi baru |
| RULE-PROD-007 | Produk nonaktif tetap muncul pada histori transaksi |
| RULE-PROD-008 | Produk nonaktif dapat diaktifkan kembali oleh Manager |

### Acceptance Criteria

- Produk nonaktif tidak dapat dijual pada transaksi baru.
- Produk nonaktif tetap tampil pada laporan historis.
- Produk dapat diaktifkan kembali.

## SRS-PROD-004: Pencarian Produk

**Prioritas:** Must Have
**Aktor:** Kasir, Manager

### Input Pencarian

- nama produk;
- kode produk;
- barcode;
- kategori;
- nama generik;
- nomor batch jika diperlukan.

### Rules

| ID | Aturan |
|---|---|
| RULE-SEARCH-001 | Kasir hanya melihat produk aktif yang dapat dijual |
| RULE-SEARCH-002 | Manager dapat melihat produk aktif dan nonaktif |
| RULE-SEARCH-003 | Produk tanpa stok dapat tampil dengan status stok habis |
| RULE-SEARCH-004 | Produk batch expired tidak boleh dianggap tersedia untuk transaksi normal |

### Acceptance Criteria

- Produk dapat dicari berdasarkan nama, kode, dan barcode.
- Produk dapat difilter berdasarkan kategori.
- Sistem menampilkan empty state jika data tidak ditemukan.

## SRS-CAT-001: Manajemen Kategori

**Prioritas:** Must Have
**Aktor:** Manager

### Input

- nama kategori;
- deskripsi opsional;
- status aktif.

### Validation Rules

| ID | Aturan |
|---|---|
| VAL-CAT-001 | Nama kategori wajib diisi |
| VAL-CAT-002 | Nama kategori tidak boleh duplikat pada kategori aktif |
| VAL-CAT-003 | Kategori yang sudah dipakai produk tidak boleh dihapus permanen |

### Acceptance Criteria

- Kategori dapat dibuat, diubah, dicari, dan dinonaktifkan.
- Kategori aktif dapat dipilih pada produk.
- Kategori nonaktif tidak muncul sebagai pilihan produk baru.
- Produk lama yang memakai kategori nonaktif tetap dapat dibaca.

---

# 8.3 Modul Supplier

## SRS-SUP-001: Manajemen Supplier

**Prioritas:** Must Have
**Aktor:** Manager

### Input

- nama supplier;
- nomor telepon opsional;
- alamat opsional;
- kontak person opsional;
- status aktif.

### Validation Rules

| ID | Aturan |
|---|---|
| VAL-SUP-001 | Nama supplier wajib diisi |
| VAL-SUP-002 | Nama supplier tidak boleh duplikat pada supplier aktif |
| VAL-SUP-003 | Supplier yang sudah memiliki histori pembelian tidak boleh dihapus permanen |

### Acceptance Criteria

- Supplier dapat dibuat, diubah, dicari, dan dinonaktifkan.
- Supplier aktif dapat dipilih saat pembelian.
- Supplier nonaktif tidak muncul pada pembelian baru.
- Riwayat pembelian supplier nonaktif tetap dapat dibaca.

---

# 8.4 Modul Satuan dan Konversi

## SRS-UNIT-001: Satuan Dasar Produk

**Prioritas:** Must Have
**Aktor:** Manager

### Rules

| ID | Aturan |
|---|---|
| RULE-UNIT-001 | Setiap produk wajib memiliki satuan dasar |
| RULE-UNIT-002 | Stok sistem disimpan dalam satuan dasar |
| RULE-UNIT-003 | Satuan dasar dapat berupa tablet, kaplet, kapsul, botol, tube, sachet, atau satuan lain |
| RULE-UNIT-004 | Perubahan satuan dasar pada produk historis harus dibatasi |

### Acceptance Criteria

- Produk tidak dapat disimpan tanpa satuan dasar.
- Stok selalu dihitung dalam satuan dasar.
- Transaksi satuan jual dikonversi ke satuan dasar.

## SRS-UNIT-002: Konversi Satuan Jual

**Prioritas:** Must Have
**Aktor:** Manager

### Input

- produk;
- nama satuan jual;
- faktor konversi ke satuan dasar;
- status aktif.

### Contoh

```text
Produk: Paracetamol 500 mg
Satuan dasar: tablet
1 strip = 10 tablet
1 box = 100 tablet
```

### Validation Rules

| ID | Aturan |
|---|---|
| VAL-UNIT-001 | Nama satuan jual wajib diisi |
| VAL-UNIT-002 | Faktor konversi wajib lebih besar dari 0 |
| VAL-UNIT-003 | Faktor konversi harus berupa angka valid |
| VAL-UNIT-004 | Satuan jual aktif tidak boleh duplikat pada produk yang sama |
| VAL-UNIT-005 | Satuan jual yang sudah dipakai transaksi tidak boleh dihapus permanen |

### Acceptance Criteria

- Manager dapat membuat satuan jual.
- Kasir dapat memilih satuan jual aktif.
- Sistem mengurangi stok berdasarkan faktor konversi.
- Sistem menolak faktor konversi nol atau negatif.

## SRS-UNIT-003: Pembatasan Satuan Jual Produk

**Prioritas:** Must Have
**Aktor:** Manager, Kasir

### Rules

| ID | Aturan |
|---|---|
| RULE-UNIT-SALE-001 | Stok tetap disimpan dalam satuan dasar |
| RULE-UNIT-SALE-002 | Satuan dasar tidak otomatis menjadi satuan jual |
| RULE-UNIT-SALE-003 | Manager menentukan `is_sale_unit`, `is_active`, `min_sale_qty`, dan `sale_unit_note` pada product unit |
| RULE-UNIT-SALE-004 | Kasir hanya melihat product unit yang aktif dan boleh dijual |
| RULE-UNIT-SALE-005 | Backend wajib menolak checkout jika product unit bukan satuan jual aktif |

### Acceptance Criteria

- Manager dapat menentukan satuan jual aktif per produk.
- Kasir hanya melihat satuan jual aktif.
- Backend menolak transaksi dengan satuan yang tidak aktif.
- Produk tertentu dapat dikonfigurasi agar tidak dijual per biji/tablet/kaplet.

---

# 8.5 Modul Batch dan Harga

## SRS-BATCH-001: Membuat Batch Produk

**Prioritas:** Must Have
**Aktor:** Manager

### Input

- produk;
- nomor batch;
- supplier atau pembelian asal;
- expired date;
- stok awal dalam satuan dasar;
- HPP satuan dasar;
- harga jual per satuan jual;
- status aktif.

### Validation Rules

| ID | Aturan |
|---|---|
| VAL-BATCH-001 | Produk wajib dipilih |
| VAL-BATCH-002 | Nomor batch wajib diisi |
| VAL-BATCH-003 | Expired date wajib diisi |
| VAL-BATCH-004 | Stok awal tidak boleh negatif |
| VAL-BATCH-005 | HPP satuan dasar tidak boleh negatif |
| VAL-BATCH-006 | Harga jual tidak boleh negatif |
| VAL-BATCH-007 | Batch dengan histori transaksi tidak boleh dihapus permanen |
| VAL-BATCH-008 | Kombinasi produk dan nomor batch sebaiknya unik, kecuali bisnis mengizinkan batch sama dari pembelian berbeda |

### Acceptance Criteria

- Batch dapat dibuat untuk produk aktif.
- Batch memiliki expired date, stok, HPP, dan harga jual.
- Batch tampil pada daftar batch Manager.
- Batch menjadi dasar stok dan transaksi.

## SRS-BATCH-002: Status Batch

**Prioritas:** Must Have
**Aktor:** Manager, Sistem

### Status Batch

| Status | Makna |
|---|---|
| ACTIVE | Batch aktif dan dapat digunakan jika stok tersedia dan belum expired |
| EMPTY | Stok batch nol |
| EXPIRED | Batch melewati tanggal kedaluwarsa |
| INACTIVE | Batch dinonaktifkan dan tidak dapat digunakan transaksi baru |

### Rules

| ID | Aturan |
|---|---|
| RULE-BATCH-001 | Batch aktif dapat digunakan jika stok tersedia dan belum expired |
| RULE-BATCH-002 | Batch stok nol tidak digunakan transaksi |
| RULE-BATCH-003 | Batch expired tidak digunakan transaksi normal |
| RULE-BATCH-004 | Batch nonaktif tidak digunakan transaksi baru |
| RULE-BATCH-005 | Batch dengan histori tetap tampil pada riwayat |

### Acceptance Criteria

- Batch expired tidak dipakai FEFO.
- Batch stok nol tidak dipilih sistem.
- Batch nonaktif tidak muncul sebagai opsi transaksi.
- Riwayat batch tetap tersedia.

## SRS-BATCH-003: Alert Batch Mendekati Kedaluwarsa

**Prioritas:** Must Have
**Aktor:** Manager, Pemilik

### Rules

| ID | Aturan |
|---|---|
| RULE-EXP-001 | Default alert expired memakai ambang 30 hari sebelum expired |
| RULE-EXP-002 | Ambang alert sebaiknya dapat dikonfigurasi |
| RULE-EXP-003 | Batch expired harus dibedakan dari batch mendekati expired |
| RULE-EXP-004 | Batch stok nol tidak wajib tampil sebagai risiko expired aktif kecuali untuk audit |

### Acceptance Criteria

- Dashboard menampilkan jumlah batch mendekati expired.
- Manager dapat melihat daftar batch mendekati expired.
- Batch expired ditandai jelas.
- Batch mendekati expired tetap diprioritaskan FEFO selama belum expired.

## SRS-BATCH-004: Aturan Harga Jual Final

**Prioritas:** Must Have
**Aktor:** Sistem

### Deskripsi
Sistem harus menentukan harga jual final pada saat transaksi disimpan.

### Rules

| ID | Aturan |
|---|---|
| RULE-PRICE-001 | Harga jual final dihitung atau dipilih backend saat transaksi disimpan |
| RULE-PRICE-002 | Frontend hanya menampilkan estimasi harga jual |
| RULE-PRICE-003 | Harga jual final wajib disimpan pada detail transaksi |
| RULE-PRICE-004 | Perubahan harga setelah transaksi tidak boleh mengubah histori transaksi lama |
| RULE-PRICE-005 | Jika terjadi perbedaan estimasi frontend dan hasil final backend, hasil backend yang digunakan |
| RULE-PRICE-006 | Aturan harga multi-batch harus difinalkan pada SDD |

### Acceptance Criteria

- Detail transaksi menyimpan harga jual final.
- Laporan historis tidak berubah saat harga batch/produk diubah.
- Frontend menampilkan hasil final transaksi dari backend setelah checkout berhasil.

---

# 8.5A Modul Pemesanan / Purchase Order Obat

## SRS-PO-001: Membuat Purchase Order Obat

**Prioritas:** Should Have
**Aktor:** Apoteker, Manager

### Input

- supplier;
- tanggal PO;
- pembuat otomatis dari user login;
- item produk;
- satuan pemesanan;
- qty ordered;
- estimasi harga beli opsional;
- catatan.

### Rules

| ID | Aturan |
|---|---|
| RULE-PO-001 | PO tidak boleh menambah stok |
| RULE-PO-002 | PO tidak boleh mengurangi stok |
| RULE-PO-003 | Nomor PO unik, contoh `PO-20260603-0001` |
| RULE-PO-004 | Status PO: `DRAFT`, `SENT`, `PARTIALLY_RECEIVED`, `RECEIVED`, `CANCELLED` |
| RULE-PO-005 | Data pembuat PO otomatis dari user login |
| RULE-PO-006 | PO dapat diterima sebagian melalui pembelian |

### Acceptance Criteria

- PO dapat dibuat dengan No. PO, tanggal, supplier, pembuat otomatis, dan item obat.
- PO dapat dicetak.
- PO tidak menambah stok.
- PO dapat ditarik ke pembelian.
- PO dapat diterima sebagian.

## SRS-PO-002: Cetak dan Convert PO ke Pembelian

**Prioritas:** Should Have
**Aktor:** Apoteker, Manager

### Rules

| ID | Aturan |
|---|---|
| RULE-PO-PRINT-001 | Cetak PO memuat identitas apotek, nomor PO, tanggal, supplier, pembuat, item, satuan, qty, catatan, dan area tanda tangan |
| RULE-PO-PRINT-002 | Ukuran kertas minimal A4, A5, dan custom sederhana |
| RULE-PO-CONVERT-001 | Convert PO menghasilkan draft pembelian, bukan pembelian final |
| RULE-PO-CONVERT-002 | Barang datang boleh berbeda qty, harga, batch, atau expired date dari PO |

### Acceptance Criteria

- Print preview PO dapat dibuat tanpa integrasi printer kompleks.
- PO dapat dikonversi menjadi draft pembelian.
- Draft pembelian tetap dapat disesuaikan Manager sebelum final.

---

# 8.6 Modul Pembelian Supplier

## SRS-PUR-001: Membuat Pembelian Supplier

**Prioritas:** Must Have
**Aktor:** Manager

### Input

- supplier;
- purchase order asal opsional;
- tanggal pembelian;
- nomor invoice/faktur supplier;
- tanggal invoice;
- mode PPN: `NON_PPN`, `PPN_INCLUDED`, atau `PPN_EXCLUDED`;
- tarif PPN jika digunakan;
- total faktur input;
- daftar item pembelian;
- produk;
- nomor batch;
- expired date;
- satuan pembelian;
- qty ordered dari PO jika ada;
- qty received;
- harga beli/modal presisi tinggi;
- diskon pembelian: `NONE`, `NOMINAL`, atau `PERCENT`;
- harga jual per satuan jual.

### Proses

1. Manager memilih supplier.
2. Manager dapat memilih PO milik supplier atau membuat pembelian manual.
3. Jika memilih PO, sistem menarik item PO sebagai draft pembelian.
4. Manager menyesuaikan qty diterima, harga beli final, diskon, PPN, batch, expired date, dan harga jual.
5. Sistem memvalidasi produk, satuan, qty, harga beli, diskon, batch, dan expired date.
6. Sistem menghitung jumlah stok satuan dasar, modal bersih, PPN, total sistem, dan HPP satuan dasar.
7. Sistem membandingkan total sistem dengan total faktur input.
8. Sistem membuat atau menambah batch sesuai aturan.
9. Sistem mencatat mutasi stok masuk.
10. Sistem memperbarui status PO jika pembelian berasal dari PO.
11. Sistem menyimpan riwayat pembelian.

### Validation Rules

| ID | Aturan |
|---|---|
| VAL-PUR-001 | Supplier wajib dipilih |
| VAL-PUR-002 | Tanggal pembelian wajib diisi |
| VAL-PUR-003 | Minimal satu item pembelian wajib ada |
| VAL-PUR-004 | Produk wajib dipilih |
| VAL-PUR-005 | Nomor batch wajib diisi |
| VAL-PUR-006 | Expired date wajib diisi |
| VAL-PUR-007 | Qty pembelian wajib lebih besar dari 0 |
| VAL-PUR-008 | Harga beli tidak boleh negatif |
| VAL-PUR-009 | Satuan pembelian harus memiliki konversi valid |
| VAL-PUR-010 | Harga jual per satuan tidak boleh negatif |
| VAL-PUR-011 | Pembelian dari PO hanya memakai item PO sebagai draft, bukan nilai final yang terkunci |
| VAL-PUR-012 | Diskon pembelian tidak boleh negatif dan tidak boleh melebihi subtotal item |
| VAL-PUR-013 | Mode PPN wajib salah satu dari `NON_PPN`, `PPN_INCLUDED`, `PPN_EXCLUDED` |
| VAL-PUR-014 | Total sistem wajib dibandingkan dengan total faktur input |
| VAL-PUR-015 | Selisih kecil dapat disimpan sebagai rounding adjustment |
| VAL-PUR-016 | Selisih besar wajib ditolak atau membutuhkan difference note |
| VAL-PUR-017 | Satu item PO dapat diterima menjadi beberapa batch berbeda |

### Acceptance Criteria

- Pembelian dapat dibuat manual atau dari PO.
- Pembelian valid dapat disimpan.
- Stok batch bertambah.
- HPP satuan dasar tersimpan.
- Diskon pembelian nominal dan persen memengaruhi modal bersih dan HPP.
- Mode PPN/non-PPN dapat dicatat untuk pencocokan faktur supplier.
- Total sistem dapat dibandingkan dengan total faktur input.
- Setiap item barang masuk memiliki batch number dan expired date.
- Mutasi stok masuk tercatat.
- Pembelian dapat ditelusuri pada riwayat.
- Sistem menolak pembelian tanpa item.
- Pembelian dari PO dapat memperbarui status PO menjadi `PARTIALLY_RECEIVED` atau `RECEIVED`.

## SRS-PUR-002: Perhitungan HPP Pembelian

**Prioritas:** Must Have
**Aktor:** Sistem

### Formula

```text
hpp_satuan_dasar = harga_beli_satuan_pembelian / jumlah_satuan_dasar_dalam_satuan_pembelian
```

Harga beli supplier dan HPP satuan dasar wajib dapat disimpan dengan presisi tinggi. Presisi tinggi tidak berarti harga jual pelanggan ikut menjadi desimal; harga jual tetap ditentukan Manager dalam rupiah bulat.

Diskon pembelian, PPN pembelian, total modal, total faktur input, total sistem, dan rounding adjustment juga memakai presisi tinggi. Sistem tidak boleh memakai `FLOAT`, `DOUBLE`, atau `REAL` untuk uang, HPP, pajak, diskon, dan laba.

### Rules

| ID | Aturan |
|---|---|
| RULE-HPP-001 | HPP dihitung server-side |
| RULE-HPP-002 | HPP wajib disimpan pada batch |
| RULE-HPP-003 | HPP transaksi wajib disalin ke detail transaksi saat penjualan |
| RULE-HPP-004 | Perubahan HPP batch tidak boleh mengubah detail transaksi lama |

### Acceptance Criteria

- Sistem menghasilkan HPP satuan dasar berdasarkan konversi.
- HPP tersimpan pada batch.
- Detail transaksi menyimpan HPP final saat transaksi.

---

# 8.7 Modul Halaman Kasir dan Penjualan

## SRS-SALE-001: Membuka Halaman Kasir

**Prioritas:** Must Have
**Aktor:** Kasir, Manager

### Tampilan Minimal

- pencarian produk;
- daftar hasil pencarian;
- pilihan satuan jual;
- input qty;
- keranjang transaksi;
- subtotal estimasi;
- diskon estimasi;
- total estimasi;
- metode pembayaran;
- uang diterima;
- kembalian estimasi;
- tombol simpan transaksi;
- tombol batal/reset transaksi.

### Acceptance Criteria

- Kasir dapat membuka halaman kasir setelah login.
- Transaksi normal dapat dilakukan tanpa berpindah halaman.
- Total transaksi estimasi tampil real-time.
- Halaman kasir responsif.

## SRS-SALE-002: Pencarian Produk di Halaman Kasir

**Prioritas:** Must Have
**Aktor:** Kasir

### Rules

| ID | Aturan |
|---|---|
| RULE-SALE-SEARCH-001 | Hanya produk aktif yang dapat dipilih |
| RULE-SALE-SEARCH-002 | Produk tanpa stok dapat tampil dengan status stok habis |
| RULE-SALE-SEARCH-003 | Batch expired tidak boleh dijual pada transaksi normal |
| RULE-SALE-SEARCH-004 | Pencarian harus mengutamakan hasil paling relevan |

### Acceptance Criteria

- Kasir dapat mencari produk berdasarkan nama, kode, barcode, kategori, atau nama generik.
- Sistem menampilkan pesan jika produk tidak ditemukan.
- Produk nonaktif tidak dapat dipilih.

## SRS-SALE-003: Menambahkan Produk ke Keranjang

**Prioritas:** Must Have
**Aktor:** Kasir

### Input

- produk;
- satuan jual;
- qty;
- catatan item opsional.

### Validation Rules

| ID | Aturan |
|---|---|
| VAL-SALE-ITEM-001 | Produk wajib dipilih |
| VAL-SALE-ITEM-002 | Satuan jual wajib dipilih |
| VAL-SALE-ITEM-003 | Qty wajib lebih besar dari 0 |
| VAL-SALE-ITEM-004 | Satuan jual harus aktif |
| VAL-SALE-ITEM-005 | Produk nonaktif tidak boleh ditambahkan |
| VAL-SALE-ITEM-006 | Frontend boleh menampilkan peringatan stok, tetapi validasi final stok dilakukan backend |

### Acceptance Criteria

- Item valid dapat masuk ke keranjang.
- Sistem menolak qty nol atau negatif.
- Keranjang menghitung subtotal estimasi.
- Keranjang belum mengubah stok sebelum transaksi final.

## SRS-SALE-004: Mengubah Item Keranjang

**Prioritas:** Must Have
**Aktor:** Kasir

### Rules

| ID | Aturan |
|---|---|
| RULE-CART-001 | Perubahan qty memicu kalkulasi ulang estimasi |
| RULE-CART-002 | Perubahan satuan memicu kalkulasi ulang estimasi |
| RULE-CART-003 | Penghapusan item mengurangi subtotal estimasi |
| RULE-CART-004 | Draft keranjang tidak memengaruhi stok final |

### Acceptance Criteria

- Qty item dapat diubah.
- Item dapat dihapus dari keranjang.
- Total estimasi berubah sesuai isi keranjang.
- Stok final hanya berubah setelah transaksi disimpan.

## SRS-SALE-005: Menyimpan Transaksi Penjualan

**Prioritas:** Must Have
**Aktor:** Kasir, Manager, Sistem

### Input

- daftar item keranjang;
- diskon;
- metode pembayaran;
- uang diterima jika cash;
- catatan opsional;
- data pelanggan opsional.

### Proses Server-side

1. Backend memvalidasi ulang seluruh item.
2. Backend memastikan keranjang tidak kosong.
3. Backend memastikan produk aktif.
4. Backend memastikan satuan jual valid.
5. Backend menghitung qty satuan dasar.
6. Backend menghitung ulang subtotal final.
7. Backend memvalidasi diskon.
8. Backend menghitung total final.
9. Backend memvalidasi metode pembayaran.
10. Backend memvalidasi uang diterima untuk cash.
11. Backend menjalankan database transaction.
12. Backend mengambil dan mengunci batch valid berdasarkan FEFO.
13. Backend memastikan stok cukup setelah batch dikunci.
14. Backend melakukan split batch jika diperlukan.
15. Backend menyimpan transaksi.
16. Backend menyimpan detail transaksi dan alokasi batch.
17. Backend mengurangi stok batch.
18. Backend mencatat mutasi stok keluar.
19. Backend menghitung HPP detail.
20. Backend mengalokasikan diskon ke detail batch.
21. Backend menghitung laba detail.
22. Backend mengembalikan nomor transaksi dan ringkasan final.

### Validation Rules

| ID | Aturan |
|---|---|
| VAL-SALE-001 | Keranjang tidak boleh kosong |
| VAL-SALE-002 | Semua produk harus aktif |
| VAL-SALE-003 | Semua satuan jual harus valid |
| VAL-SALE-004 | Stok harus cukup saat transaksi disimpan |
| VAL-SALE-005 | Diskon tidak boleh melebihi subtotal |
| VAL-SALE-006 | Metode pembayaran wajib dipilih |
| VAL-SALE-007 | Pembayaran cash wajib memiliki uang diterima minimal sebesar total |
| VAL-SALE-008 | Transaksi final wajib dihitung server-side |
| VAL-SALE-009 | Transaksi gagal tidak boleh mengurangi stok |
| VAL-SALE-010 | Harga jual transaksi wajib memakai harga jual final yang ditetapkan Manager |
| VAL-SALE-011 | Payload frontend tidak boleh mengirim harga modal, HPP, margin, atau laba |

### Acceptance Criteria

- Transaksi valid tersimpan.
- Stok batch berkurang sesuai FEFO dan split batch.
- Mutasi stok keluar tercatat.
- Detail transaksi menyimpan batch, qty, harga jual final, HPP final, diskon alokasi, dan laba.
- Harga jual final transaksi tersimpan sebagai snapshot rupiah bulat.
- HPP dan laba internal tersimpan dengan presisi tinggi untuk laporan.
- Transaksi gagal tidak mengurangi stok.
- Frontend menerima response final dari backend.

## SRS-SALE-006: Metode Pembayaran

**Prioritas:** Must Have
**Aktor:** Kasir

### Metode Minimal

| Kode | Metode |
|---|---|
| CASH | Tunai |
| TRANSFER | Transfer manual |
| QRIS | QRIS manual |
| DEBIT | Debit manual |

### Rules

| ID | Aturan |
|---|---|
| RULE-PAY-001 | Metode pembayaran wajib dipilih |
| RULE-PAY-002 | Cash wajib mengisi uang diterima |
| RULE-PAY-003 | Cash wajib menghitung kembalian |
| RULE-PAY-004 | Non-cash tidak wajib memiliki uang diterima |
| RULE-PAY-005 | V1 tidak melakukan verifikasi otomatis payment gateway |

### Acceptance Criteria

- Cash menghitung kembalian otomatis.
- Cash ditolak jika uang diterima kurang.
- Non-cash dapat disimpan tanpa kembalian.
- Metode pembayaran tersimpan pada transaksi.

---

# 8.7A Modul Pelayanan Resep Dasar

## SRS-PRESC-001: Membuat dan Menyiapkan Resep

**Prioritas:** Should Have
**Aktor:** Apoteker, Manager

### Input

- nomor resep internal;
- tanggal resep diterima;
- nama pasien;
- kontak pasien opsional;
- nama dokter;
- fasilitas kesehatan opsional;
- apoteker otomatis dari user login;
- item obat, satuan jual aktif, qty, aturan pakai, catatan etiket, dan catatan substitusi.

### Rules

| ID | Aturan |
|---|---|
| RULE-PRESC-001 | Resep bukan transaksi final |
| RULE-PRESC-002 | Resep tidak langsung mengurangi stok |
| RULE-PRESC-003 | Status resep: `DRAFT`, `REVIEWED`, `READY_FOR_PAYMENT`, `PAID`, `COMPLETED`, `CANCELLED`, `NEED_CONFIRMATION` |
| RULE-PRESC-004 | Item resep wajib memakai satuan jual aktif |
| RULE-PRESC-005 | Sistem boleh menampilkan estimasi stok tersedia tetapi FEFO final tetap saat checkout |
| RULE-PRESC-006 | Tidak boleh ada validasi klinis otomatis, diagnosis otomatis, atau rekomendasi interaksi obat otomatis |

### Acceptance Criteria

- Apoteker dapat membuat resep dokter.
- Resep memuat data pasien, dokter, obat, qty, satuan, dan aturan pakai.
- Resep tidak mengurangi stok.
- Resep dapat ditandai siap bayar.

## SRS-PRESC-002: Tarik Resep ke Kasir

**Prioritas:** Should Have
**Aktor:** Kasir, Manager

### Rules

| ID | Aturan |
|---|---|
| RULE-PRESC-CASHIER-001 | Kasir hanya dapat menarik resep berstatus `READY_FOR_PAYMENT` |
| RULE-PRESC-CASHIER-002 | Item resep masuk ke keranjang kasir sebagai draft |
| RULE-PRESC-CASHIER-003 | Stok berkurang setelah checkout berhasil |
| RULE-PRESC-CASHIER-004 | Checkout resep tetap menjalankan FEFO, split batch, mutasi stok, dan sanitasi role |

### Acceptance Criteria

- Kasir dapat menarik resep siap bayar ke transaksi.
- Stok berkurang setelah checkout kasir berhasil.
- Status resep berubah menjadi `PAID` atau `COMPLETED` setelah checkout berhasil.

---

# 8.7B Modul Konseling Dasar

## SRS-COUNS-001: Mencatat Konseling

**Prioritas:** Could Have
**Aktor:** Apoteker, Manager

### Input

- tanggal konseling;
- apoteker otomatis dari user login;
- nama pasien opsional;
- resep terkait opsional;
- transaksi terkait opsional;
- topik;
- catatan;
- status `COMPLETED` atau `CANCELLED`.

### Rules

| ID | Aturan |
|---|---|
| RULE-COUNS-001 | Konseling tidak menambah stok |
| RULE-COUNS-002 | Konseling tidak mengurangi stok |
| RULE-COUNS-003 | Konseling tidak membuat tagihan |
| RULE-COUNS-004 | Konseling hanya dokumentasi pelayanan |
| RULE-COUNS-005 | Konseling tidak boleh menjadi clinical decision support otomatis |

### Acceptance Criteria

- Apoteker dapat mencatat konseling.
- Konseling dapat terkait resep atau transaksi.
- Konseling tidak mengubah stok.
- Konseling tidak membuat tagihan.

---

# 8.8 Modul FEFO dan Split Batch

## SRS-FEFO-001: Pemilihan Batch FEFO

**Prioritas:** Must Have
**Aktor:** Sistem

### Rules

| ID | Aturan |
|---|---|
| RULE-FEFO-001 | FEFO dihitung server-side |
| RULE-FEFO-002 | Batch expired tidak boleh dipilih |
| RULE-FEFO-003 | Batch nonaktif tidak boleh dipilih |
| RULE-FEFO-004 | Batch stok nol tidak boleh dipilih |
| RULE-FEFO-005 | Batch dengan expired date terdekat diprioritaskan |
| RULE-FEFO-006 | Jika expired date sama, batch dengan tanggal masuk lebih awal diprioritaskan |
| RULE-FEFO-007 | Jika stok batch pertama tidak cukup, sistem mengambil batch berikutnya |
| RULE-FEFO-008 | FEFO final tidak boleh ditentukan frontend |

### Acceptance Criteria

- Batch terdekat expired dipakai lebih dulu.
- Batch expired tidak digunakan.
- Batch stok nol tidak digunakan.
- FEFO tetap berjalan walaupun estimasi frontend berbeda.

## SRS-SPLIT-001: Split Detail Transaksi Multi-Batch

**Prioritas:** Must Have
**Aktor:** Sistem

### Deskripsi
Jika satu item transaksi mengambil stok dari lebih dari satu batch, sistem harus memecah detail transaksi berdasarkan batch.

### Contoh

```text
Kasir menjual 15 tablet.
Batch A tersedia 10 tablet, expired paling dekat.
Batch B tersedia 20 tablet.

Sistem menyimpan:
- Detail 1: Batch A, qty 10 tablet
- Detail 2: Batch B, qty 5 tablet
```

### Rules

| ID | Aturan |
|---|---|
| RULE-SPLIT-001 | Split dilakukan server-side |
| RULE-SPLIT-002 | Setiap split detail menyimpan batch asal |
| RULE-SPLIT-003 | Setiap split detail menyimpan HPP final |
| RULE-SPLIT-004 | Setiap split detail menyimpan harga jual final |
| RULE-SPLIT-005 | Setiap split detail menyimpan diskon alokasi |
| RULE-SPLIT-006 | Retur penjualan harus mengacu pada split detail transaksi |

### Acceptance Criteria

- Transaksi multi-batch tersimpan sebagai beberapa detail batch.
- Laporan laba memakai detail batch.
- Retur mengembalikan stok ke batch asal.
- Stok tiap batch berkurang sesuai split.

---

# 8.9 Modul Diskon

## SRS-DISC-001: Diskon Persen dan Nominal

**Prioritas:** Must Have
**Aktor:** Kasir, Manager

### Input

- tipe diskon: NONE, PERCENT, NOMINAL;
- nilai diskon.

### Validation Rules

| ID | Aturan |
|---|---|
| VAL-DISC-001 | Tipe diskon wajib valid |
| VAL-DISC-002 | Nilai diskon tidak boleh negatif |
| VAL-DISC-003 | Diskon persen tidak boleh lebih dari 100% |
| VAL-DISC-004 | Diskon nominal tidak boleh lebih besar dari subtotal |
| VAL-DISC-005 | Total setelah diskon tidak boleh negatif |

### Formula

```text
diskon_persen = subtotal_transaksi * nilai_persen / 100
total_transaksi = subtotal_transaksi - total_diskon
```

### Acceptance Criteria

- Diskon persen dapat dihitung.
- Diskon nominal dapat dihitung.
- Diskon melebihi subtotal ditolak.
- Diskon tersimpan pada transaksi.

## SRS-DISC-002: Alokasi Diskon ke Detail Batch

**Prioritas:** Must Have
**Aktor:** Sistem

### Formula

```text
diskon_alokasi_detail = (subtotal_detail / subtotal_transaksi) * total_diskon
```

### Rules

| ID | Aturan |
|---|---|
| RULE-DISC-ALLOC-001 | Alokasi diskon dilakukan server-side |
| RULE-DISC-ALLOC-002 | Total diskon alokasi harus sama dengan total diskon transaksi |
| RULE-DISC-ALLOC-003 | Selisih pembulatan harus ditangani secara deterministik |
| RULE-DISC-ALLOC-004 | Diskon alokasi memengaruhi laba detail |

### Acceptance Criteria

- Setiap detail transaksi memiliki diskon alokasi.
- Total diskon alokasi sama dengan total diskon transaksi.
- Laba detail memperhitungkan diskon alokasi.

---

# 8.10 Modul Retur Penjualan

## SRS-RETSALE-001: Membuat Retur Penjualan

**Prioritas:** Must Have
**Aktor:** Kasir, Manager

### Input

- nomor transaksi asal;
- item yang diretur;
- qty retur;
- alasan retur;
- catatan opsional.

### Proses

1. Kasir atau Manager mencari transaksi asal.
2. Sistem menampilkan item yang dapat diretur.
3. Pengguna memilih item.
4. Pengguna mengisi qty retur.
5. Pengguna mengisi alasan retur.
6. Backend memvalidasi qty retur.
7. Backend mengembalikan stok ke batch asal.
8. Backend mencatat mutasi stok masuk.
9. Backend menyimpan riwayat retur.
10. Backend mengoreksi laporan laba.

### Validation Rules

| ID | Aturan |
|---|---|
| VAL-RETSALE-001 | Transaksi asal wajib ada |
| VAL-RETSALE-002 | Item transaksi wajib dipilih |
| VAL-RETSALE-003 | Qty retur wajib lebih besar dari 0 |
| VAL-RETSALE-004 | Qty retur tidak boleh melebihi sisa qty yang belum diretur |
| VAL-RETSALE-005 | Alasan retur wajib diisi |
| VAL-RETSALE-006 | Retur harus mengacu ke detail batch asal |

### Acceptance Criteria

- Retur penjualan dapat dilakukan sebagian.
- Retur tidak dapat melebihi qty tersedia untuk retur.
- Stok kembali ke batch asal.
- Mutasi stok masuk tercatat.
- Laporan laba terkoreksi.
- Transaksi asli tidak dihapus.

---

# 8.11 Modul Retur Pembelian

## SRS-RETPUR-001: Membuat Retur Pembelian

**Prioritas:** Should Have
**Aktor:** Manager

### Input

- pembelian asal atau batch terkait;
- produk;
- batch;
- qty retur;
- alasan retur;
- catatan opsional.

### Validation Rules

| ID | Aturan |
|---|---|
| VAL-RETPUR-001 | Batch wajib dipilih |
| VAL-RETPUR-002 | Qty retur wajib lebih besar dari 0 |
| VAL-RETPUR-003 | Qty retur tidak boleh melebihi stok batch tersedia |
| VAL-RETPUR-004 | Alasan retur wajib diisi |
| VAL-RETPUR-005 | Retur pembelian harus mengurangi stok batch terkait |

### Acceptance Criteria

- Retur pembelian dapat disimpan.
- Stok batch berkurang.
- Mutasi stok keluar tercatat.
- Sistem menolak retur jika stok tidak cukup.
- Riwayat retur pembelian tersimpan.

---

# 8.12 Modul Stok, Mutasi, dan Koreksi

## SRS-STOCK-001: Melihat Stok Produk

**Prioritas:** Must Have
**Aktor:** Manager, Kasir

### Data Minimal

- produk;
- kategori;
- total stok dalam satuan dasar;
- stok per batch;
- expired date;
- status batch;
- stok minimum;
- indikator stok kritis.

### Rules

| ID | Aturan |
|---|---|
| RULE-STOCK-001 | Kasir hanya melihat stok yang relevan untuk transaksi |
| RULE-STOCK-002 | Manager dapat melihat stok per batch |
| RULE-STOCK-003 | Total stok produk dihitung dari batch aktif yang valid |
| RULE-STOCK-004 | Batch expired ditampilkan dengan status khusus |
| RULE-STOCK-005 | Batch expired tidak dihitung sebagai stok tersedia normal |

### Acceptance Criteria

- Manager dapat melihat stok per batch.
- Kasir dapat melihat stok tersedia untuk transaksi.
- Produk stok rendah ditandai.
- Batch expired ditandai.

## SRS-STOCK-002: Mutasi Stok Otomatis

**Prioritas:** Must Have
**Aktor:** Sistem

### Tipe Mutasi

| Kode | Tipe |
|---|---|
| PURCHASE_IN | Stok masuk dari pembelian |
| SALE_OUT | Stok keluar dari penjualan |
| SALES_RETURN_IN | Stok masuk dari retur penjualan |
| PURCHASE_RETURN_OUT | Stok keluar dari retur pembelian |
| STOCK_ADJUSTMENT_IN | Stok masuk dari koreksi |
| STOCK_ADJUSTMENT_OUT | Stok keluar dari koreksi |

### Data Mutasi Minimal

- produk;
- batch;
- tipe mutasi;
- qty sebelum;
- qty perubahan;
- qty sesudah;
- referensi transaksi;
- user pelaku;
- waktu mutasi;
- alasan jika koreksi atau retur.

### Acceptance Criteria

- Pembelian membuat mutasi stok masuk.
- Penjualan membuat mutasi stok keluar.
- Retur penjualan membuat mutasi stok masuk.
- Retur pembelian membuat mutasi stok keluar.
- Koreksi stok membuat mutasi sesuai perubahan.
- Mutasi stok dapat ditelusuri.

## SRS-STOCK-003: Koreksi Stok

**Prioritas:** Should Have
**Aktor:** Manager

### Input

- produk;
- batch;
- qty hasil koreksi;
- alasan koreksi.

### Validation Rules

| ID | Aturan |
|---|---|
| VAL-ADJ-001 | Batch wajib dipilih |
| VAL-ADJ-002 | Qty hasil koreksi tidak boleh negatif |
| VAL-ADJ-003 | Alasan koreksi wajib diisi |
| VAL-ADJ-004 | Kasir tidak boleh melakukan koreksi stok |

### Acceptance Criteria

- Manager dapat melakukan koreksi stok.
- Sistem mencatat mutasi koreksi.
- Alasan koreksi tersimpan.
- Kasir tidak dapat melakukan koreksi stok.

## SRS-STOCK-004: Alert Stok Minimum

**Prioritas:** Must Have
**Aktor:** Manager, Pemilik

### Rules

| ID | Aturan |
|---|---|
| RULE-MINSTOCK-001 | Stok minimum ditentukan pada produk |
| RULE-MINSTOCK-002 | Alert muncul jika total stok tersedia <= stok minimum |
| RULE-MINSTOCK-003 | Produk nonaktif tidak perlu muncul pada alert stok minimum aktif |
| RULE-MINSTOCK-004 | Batch expired tidak dihitung sebagai stok tersedia normal |

### Acceptance Criteria

- Dashboard menampilkan jumlah produk stok kritis.
- Manager dapat melihat daftar produk stok kritis.
- Alert berubah setelah stok bertambah atau berkurang.

---

# 8.13 Modul Dashboard

## SRS-DASH-001: Dashboard Manager/Pemilik

**Prioritas:** Must Have
**Aktor:** Manager, Pemilik

### Komponen Minimal

| ID | Komponen |
|---|---|
| DASH-COMP-001 | Omzet hari ini |
| DASH-COMP-002 | Laba hari ini |
| DASH-COMP-003 | Laba minggu ini |
| DASH-COMP-004 | Laba bulan ini |
| DASH-COMP-005 | Laba tahun ini |
| DASH-COMP-006 | Jumlah transaksi hari ini |
| DASH-COMP-007 | Jumlah produk stok kritis |
| DASH-COMP-008 | Jumlah batch mendekati expired |
| DASH-COMP-009 | Daftar stok kritis |
| DASH-COMP-010 | Daftar batch mendekati expired |
| DASH-COMP-011 | Transaksi terbaru |

### Rules

| ID | Aturan |
|---|---|
| RULE-DASH-001 | Laba dashboard dihitung dari detail transaksi |
| RULE-DASH-002 | Retur penjualan harus mengoreksi nilai dashboard |
| RULE-DASH-003 | Kasir hanya boleh melihat dashboard terbatas jika disediakan |
| RULE-DASH-004 | Dashboard tidak boleh menampilkan HPP dan laba kepada kasir |

### Acceptance Criteria

- Dashboard Manager tampil setelah login.
- Omzet dan laba sesuai periode.
- Alert stok dan expired tampil.
- Kasir tidak dapat melihat laba.

---

# 8.14 Modul Laporan dan Ekspor

## SRS-REPORT-001: Laporan Penjualan

**Prioritas:** Must Have
**Aktor:** Manager, Pemilik

### Filter

- hari ini;
- minggu ini;
- bulan ini;
- tahun ini;
- rentang tanggal kustom;
- metode pembayaran opsional;
- kasir opsional;
- produk opsional;
- kategori opsional.

### Data Minimal

- nomor transaksi;
- tanggal transaksi;
- kasir;
- metode pembayaran;
- subtotal;
- diskon;
- total;
- retur terkait jika ada.

### Acceptance Criteria

- Laporan dapat difilter berdasarkan periode.
- Laporan menampilkan daftar transaksi.
- Retur ditampilkan atau diperhitungkan dengan jelas.
- Manager dapat melihat detail transaksi.

## SRS-REPORT-002: Laporan Laba

**Prioritas:** Must Have
**Aktor:** Manager, Pemilik

### Data Minimal

- omzet;
- HPP;
- diskon;
- laba kotor penjualan;
- koreksi retur;
- laba bersih penjualan setelah retur;
- rincian per produk;
- rincian per batch jika dibutuhkan.

### Formula

```text
laba_detail = subtotal_detail - hpp_detail - diskon_alokasi_detail
laba_periode = jumlah_laba_detail - koreksi_laba_retur
```

### Rules

| ID | Aturan |
|---|---|
| RULE-REPORT-001 | Laba tidak boleh dihitung dari harga produk terbaru |
| RULE-REPORT-002 | Laba harus dihitung dari detail transaksi tersimpan |
| RULE-REPORT-003 | Retur penjualan mengoreksi omzet, HPP, diskon, dan laba |
| RULE-REPORT-004 | Kasir tidak boleh mengakses laporan laba |
| RULE-REPORT-005 | Perubahan harga setelah transaksi tidak boleh mengubah laporan lama |

### Acceptance Criteria

- Laporan laba dapat difilter berdasarkan periode.
- Laporan laba tidak berubah ketika harga batch terbaru diubah.
- Retur penjualan mengurangi laba sesuai detail retur.
- Kasir tidak dapat membuka laporan laba.

## SRS-EXPORT-001: Ekspor Laporan

**Prioritas:** Should Have
**Aktor:** Manager, Pemilik

### Format

| Format | Status |
|---|---|
| `.xlsx` | Wajib jika fitur ekspor dibuat |
| `.pdf` | Wajib jika fitur ekspor dibuat |

### Isi Minimal File

- nama laporan;
- periode laporan;
- tanggal ekspor;
- ringkasan omzet;
- ringkasan HPP;
- ringkasan diskon;
- ringkasan laba;
- detail data sesuai filter.

### Acceptance Criteria

- File Excel berhasil dibuat.
- File PDF berhasil dibuat.
- Isi file sesuai filter aktif.
- Kasir tidak dapat mengekspor laporan laba.

---

# 8.15 Modul Pengaturan Dasar

## SRS-SETTING-001: Pengaturan Profil Apotek

**Prioritas:** Could Have
**Aktor:** Manager

### Data

- nama apotek;
- alamat;
- nomor telepon;
- logo opsional;
- catatan struk opsional.

### Acceptance Criteria

- Manager dapat mengubah profil apotek.
- Profil apotek dapat digunakan pada tampilan, struk, atau ekspor laporan.
- Jika tidak diisi, sistem tetap berjalan dengan nilai default.

---

## 9. Kebutuhan Data Tingkat SRS

Bagian ini mendefinisikan entitas konseptual. Struktur tabel final, tipe data, relasi, index, dan constraint dibuat pada SDD.

| Entitas | Keterangan |
|---|---|
| User | Data akun pengguna |
| Role | Hak akses pengguna |
| Product | Data produk obat/barang |
| Category | Kategori produk |
| Supplier | Data supplier |
| Unit | Master satuan |
| Product Unit Conversion | Konversi satuan jual ke satuan dasar |
| Batch | Stok produk berdasarkan batch |
| Batch Price | Harga jual batch per satuan jual jika dipisahkan dari batch |
| Purchase Order | Rencana pemesanan obat ke supplier yang tidak mengubah stok |
| Purchase Order Item | Detail item PO dan qty yang sudah diterima |
| Purchase | Transaksi pembelian supplier |
| Purchase Item | Detail produk yang dibeli |
| Prescription | Resep dasar yang disiapkan sebelum pembayaran |
| Prescription Item | Detail obat dan aturan pakai pada resep |
| Counseling Record | Catatan konseling dasar |
| Sale | Transaksi penjualan |
| Sale Item | Detail item utama penjualan |
| Sale Batch Allocation | Detail alokasi batch pada penjualan |
| Sales Return | Retur penjualan |
| Sales Return Item | Detail retur penjualan |
| Purchase Return | Retur pembelian |
| Purchase Return Item | Detail retur pembelian |
| Stock Mutation | Riwayat perubahan stok |
| Stock Adjustment | Koreksi stok |
| Report View | Data olahan laporan |
| Setting | Pengaturan dasar sistem |
| Audit Log | Catatan aktivitas penting |
| Refresh Token | Token sesi jika menggunakan JWT refresh token |
| Customer Receivable | Future enhancement untuk piutang pelanggan |
| Receivable Payment | Future enhancement untuk pembayaran piutang |

---

## 10. Kontrak Sinkronisasi Frontend dan Backend

### 10.1 Prinsip Integrasi

| ID | Prinsip | Aturan |
|---|---|---|
| SYNC-001 | Frontend mengirim data minimal | Frontend tidak mengirim HPP, laba, batch final, diskon alokasi final |
| SYNC-002 | Backend menghitung final | Backend menghitung ulang subtotal, diskon, total, FEFO, split batch, HPP, laba |
| SYNC-003 | Backend mengembalikan hasil final | Frontend menampilkan response final dari backend |
| SYNC-004 | Error backend dipetakan ke UI | Frontend menampilkan pesan jelas berdasarkan error code |
| SYNC-005 | Mutation memicu refresh data | Setelah transaksi, frontend harus refresh stok, dashboard, laporan, dan riwayat |

### 10.2 Format Response Sukses Standar

```json
{
  "success": true,
  "message": "Transaksi berhasil disimpan",
  "data": {}
}
```

### 10.3 Format Response Error Standar

```json
{
  "success": false,
  "error": {
    "code": "STOCK_NOT_ENOUGH",
    "message": "Stok produk tidak mencukupi",
    "details": []
  }
}
```

### 10.4 Payload Submit Transaksi dari Frontend

Frontend mengirim payload ringkas:

```json
{
  "items": [
    {
      "productId": "uuid",
      "unitId": "uuid",
      "qty": 2,
      "note": "opsional"
    }
  ],
  "discountType": "PERCENT",
  "discountValue": 10,
  "paymentMethod": "CASH",
  "cashReceived": 50000,
  "note": "opsional"
}
```

Frontend **tidak boleh** mengirim nilai berikut sebagai final:

```text
hpp_final
profit_final
batch_final
fefo_result_final
split_batch_final
discount_allocation_final
stock_mutation_final
```

### 10.5 Response Sukses Transaksi dari Backend

```json
{
  "saleId": "uuid",
  "invoiceNumber": "INV-20260602-0001",
  "saleDate": "2026-06-02T13:30:00+07:00",
  "subtotal": 50000,
  "discountTotal": 5000,
  "grandTotal": 45000,
  "paymentMethod": "CASH",
  "cashReceived": 50000,
  "change": 5000,
  "items": [
    {
      "productName": "Paracetamol 500mg",
      "unitName": "strip",
      "qty": 2,
      "unitPrice": 10000,
      "subtotal": 20000
    }
  ]
}
```

Catatan:

- Response untuk Kasir tidak boleh memuat HPP dan laba.
- Response untuk Manager boleh memuat detail finansial jika endpoint memang ditujukan untuk laporan atau detail Manager.

### 10.6 Mapping Error Backend ke UI

| Error Code | Pesan UI |
|---|---|
| VALIDATION_ERROR | Data yang diisi belum valid. Periksa kembali field yang ditandai. |
| UNAUTHORIZED | Sesi tidak valid. Silakan login ulang. |
| ACCESS_DENIED | Anda tidak memiliki akses ke fitur ini. |
| SESSION_EXPIRED | Sesi login berakhir. Silakan login ulang. |
| DATA_NOT_FOUND | Data tidak ditemukan. |
| DUPLICATE_DATA | Data sudah digunakan. Gunakan data lain. |
| PRODUCT_INACTIVE | Produk ini tidak dapat dijual karena sudah nonaktif. |
| UNIT_INVALID | Satuan jual tidak valid untuk produk ini. |
| BATCH_EXPIRED | Batch produk sudah kedaluwarsa dan tidak dapat dijual. |
| VALID_BATCH_NOT_AVAILABLE | Batch aktif dengan stok tersedia tidak ditemukan. |
| STOCK_NOT_ENOUGH | Stok produk tidak mencukupi. |
| STOCK_NEGATIVE_NOT_ALLOWED | Stok tidak boleh menjadi negatif. |
| CART_EMPTY | Keranjang transaksi masih kosong. |
| DISCOUNT_EXCEEDS_SUBTOTAL | Diskon tidak boleh melebihi subtotal transaksi. |
| CASH_NOT_ENOUGH | Nominal pembayaran belum mencukupi. |
| RETURN_QTY_EXCEEDS_AVAILABLE | Qty retur melebihi jumlah yang dapat diretur. |
| TRANSACTION_FAILED | Transaksi gagal disimpan. Stok tidak berubah. |
| EXPORT_FAILED | Ekspor laporan gagal. Silakan ulangi. |
| SERVER_ERROR | Terjadi kesalahan sistem. Silakan ulangi proses. |

### 10.7 Query Invalidation Frontend Setelah Mutation

| Aksi | Data yang Harus Di-refresh |
|---|---|
| Simpan transaksi | produk, stok, dashboard, sales, reports |
| Pembelian supplier | batch, stok, purchases, dashboard |
| Retur penjualan | stock, sales, sales-returns, reports, dashboard |
| Retur pembelian | stock, purchase-returns, dashboard |
| Koreksi stok | stock, stock-mutations, dashboard |
| Update produk | products, cashier search |
| Update batch | batches, stock, cashier search |

---

## 11. Kebutuhan Nonfungsional

## SRS-NFR-001: Responsivitas Tampilan

**Prioritas:** Must Have

### Requirements

- Sistem dapat digunakan pada desktop, laptop, tablet, dan mobile terbatas.
- Halaman kasir tidak memiliki horizontal scroll yang tidak perlu.
- Sidebar dapat menyesuaikan ukuran layar.
- Elemen utama kasir tetap dapat digunakan pada layar kecil.

### Acceptance Criteria

- Layout tidak pecah pada browser modern.
- Table responsive berada dalam container, bukan membuat seluruh halaman melebar.
- Tombol utama tetap mudah diakses.

## SRS-NFR-002: Keamanan Akses

**Prioritas:** Must Have

### Requirements

- Halaman internal memerlukan login.
- Role membatasi fitur.
- Password tidak boleh disimpan plaintext.
- Kasir tidak dapat mengakses HPP dan laba.
- Token atau sesi dapat dibatalkan saat logout.

### Acceptance Criteria

- URL terlindungi tidak dapat dibuka tanpa login.
- Role tidak berhak mendapat akses ditolak.
- Data sensitif tidak tampil untuk role kasir.

## SRS-NFR-003: Konsistensi Data

**Prioritas:** Must Have

### Requirements

- Transaksi final harus atomic.
- Jika proses simpan transaksi gagal, stok tidak boleh berubah sebagian.
- Stok batch tidak boleh negatif.
- Setiap mutasi stok memiliki referensi.
- Perhitungan final transaksi dilakukan server-side.

### Acceptance Criteria

- Transaksi gagal tidak mengurangi stok.
- Stok tidak negatif.
- Mutasi stok sesuai transaksi.
- Laporan sesuai detail transaksi.

## SRS-NFR-004: Auditability

**Prioritas:** Must Have

### Requirements

- Transaksi memiliki waktu dan user pembuat.
- Mutasi stok memiliki waktu, user, dan referensi.
- Retur memiliki alasan.
- Koreksi stok memiliki alasan.
- Data historis tidak dihapus permanen tanpa mekanisme audit.

### Acceptance Criteria

- Manager dapat menelusuri perubahan stok.
- Manager dapat melihat transaksi asal dari retur.
- Data historis tetap tersedia.

## SRS-NFR-005: Performa Pencarian

**Prioritas:** Should Have

### Requirements

- Pencarian produk cukup cepat untuk katalog 500 sampai 2.000 produk.
- Pencarian tidak memblokir halaman kasir secara berlebihan.
- UI menampilkan loading state jika pencarian membutuhkan waktu.

### Acceptance Criteria

- Kasir dapat mencari produk tanpa jeda yang mengganggu transaksi.
- Sistem tetap dapat digunakan saat katalog bertambah.

## SRS-NFR-006: Kejelasan Pesan Error

**Prioritas:** Must Have

### Requirements

- Pesan error spesifik.
- Pesan error menjelaskan penyebab utama.
- Pesan error tidak menampilkan kode teknis mentah tanpa penjelasan.
- Error validasi muncul pada field terkait jika memungkinkan.

### Acceptance Criteria

- Pengguna memahami input mana yang salah.
- Error transaksi menjelaskan penyebab kegagalan.
- Error akses ditolak tampil jelas.

## SRS-NFR-007: Maintainability

**Prioritas:** Should Have

### Requirements

- Modul dipisahkan secara jelas.
- Logika stok, batch, FEFO, diskon, dan laba tidak tersebar di frontend.
- Logika bisnis utama mudah diuji.
- Istilah sistem konsisten.

### Acceptance Criteria

- Modul transaksi tidak bercampur dengan UI laporan.
- Service atau fungsi perhitungan dapat diuji.
- Istilah produk, batch, stok, HPP, dan laba digunakan konsisten.

---

## 12. Aturan Validasi Global

| ID | Aturan |
|---|---|
| GVAL-001 | Field wajib tidak boleh kosong |
| GVAL-002 | Qty harus lebih besar dari 0, kecuali stok minimum dan stok awal boleh 0 |
| GVAL-003 | Nilai uang tidak boleh negatif |
| GVAL-004 | Diskon tidak boleh membuat total negatif |
| GVAL-005 | Tanggal transaksi wajib valid |
| GVAL-006 | Expired date wajib valid |
| GVAL-007 | Produk nonaktif tidak boleh digunakan transaksi baru |
| GVAL-008 | Supplier nonaktif tidak boleh digunakan pembelian baru |
| GVAL-009 | Batch expired tidak boleh digunakan transaksi penjualan normal |
| GVAL-010 | Stok tidak boleh negatif |
| GVAL-011 | Role tidak berhak harus ditolak |
| GVAL-012 | Retur wajib memiliki referensi asal |
| GVAL-013 | Koreksi stok wajib memiliki alasan |
| GVAL-014 | Semua kalkulasi final transaksi wajib server-side |
| GVAL-015 | Data historis tidak boleh berubah akibat perubahan harga baru |
| GVAL-016 | Waktu transaksi final wajib berasal dari backend |
| GVAL-017 | PO tidak boleh mengubah stok |
| GVAL-018 | Resep tidak boleh mengurangi stok sebelum checkout |
| GVAL-019 | Kasir hanya boleh memakai satuan jual aktif |
| GVAL-020 | Uang, HPP, pajak, diskon, dan laba wajib memakai NUMERIC/DECIMAL, bukan FLOAT/DOUBLE/REAL |
| GVAL-021 | Piutang pelanggan bukan fitur inti V1 |

---

## 13. Error State Global

| ID | Kondisi | Respon Sistem |
|---|---|---|
| ERR-001 | Data tidak ditemukan | Tampilkan empty state dan pesan data tidak ditemukan |
| ERR-002 | Akses ditolak | Tampilkan pesan akses ditolak |
| ERR-003 | Sesi habis | Arahkan ke login |
| ERR-004 | Validasi gagal | Tampilkan pesan pada field terkait |
| ERR-005 | Stok tidak cukup | Tampilkan produk dan jumlah stok tersedia jika aman |
| ERR-006 | Batch tidak tersedia | Tampilkan pesan batch valid tidak tersedia |
| ERR-007 | Transaksi gagal | Transaksi tidak disimpan dan stok tidak berubah |
| ERR-008 | Server error | Tampilkan pesan umum dan sarankan ulangi proses |
| ERR-009 | Ekspor gagal | Tampilkan pesan ekspor gagal |
| ERR-010 | Data konflik | Tampilkan pesan bahwa data sudah berubah dan perlu dimuat ulang |

---

## 14. State Sistem Penting

| State | Penjelasan |
|---|---|
| Produk aktif | Dapat dipakai transaksi baru |
| Produk nonaktif | Tidak dapat dipakai transaksi baru, tetapi histori tetap tampil |
| Batch aktif | Dapat dipakai jika belum expired dan stok tersedia |
| Batch habis | Stok nol |
| Batch expired | Melewati tanggal kedaluwarsa |
| Batch nonaktif | Tidak boleh digunakan transaksi baru |
| Keranjang draft | Transaksi belum disimpan, belum memengaruhi stok |
| Transaksi final | Transaksi tersimpan dan memengaruhi stok |
| Transaksi retur sebagian | Sebagian item sudah diretur |
| Transaksi retur penuh | Semua item yang dapat diretur sudah diretur |
| Retur final | Retur tersimpan dan memengaruhi stok |
| Pembelian final | Pembelian tersimpan dan menambah stok |
| Retur pembelian final | Retur pembelian tersimpan dan mengurangi stok |

---

## 15. Rumus Sistem

### 15.1 Konversi Qty Penjualan ke Satuan Dasar

```text
qty_satuan_dasar = qty_jual * faktor_konversi_satuan_jual
```

### 15.2 Subtotal Detail

```text
subtotal_detail = qty_jual * harga_jual_per_satuan_jual
```

### 15.3 HPP Detail

```text
hpp_detail = qty_satuan_dasar * hpp_satuan_dasar
```

### 15.4 Diskon Persen

```text
total_diskon = subtotal_transaksi * nilai_diskon_persen / 100
```

### 15.5 Diskon Nominal

```text
total_diskon = nilai_diskon_nominal
```

### 15.6 Total Transaksi

```text
total_transaksi = subtotal_transaksi - total_diskon
```

### 15.7 Kembalian Cash

```text
kembalian = uang_diterima - total_transaksi
```

### 15.8 Diskon Alokasi Detail

```text
diskon_alokasi_detail = (subtotal_detail / subtotal_transaksi) * total_diskon
```

### 15.9 Laba Detail

```text
laba_detail = subtotal_detail - hpp_detail - diskon_alokasi_detail
```

`subtotal_detail` berasal dari harga jual final snapshot yang ditetapkan Manager. `hpp_detail` berasal dari HPP internal presisi tinggi. Laba internal boleh berpresisi tinggi; nilai laporan yang ditampilkan kepada Manager dapat dibulatkan sebagai `profit_display`.

### 15.10 Laba Periode

```text
laba_periode = total_laba_detail_penjualan - total_koreksi_laba_retur
```

Catatan:

- Strategi pembulatan uang harus ditentukan pada SDD.
- Selisih pembulatan diskon alokasi harus diselesaikan secara deterministik.
- Backend menjadi sumber kebenaran seluruh rumus final.

---

## 16. Acceptance Criteria Sistem V1

Sistem V1 dianggap memenuhi SRS jika:

| ID | Acceptance Criteria |
|---|---|
| SAC-001 | Pengguna dapat login dan logout |
| SAC-002 | Role membatasi akses fitur |
| SAC-003 | Kasir tidak dapat mengakses HPP, laba, dan laporan laba |
| SAC-004 | Manager dapat mengelola produk, kategori, supplier, satuan, batch |
| SAC-005 | Pembelian supplier menambah stok batch |
| SAC-006 | Pembelian mencatat mutasi stok masuk |
| SAC-007 | HPP satuan dasar dihitung dari pembelian |
| SAC-007A | PO dapat dibuat, dicetak, tidak mengubah stok, dan dapat ditarik ke pembelian |
| SAC-007B | Pembelian dapat dibuat manual atau dari PO |
| SAC-007C | Pembelian mendukung diskon pembelian, PPN/non-PPN, dan validasi faktur supplier |
| SAC-007D | Setiap barang masuk wajib memiliki batch number dan expired date |
| SAC-008 | Kasir dapat mencari produk |
| SAC-009 | Kasir dapat memilih satuan jual |
| SAC-009A | Kasir hanya dapat memilih satuan jual aktif dan backend menolak satuan tidak aktif |
| SAC-010 | Kasir dapat menambahkan, mengubah, dan menghapus item keranjang |
| SAC-011 | Sistem menghitung estimasi subtotal, diskon, total, uang diterima, dan kembalian di frontend |
| SAC-012 | Backend menghitung ulang transaksi final |
| SAC-013 | Sistem menolak transaksi stok tidak cukup |
| SAC-014 | Sistem menjalankan FEFO saat transaksi disimpan |
| SAC-015 | Sistem membuat split detail transaksi jika stok berasal dari lebih dari satu batch |
| SAC-016 | Transaksi final mengurangi stok batch |
| SAC-017 | Transaksi final mencatat mutasi stok keluar |
| SAC-018 | Detail transaksi menyimpan harga jual final, HPP final, diskon alokasi, dan laba |
| SAC-019 | Diskon persen dan nominal berjalan |
| SAC-020 | Diskon tidak boleh melebihi subtotal |
| SAC-021 | Retur penjualan mengacu transaksi asal dan batch asal |
| SAC-022 | Retur penjualan mengembalikan stok ke batch asal |
| SAC-023 | Retur penjualan mencatat mutasi stok masuk |
| SAC-024 | Retur penjualan mengoreksi laporan laba |
| SAC-025 | Retur pembelian mengurangi stok batch jika fitur diaktifkan |
| SAC-026 | Koreksi stok hanya dapat dilakukan Manager |
| SAC-027 | Dashboard menampilkan omzet, laba, stok kritis, dan expired alert |
| SAC-028 | Laporan penjualan dapat difilter berdasarkan periode |
| SAC-029 | Laporan laba dihitung dari detail transaksi |
| SAC-030 | Perubahan harga tidak mengubah histori transaksi lama |
| SAC-031 | Ekspor laporan Excel dan PDF tersedia jika fitur ekspor diaktifkan |
| SAC-032 | Halaman kasir responsif |
| SAC-033 | Pesan error validasi jelas |
| SAC-034 | Transaksi gagal tidak mengurangi stok |
| SAC-035 | Produk nonaktif tidak dapat dipilih untuk transaksi baru |
| SAC-036 | Data histori tetap tersedia |
| SAC-037 | Waktu transaksi final berasal dari backend dengan zona waktu konsisten |
| SAC-038 | Frontend menerima dan menampilkan hasil final transaksi dari backend |
| SAC-039 | Apoteker dapat membuat resep dasar dan resep tidak mengurangi stok sebelum checkout |
| SAC-040 | Kasir dapat menarik resep siap bayar ke transaksi |
| SAC-041 | Konseling dasar dapat dicatat tanpa tagihan dan tanpa perubahan stok |
| SAC-042 | Piutang pelanggan tetap future enhancement |

---

## 17. Traceability SRS ke Modul Sistem

| SRS ID | Modul Sistem | Keterangan |
|---|---|---|
| SRS-AUTH-001 | Auth | Login pengguna |
| SRS-AUTH-002 | Auth | Logout pengguna |
| SRS-AUTH-003 | Auth/RBAC | Proteksi role |
| SRS-PROD-001 | Products | Membuat produk |
| SRS-PROD-002 | Products | Mengubah produk |
| SRS-PROD-003 | Products | Menonaktifkan produk |
| SRS-PROD-004 | Products/Cashier | Pencarian produk |
| SRS-CAT-001 | Categories | Manajemen kategori |
| SRS-SUP-001 | Suppliers | Manajemen supplier |
| SRS-UNIT-001 | Units | Satuan dasar |
| SRS-UNIT-002 | Units | Konversi satuan |
| SRS-UNIT-003 | Product Units | Pembatasan satuan jual aktif |
| SRS-BATCH-001 | Batches | Membuat batch |
| SRS-BATCH-002 | Batches | Status batch |
| SRS-BATCH-003 | Dashboard/Batches | Alert expired |
| SRS-BATCH-004 | Sales/Batches | Harga jual final |
| SRS-PO-001 | Purchase Orders | Membuat PO obat |
| SRS-PO-002 | Purchase Orders/Purchases | Cetak dan convert PO ke pembelian |
| SRS-PUR-001 | Purchases | Pembelian supplier |
| SRS-PUR-002 | Purchases/Batches | HPP pembelian |
| SRS-SALE-001 | Cashier | Halaman kasir |
| SRS-SALE-002 | Cashier/Products | Pencarian kasir |
| SRS-SALE-003 | Cashier | Tambah item keranjang |
| SRS-SALE-004 | Cashier | Ubah keranjang |
| SRS-SALE-005 | Sales | Simpan transaksi |
| SRS-SALE-006 | Sales | Metode pembayaran |
| SRS-FEFO-001 | Sales/Batches | FEFO otomatis |
| SRS-SPLIT-001 | Sales | Split multi-batch |
| SRS-DISC-001 | Sales | Diskon transaksi |
| SRS-DISC-002 | Sales | Alokasi diskon |
| SRS-PRESC-001 | Prescriptions | Membuat dan menyiapkan resep |
| SRS-PRESC-002 | Prescriptions/Sales | Tarik resep ke kasir |
| SRS-COUNS-001 | Counseling | Mencatat konseling dasar |
| SRS-RETSALE-001 | Sales Returns | Retur penjualan |
| SRS-RETPUR-001 | Purchase Returns | Retur pembelian |
| SRS-STOCK-001 | Stock | Melihat stok |
| SRS-STOCK-002 | Stock Mutations | Mutasi stok |
| SRS-STOCK-003 | Stock Adjustments | Koreksi stok |
| SRS-STOCK-004 | Dashboard/Stock | Alert stok minimum |
| SRS-DASH-001 | Dashboard | Dashboard ringkasan |
| SRS-REPORT-001 | Reports | Laporan penjualan |
| SRS-REPORT-002 | Reports | Laporan laba |
| SRS-EXPORT-001 | Exports | Ekspor laporan |
| SRS-SETTING-001 | Settings | Profil apotek |

---

## 18. Larangan Implementasi

AI coding tidak boleh melakukan hal berikut:

1. Menyimpan stok hanya pada level produk tanpa batch.
2. Mengurangi stok dari frontend tanpa validasi backend.
3. Menyimpan transaksi tanpa detail batch.
4. Menghitung laba dari harga produk terbaru.
5. Mengabaikan HPP final pada detail transaksi.
6. Mengabaikan diskon alokasi.
7. Mengizinkan stok batch negatif.
8. Mengizinkan transaksi cash dengan uang diterima kurang dari total.
9. Mengizinkan retur penjualan tanpa transaksi asal.
10. Mengizinkan retur lebih besar dari qty yang belum diretur.
11. Menghapus permanen transaksi final.
12. Menghapus permanen batch yang sudah punya histori.
13. Memberi akses HPP dan laba kepada Kasir.
14. Menggunakan batch expired untuk transaksi normal.
15. Menganggap draft keranjang sebagai transaksi final.
16. Mengubah histori transaksi lama saat harga produk berubah.
17. Menambahkan fitur BPJS, payment gateway otomatis, multi-cabang, loyalty program, atau akuntansi lengkap pada V1.
18. Mencampur logika bisnis penting hanya di komponen UI.
19. Menampilkan pesan error teknis mentah kepada pengguna akhir.
20. Mengubah istilah inti tanpa memperbarui dokumen terkait.
21. Mengandalkan role frontend sebagai satu-satunya pengamanan.
22. Menyimpan HPP, laba, atau batch final dari payload frontend sebagai nilai final.
23. Mengabaikan zona waktu transaksi dan laporan.
24. Melakukan migration destruktif tanpa backup.
25. Menghitung harga jual otomatis dari harga modal.
26. Menampilkan harga modal, HPP, margin, atau laba kepada Kasir.
27. Mengubah histori transaksi lama ketika harga jual final baru diubah.
28. Membuat laporan laba dari data harga atau HPP terbaru.
29. Menjadikan PO sebagai penambah atau pengurang stok.
30. Mengurangi stok saat resep dibuat atau saat resep baru ditandai siap bayar.
31. Menganggap semua satuan dasar otomatis boleh dijual.
32. Menggunakan FLOAT, DOUBLE, atau REAL untuk uang, HPP, pajak, diskon, atau laba.
33. Membuat modul PPN sebagai e-faktur atau perpajakan lengkap.
34. Membuat clinical decision support otomatis.
35. Memasukkan piutang sebagai fitur inti V1 tanpa keputusan eksplisit.

---

## 19. Kriteria Siap Turun ke SDD

SRS ini siap diturunkan ke SDD jika:

- semua modul utama memiliki requirement;
- aktor dan hak akses jelas;
- aturan stok, batch, FEFO, HPP, diskon, retur, dan laporan eksplisit;
- kontrak sinkronisasi frontend-backend tersedia;
- validasi utama terdaftar;
- error state utama tersedia;
- acceptance criteria sistem tersedia;
- traceability ke modul sistem tersedia;
- tidak ada requirement yang bertentangan dengan PRD.

SDD selanjutnya harus merancang:

- arsitektur aplikasi;
- model database final;
- relasi database;
- constraint dan index;
- service layer;
- API endpoint;
- authentication dan authorization;
- transaction handling;
- locking stok batch;
- strategi perhitungan stok, HPP, diskon, dan laba;
- logging dan audit trail;
- deployment;
- struktur folder backend dan frontend.

---

## 20. Definition of Done SRS

Dokumen SRS dianggap selesai apabila:

- kebutuhan fungsional memiliki ID;
- kebutuhan nonfungsional terdefinisi;
- aktor dan hak akses jelas;
- aturan validasi utama tersedia;
- kondisi error utama tersedia;
- kontrak sinkronisasi frontend-backend tersedia;
- acceptance criteria sistem tersedia;
- requirement dapat diuji;
- requirement dapat diturunkan ke SDD, UI/UX Flow, dan Task Breakdown;
- tidak ada requirement yang bertentangan dengan PRD, frontend specification, dan backend specification.

---

## 21. Kesimpulan

SRS POS Apotek versi 1.1.0 menetapkan bahwa sistem harus dibangun sebagai POS berbasis transaksi yang menjaga konsistensi stok, batch, HPP, diskon, retur, dan laporan laba. Prinsip utama sistem adalah pemisahan tegas antara frontend dan backend: frontend berperan sebagai antarmuka dan estimasi, sedangkan backend menjadi sumber kebenaran final.

Fokus implementasi V1 adalah membuat sistem kasir yang dapat melakukan transaksi penjualan dengan stok berbasis batch, FEFO server-side, split batch, diskon, mutasi stok, retur penjualan, dashboard, dan laporan laba. Fitur tambahan seperti retur pembelian, ekspor laporan, koreksi stok, dan pengaturan profil apotek dapat dikerjakan setelah fitur inti stabil.

SRS ini harus menjadi acuan utama sebelum penyusunan SDD, UI/UX Flow, Task Breakdown, dan implementasi kode.
