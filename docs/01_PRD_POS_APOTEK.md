---
document_name: "01_PRD_POS_APOTEK"
document_type: "Product Requirements Document"
project_name: "POS Apotek"
version: "1.1.0"
status: "Approved for Technical Derivation"
prepared_for: "AI Vibe Coding / Codex GPT"
prepared_by: "Suryadi Umar"
last_updated: "2026-06-02"
related_documents:
  - "02_SRS_POS_APOTEK.md"
  - "03_SDD_SYSTEM_DESIGN_POS_APOTEK.md"
  - "04_UI_UX_FLOW_POS_APOTEK.md"
  - "05_TASK_BREAKDOWN_POS_APOTEK.md"
  - "06_FRONTEND_POS_APOTEK.md"
  - "07_BACKEND_POS_APOTEK.md"
---

# PRD - POS Apotek

## 0. Instruksi Pembacaan untuk AI Coding

Dokumen ini adalah **Product Requirements Document (PRD)** untuk aplikasi **POS Apotek**.
Fungsi utama dokumen ini adalah menjelaskan **tujuan produk, masalah yang diselesaikan, ruang lingkup fitur, prioritas, user stories, dan kriteria keberhasilan produk**.

Dokumen ini **bukan** tempat utama untuk:
- detail database final;
- kontrak API final;
- struktur folder teknis final;
- validasi teknis level field secara lengkap;
- desain komponen frontend secara rinci;
- daftar task implementasi level developer.

Detail tersebut harus diturunkan ke dokumen berikut:
- `02_SRS_POS_APOTEK.md` untuk kebutuhan sistem, validasi, aturan fitur, dan perilaku sistem;
- `03_SDD_SYSTEM_DESIGN_POS_APOTEK.md` untuk arsitektur, database final, API final, autentikasi, otorisasi, security, dan desain sistem;
- `04_UI_UX_FLOW_POS_APOTEK.md` untuk alur halaman dan interaksi pengguna;
- `05_TASK_BREAKDOWN_POS_APOTEK.md` untuk daftar pekerjaan teknis;
- `06_FRONTEND_POS_APOTEK.md` untuk keputusan frontend, routing, layout, komponen UI, state management, validasi frontend, dan role-based UI;
- `07_BACKEND_POS_APOTEK.md` untuk keputusan backend, service layer, transaksi stok, FEFO, split batch, HPP, laba, authorization, testing, deployment, dan backup.

AI coding **tidak boleh membuat fitur di luar scope PRD ini** tanpa menandai fitur tersebut sebagai `Out of Scope` atau `Future Enhancement`.

Urutan prioritas dokumen jika terjadi konflik:

1. PRD mengatur tujuan produk, scope, prioritas, target pengguna, dan kebutuhan bisnis.
2. SRS mengatur perilaku sistem, validasi fungsional, error handling, dan aturan fitur.
3. SDD mengatur desain teknis final, database, API, security, dan arsitektur sistem.
4. UI/UX Flow mengatur alur halaman dan interaksi pengguna.
5. Task Breakdown mengatur pekerjaan implementasi.
6. Dokumen frontend mengatur implementasi antarmuka sesuai PRD, SRS, dan UI/UX Flow.
7. Dokumen backend mengatur implementasi server sesuai PRD, SRS, dan SDD.

PRD tetap menjadi dokumen induk kebutuhan produk. Keputusan teknis backend dan frontend tidak boleh mengubah scope produk tanpa pembaruan PRD terlebih dahulu.

---

## 1. Ringkasan Produk

POS Apotek adalah aplikasi web Point of Sale untuk membantu operasional apotek dalam mengelola penjualan, stok obat, pembelian supplier, batch obat, tanggal kedaluwarsa, retur, dan laporan laba penjualan.

Produk ini dirancang untuk apotek skala kecil sampai menengah dengan kebutuhan utama:
- transaksi kasir cepat;
- stok akurat berdasarkan batch;
- pemesanan/PO obat sebelum barang datang;
- pembelian supplier manual atau dari PO;
- pelayanan resep dasar sebelum pembayaran kasir;
- harga beli dan harga jual yang dapat berbeda pada tiap batch;
- perhitungan laba berdasarkan transaksi nyata;
- kontrol stok minimum dan tanggal kedaluwarsa;
- laporan penjualan dan laba yang mudah dibaca pemilik atau manajer.

Fokus utama versi pertama adalah **akurasi transaksi, stok, batch, HPP, diskon, retur, dan laporan laba**. Fitur yang tidak berhubungan langsung dengan kebutuhan tersebut tidak dimasukkan ke V1 agar pengembangan tidak membesar tanpa kendali. Karena tentu saja, menambah fitur tanpa batas adalah tradisi kuno yang sering membuat aplikasi belum selesai tetapi sudah lelah duluan.

Alur operasional yang harus didukung rancangan V1 adalah:

```text
Pemesanan / PO Obat
-> Pembelian Supplier
-> Batch dan Stok
-> Pelayanan Resep Dasar
-> Kasir
-> Laporan
```

---

## 2. Latar Belakang Masalah

Banyak apotek kecil dan menengah masih menghadapi masalah pencatatan penjualan dan stok yang tidak konsisten. Masalah yang paling penting adalah:

### 2.1 Stok Tidak Akurat

Stok obat dapat berubah karena pembelian, penjualan, retur penjualan, retur pembelian, dan koreksi stok. Jika sistem hanya menyimpan stok total tanpa riwayat batch dan mutasi, stok sulit diaudit.

### 2.2 Batch dan Tanggal Kedaluwarsa Tidak Terkelola

Satu obat dapat memiliki beberapa batch dengan tanggal kedaluwarsa berbeda. Tanpa pencatatan batch, apotek sulit menerapkan prinsip **FEFO (First Expired First Out)**, yaitu menjual batch dengan tanggal kedaluwarsa paling dekat terlebih dahulu.

### 2.3 Harga Beli dan Harga Jual Berbeda per Batch

Obat yang sama dapat dibeli pada waktu berbeda dengan harga beli berbeda. Harga jual juga dapat berubah sesuai batch. Jika sistem hanya menyimpan satu harga pada level produk, laba tidak dapat dihitung secara akurat.

### 2.4 Konversi Satuan Tidak Terkelola

Obat dapat dibeli dalam satuan besar seperti box atau dus, tetapi dijual dalam satuan lebih kecil seperti strip, tablet, kaplet, kapsul, botol, atau biji. Sistem harus menyimpan stok dalam satuan terkecil agar kalkulasi tetap konsisten.

### 2.5 Laba Tidak Dapat Dipantau Secara Real-Time

Pemilik atau manajer membutuhkan laporan omzet, HPP, diskon, dan laba penjualan berdasarkan transaksi nyata. Perhitungan laba tidak boleh hanya memakai harga terbaru karena harga terbaru belum tentu sama dengan harga batch saat transaksi terjadi.

### 2.6 Proses Kasir Harus Cepat dan Tidak Membingungkan

Halaman kasir harus mendukung pencarian produk, pemilihan satuan jual, keranjang, diskon, metode pembayaran, uang diterima, kembalian, dan penyimpanan transaksi dengan alur singkat.

---

## 3. Tujuan Produk

### 3.1 Tujuan Utama

Membangun sistem POS Apotek yang mampu mengelola transaksi, stok, batch, satuan jual, harga, retur, dan laporan laba secara akurat serta mudah digunakan oleh kasir dan manajer.

### 3.2 Tujuan Khusus

| ID | Tujuan Produk | Ukuran Keberhasilan |
|---|---|---|
| GOAL-001 | Mempercepat transaksi kasir | Kasir dapat mencari obat, memilih satuan, memasukkan qty, dan menyimpan transaksi dalam satu alur halaman kasir |
| GOAL-002 | Menjaga akurasi stok | Setiap pembelian, penjualan, retur, dan koreksi stok menghasilkan riwayat mutasi |
| GOAL-003 | Mengelola batch obat | Setiap batch memiliki nomor batch, tanggal kedaluwarsa, stok, HPP, dan harga jual |
| GOAL-004 | Menghitung laba penjualan | Laporan laba dihitung dari detail transaksi yang tersimpan, bukan dari harga produk terbaru |
| GOAL-005 | Mengontrol risiko kedaluwarsa | Dashboard menampilkan batch yang mendekati kedaluwarsa |
| GOAL-006 | Membatasi akses pengguna | Role kasir dan manajer memiliki hak akses berbeda |
| GOAL-007 | Mendukung laporan operasional | Sistem menyediakan laporan transaksi, stok, pembelian, retur, dan laba |
| GOAL-008 | Mendukung PO obat | Apoteker/Manager dapat membuat PO yang tidak mengubah stok dan dapat ditarik ke pembelian |
| GOAL-009 | Mendukung pelayanan resep dasar | Apoteker dapat menyiapkan resep untuk ditarik kasir tanpa mengurangi stok sebelum checkout |

---

## 4. Target Pengguna

| Role | Deskripsi | Kebutuhan Utama |
|---|---|---|
| Kasir | Pengguna yang melayani transaksi penjualan harian | Transaksi cepat, pencarian obat, keranjang jelas, diskon, pembayaran, retur penjualan |
| Apoteker | Pengguna yang membantu pelayanan obat dan pengecekan stok | PO obat, pelayanan resep dasar, konseling, informasi stok, batch, expired date, dan satuan jual |
| Manager | Pengguna yang mengelola operasional apotek | Master data, pembelian, stok, harga, retur, laporan, dashboard |
| Pemilik | Pengguna yang memantau performa bisnis | Ringkasan omzet, HPP, diskon, laba, stok kritis, dan produk mendekati kedaluwarsa |

Catatan:
- Pada V1, role utama yang wajib tersedia adalah `Kasir`, `Apoteker`, dan `Manager`.
- Role `Pemilik` dapat memakai akses `Manager` jika pemisahan role belum diterapkan pada V1.

---

## 5. Ruang Lingkup Produk V1

### 5.1 In Scope

Fitur berikut wajib masuk versi pertama:

| ID | Fitur | Prioritas | Keterangan |
|---|---|---|---|
| PRD-AUTH-001 | Login dan role pengguna | Must Have | Role minimal: Kasir dan Manager |
| PRD-PROD-001 | Manajemen produk obat | Must Have | Tambah, ubah, nonaktifkan, cari produk |
| PRD-CAT-001 | Manajemen kategori | Must Have | Kategori dipakai untuk filter produk |
| PRD-SUP-001 | Manajemen supplier | Must Have | Supplier dipakai pada pembelian |
| PRD-UNIT-001 | Konversi satuan produk | Must Have | Satuan besar, menengah, dan terkecil |
| PRD-UNIT-002 | Pembatasan satuan jual produk | Must Have | Manager menentukan satuan apa saja yang boleh dipilih kasir |
| PRD-BATCH-001 | Manajemen batch obat | Must Have | Nomor batch, expired date, HPP, stok, harga jual |
| PRD-PO-001 | Pemesanan / Purchase Order Obat | Should Have | PO rencana pemesanan, dapat dicetak dan ditarik ke pembelian |
| PRD-PUR-001 | Pembelian supplier | Must Have | Pembelian membuat batch baru dan menambah stok |
| PRD-PUR-002 | Pembelian dari PO dan faktur supplier | Should Have | Pembelian dapat dibuat dari PO, mendukung diskon pembelian, PPN/non-PPN, dan validasi faktur |
| PRD-SALE-001 | Transaksi penjualan kasir | Must Have | Pencarian obat, pilih satuan, qty, pembayaran |
| PRD-PRESC-001 | Pelayanan Resep Dasar | Should Have | Resep disiapkan Apoteker dan ditarik ke kasir |
| PRD-COUNS-001 | Konseling Dasar | Could Have | Dokumentasi edukasi obat tanpa tagihan dan tanpa perubahan stok |
| PRD-HIST-001 | Riwayat transaksi | Must Have | Menampilkan transaksi tersimpan dan detail transaksi sesuai role |
| PRD-FEFO-001 | FEFO otomatis | Must Have | Batch expired paling dekat dipakai lebih dulu |
| PRD-SPLIT-001 | Split transaksi multi-batch | Must Have | Detail transaksi dipisah otomatis per batch |
| PRD-DISC-001 | Diskon manual | Must Have | Diskon persen dan nominal rupiah |
| PRD-RETSALE-001 | Retur penjualan | Must Have | Mengembalikan stok ke batch asal |
| PRD-RETPUR-001 | Retur pembelian | Should Have | Mengurangi stok batch terkait |
| PRD-STOCK-001 | Manajemen stok dan mutasi | Must Have | Riwayat perubahan stok wajib tercatat |
| PRD-ALERT-001 | Alert stok minimum | Must Have | Produk dengan stok rendah tampil di dashboard |
| PRD-ALERT-002 | Alert expired date | Must Have | Batch mendekati kedaluwarsa tampil di dashboard |
| PRD-DASH-001 | Dashboard ringkasan | Must Have | Laba, omzet, transaksi, stok kritis, expired |
| PRD-REPORT-001 | Laporan penjualan dan laba | Must Have | Harian, mingguan, bulanan, tahunan, rentang tanggal |
| PRD-EXPORT-001 | Ekspor laporan | Should Have | Excel dan PDF |
| PRD-USER-001 | Manajemen user | Should Have | Manager dapat membuat, mengubah, dan menonaktifkan akun pengguna |
| PRD-SET-001 | Pengaturan profil apotek | Should Have | Manager dapat mengatur identitas dasar apotek untuk tampilan dan laporan |
| PRD-KASIR-UX-001 | Shortcut dan input cepat kasir | Should Have | Membantu transaksi lebih cepat |

### 5.2 Out of Scope V1

Fitur berikut tidak dikerjakan pada versi pertama:

| ID | Fitur | Alasan |
|---|---|---|
| OOS-001 | Integrasi BPJS atau asuransi | Kompleksitas aturan dan integrasi eksternal |
| OOS-002 | Payment gateway otomatis | Fokus V1 adalah pencatatan pembayaran, bukan integrasi pembayaran |
| OOS-003 | Barcode scanner hardware khusus | V1 hanya mendukung input kode seperti keyboard |
| OOS-004 | Program loyalitas pelanggan | Tidak berdampak langsung pada akurasi stok dan laba |
| OOS-005 | Multi-cabang | V1 fokus satu apotek |
| OOS-006 | Akuntansi biaya operasional lengkap | Laba V1 adalah laba penjualan setelah HPP dan diskon |
| OOS-007 | Manajemen resep dokter lanjutan | Pelayanan Resep Dasar masuk scope P1; e-resep, validasi klinis otomatis, interaksi obat otomatis, dan integrasi fasilitas kesehatan tetap di luar scope |
| OOS-008 | Cetak struk fisik otomatis | V1 dapat menyimpan transaksi tanpa integrasi printer khusus |
| OOS-009 | Multi-kasir aktif sebagai modul kompleks | Sesi kasir sederhana dapat dicatat, tetapi bukan sistem shift lengkap |
| OOS-010 | Integrasi e-faktur atau pajak lengkap | Tidak menjadi kebutuhan utama V1 |
| OOS-011 | Clinical decision support otomatis | Sistem tidak memberi diagnosis, rekomendasi klinis, atau deteksi interaksi obat otomatis |
| OOS-012 | Piutang pelanggan | Future enhancement; tidak masuk task P0/P1 V1 tanpa keputusan eksplisit |

---

## 6. Prinsip Produk

| ID | Prinsip | Penjelasan |
|---|---|---|
| PRINCIPLE-001 | Akurasi lebih penting daripada tampilan dekoratif | Sistem harus benar menghitung stok, batch, harga, HPP, diskon, dan laba |
| PRINCIPLE-002 | Server menjadi sumber kebenaran | Frontend boleh menampilkan estimasi, tetapi perhitungan final dilakukan server |
| PRINCIPLE-003 | Histori tidak boleh dirusak | Transaksi, batch, pembelian, retur, dan mutasi stok tidak boleh dihapus sembarangan |
| PRINCIPLE-004 | Stok disimpan dalam satuan terkecil | Semua satuan jual aktif dikonversi ke satuan terkecil, tetapi satuan dasar tidak otomatis boleh dijual |
| PRINCIPLE-005 | Laba dihitung dari detail transaksi | Laporan tidak boleh memakai harga produk terbaru sebagai dasar laba historis |
| PRINCIPLE-006 | UI kasir harus cepat | Kasir tidak boleh dipaksa berpindah halaman untuk transaksi normal |
| PRINCIPLE-007 | Fitur V1 harus lean | Fitur yang tidak langsung mendukung transaksi, stok, batch, dan laba ditunda |
| PRINCIPLE-008 | PO bukan transaksi stok | PO adalah rencana pemesanan dan tidak menambah atau mengurangi stok |
| PRINCIPLE-009 | Resep bukan transaksi final | Resep tidak mengurangi stok sebelum ditarik ke kasir dan checkout berhasil |

---

## 6.1 Keputusan Arsitektur Produk

Sistem POS Apotek V1 dibangun dengan pemisahan tanggung jawab antara frontend dan backend.

Frontend bertugas menyediakan antarmuka pengguna, validasi awal, estimasi subtotal, estimasi diskon, estimasi total, estimasi kembalian, role-based UI, routing, state management, dan integrasi API.

Backend bertugas menjadi sumber kebenaran untuk transaksi final, stok, batch, FEFO, split batch, HPP, harga jual final transaksi, diskon alokasi, laba, retur, mutasi stok, autentikasi, otorisasi, laporan, ekspor, logging, dan audit trail.

Keputusan ini dibuat untuk menjaga akurasi transaksi, mencegah stok negatif, mempertahankan histori transaksi, membatasi akses data sensitif, dan memastikan laporan laba tidak berubah akibat perubahan harga terbaru.

PRD tidak memuat struktur folder final, kontrak API final, schema database final, atau detail komponen UI. Detail tersebut tetap berada pada SRS, SDD, UI/UX Flow, dokumen backend, dan dokumen frontend.

---

## 7. User Stories

### 7.1 Kasir

| ID | User Story | Prioritas | Acceptance Criteria Ringkas |
|---|---|---|---|
| US-KASIR-001 | Sebagai kasir, saya ingin mencari obat berdasarkan nama atau kode agar transaksi cepat dilakukan | Must Have | Obat dapat dicari dari kolom pencarian |
| US-KASIR-002 | Sebagai kasir, saya ingin memilih satuan jual agar obat dapat dijual per box, strip, tablet, atau satuan lain | Must Have | Sistem menampilkan satuan jual yang tersedia |
| US-KASIR-003 | Sebagai kasir, saya ingin melihat total, diskon, uang diterima, dan kembalian agar pembayaran jelas | Must Have | Panel pembayaran menghitung nilai otomatis |
| US-KASIR-004 | Sebagai kasir, saya ingin menyimpan transaksi agar stok otomatis berkurang | Must Have | Transaksi tersimpan dan stok batch berkurang |
| US-KASIR-005 | Sebagai kasir, saya ingin melakukan retur penjualan agar barang kembali tercatat ke stok asal | Must Have | Retur mengacu transaksi asal dan mengembalikan stok |
| US-KASIR-006 | Sebagai kasir, saya ingin memakai shortcut atau input cepat agar pelayanan antrean lebih efisien | Should Have | Shortcut utama berjalan tanpa mengganggu input normal |
| US-KASIR-007 | Sebagai kasir, saya ingin menarik resep siap bayar ke keranjang agar pembayaran resep cepat | Should Have | Resep READY_FOR_PAYMENT dapat masuk keranjang tanpa kasir melihat HPP/modal |

### 7.2 Manager

| ID | User Story | Prioritas | Acceptance Criteria Ringkas |
|---|---|---|---|
| US-MGR-001 | Sebagai manager, saya ingin menambah produk obat agar katalog apotek lengkap | Must Have | Produk tersimpan dan dapat dicari |
| US-MGR-002 | Sebagai manager, saya ingin mengatur satuan produk agar stok dapat dikonversi dengan benar | Must Have | Konversi satuan tersimpan dan dipakai transaksi |
| US-MGR-003 | Sebagai manager, saya ingin mencatat pembelian agar stok batch bertambah | Must Have | Pembelian membuat batch dan mutasi stok masuk |
| US-MGR-004 | Sebagai manager, saya ingin mengatur harga jual per batch agar laba dihitung akurat | Must Have | Harga jual batch dipakai saat transaksi |
| US-MGR-005 | Sebagai manager, saya ingin melihat stok minimum dan expired date agar risiko operasional terkendali | Must Have | Dashboard menampilkan alert stok dan expired |
| US-MGR-006 | Sebagai manager, saya ingin melihat laporan laba agar performa apotek dapat dipantau | Must Have | Laporan menampilkan omzet, HPP, diskon, dan laba |
| US-MGR-007 | Sebagai manager, saya ingin mengekspor laporan agar data dapat disimpan atau dibagikan | Should Have | Laporan dapat diekspor ke Excel dan PDF |
| US-MGR-008 | Sebagai manager, saya ingin membuat pembelian dari PO agar barang datang dapat dicocokkan dengan rencana pemesanan | Should Have | Item PO menjadi draft pembelian dan stok bertambah hanya saat pembelian final |
| US-MGR-009 | Sebagai manager, saya ingin memvalidasi faktur supplier agar total sistem cocok dengan faktur | Should Have | Diskon, PPN, total faktur, selisih, dan catatan selisih tercatat |

### 7.3 Apoteker

| ID | User Story | Prioritas | Acceptance Criteria Ringkas |
|---|---|---|---|
| US-APT-001 | Sebagai apoteker, saya ingin membuat PO obat agar pemesanan ke supplier terdokumentasi | Should Have | PO tersimpan, dapat dicetak, dan tidak mengubah stok |
| US-APT-002 | Sebagai apoteker, saya ingin mencatat resep dokter agar obat dapat disiapkan sebelum pembayaran | Should Have | Resep tersimpan, dapat ditandai siap bayar, dan tidak mengurangi stok |
| US-APT-003 | Sebagai apoteker, saya ingin mencatat konseling agar edukasi obat terdokumentasi | Could Have | Catatan konseling tersimpan tanpa tagihan dan tanpa perubahan stok |

---

## 8. Kebutuhan Fitur Produk

### 8.1 PRD-AUTH-001: Login dan Role Pengguna

**Deskripsi:**
Sistem harus menyediakan autentikasi pengguna dan pembatasan akses berdasarkan role.

**Aktor:**
- Kasir
- Manager

**Prioritas:** Must Have

**Kebutuhan Produk:**
- Pengguna dapat login memakai username/email dan password.
- Sistem membedakan akses kasir dan manager.
- Kasir hanya dapat mengakses fitur transaksi, retur penjualan, dan informasi stok terbatas.
- Manager dapat mengakses master data, pembelian, stok, laporan, dashboard, retur pembelian, dan pengaturan harga.

**Acceptance Criteria:**
- Kasir tidak dapat membuka laporan laba.
- Kasir tidak dapat mengubah harga jual batch.
- Manager dapat membuka seluruh fitur manajemen.
- Pengguna nonaktif tidak dapat login.

---

### 8.2 PRD-PROD-001: Manajemen Produk Obat

**Deskripsi:**
Sistem harus menyediakan master data produk obat sebagai dasar transaksi, batch, pembelian, dan stok.

**Aktor:**
- Manager

**Prioritas:** Must Have

**Kebutuhan Produk:**
- Manager dapat menambah produk obat.
- Manager dapat mengubah informasi produk.
- Manager dapat menonaktifkan produk tanpa menghapus histori.
- Produk memiliki kode unik.
- Produk dapat dikelompokkan berdasarkan kategori.
- Produk dapat dicari berdasarkan nama, kode, kategori, nama generik, atau deskripsi.

**Acceptance Criteria:**
- Produk baru dapat disimpan.
- Produk nonaktif tidak muncul sebagai pilihan transaksi baru.
- Histori transaksi produk nonaktif tetap dapat dibaca.
- Kode produk unik dan tidak duplikat.

---

### 8.3 PRD-UNIT-001: Konversi Satuan Produk

**Deskripsi:**
Sistem harus mendukung konversi satuan besar, menengah, dan terkecil.

**Aktor:**
- Manager
- Kasir

**Prioritas:** Must Have

**Kebutuhan Produk:**
- Setiap produk memiliki satuan terkecil sebagai dasar stok.
- Produk dapat memiliki satuan besar, satuan menengah, dan satuan terkecil.
- Contoh: 1 box = 10 strip, 1 strip = 10 tablet, sehingga 1 box = 100 tablet.
- Kasir dapat memilih satuan jual sesuai konfigurasi produk.
- Stok tetap dihitung dalam satuan terkecil.
- Manager menentukan satuan jual aktif untuk setiap produk.
- Satuan dasar stok tidak otomatis menjadi satuan jual.
- Manager dapat mengatur minimum qty jual dan catatan satuan jual.

**Acceptance Criteria:**
- Pembelian 1 box dengan isi 100 tablet menambah stok 100 tablet.
- Penjualan 1 strip dengan isi 10 tablet mengurangi stok 10 tablet.
- Sistem menolak satuan jual yang belum dikonfigurasi.
- Sistem menolak satuan jual yang tidak aktif untuk kasir.
- Produk tertentu dapat dikonfigurasi agar tidak dijual per tablet/biji/kaplet.
- Stok tidak boleh menjadi negatif setelah konversi.

---

### 8.3A PRD-PO-001: Pemesanan / Purchase Order Obat

**Deskripsi:**
Pemesanan / Purchase Order Obat adalah fitur untuk mencatat rencana pemesanan obat atau barang apotek kepada supplier sebelum barang datang. PO tidak menambah stok dan tidak mengurangi stok.

**Aktor:**
- Apoteker
- Manager

**Prioritas:** Should Have

**Kebutuhan Produk:**
- Apoteker atau Manager dapat membuat PO dengan nomor PO unik, tanggal, supplier, pembuat otomatis dari login, item obat, qty, satuan, estimasi harga beli, dan catatan.
- PO memiliki status `DRAFT`, `SENT`, `PARTIALLY_RECEIVED`, `RECEIVED`, atau `CANCELLED`.
- PO dapat dicetak dengan identitas apotek, nomor PO, tanggal PO, supplier, pembuat PO, daftar obat, satuan, jumlah, catatan, dan area tanda tangan.
- PO dapat ditarik ke Pembelian saat barang datang.
- Barang datang boleh berbeda qty, harga, batch, atau expired date dari PO.

**Acceptance Criteria:**
- PO dapat dibuat dengan No. PO, tanggal, supplier, pembuat otomatis, dan item obat.
- PO dapat dicetak dalam ukuran A4, A5, atau custom sederhana.
- PO tidak menambah atau mengurangi stok.
- PO dapat ditarik ke pembelian.
- PO dapat diterima sebagian dan statusnya berubah sesuai penerimaan.

---

### 8.4 PRD-BATCH-001: Manajemen Batch Obat

**Deskripsi:**
Sistem harus mengelola stok obat berdasarkan batch.

**Aktor:**
- Manager
- Kasir

**Prioritas:** Must Have

**Kebutuhan Produk:**
- Satu produk dapat memiliki banyak batch aktif.
- Setiap batch memiliki nomor batch.
- Setiap batch memiliki tanggal kedaluwarsa.
- Setiap batch memiliki stok dalam satuan terkecil.
- Setiap batch memiliki HPP.
- Setiap batch memiliki harga jual per satuan jual.
- Batch tidak boleh dihapus jika sudah memiliki histori transaksi.

**Acceptance Criteria:**
- Produk dapat memiliki lebih dari satu batch aktif.
- Batch dengan stok nol tidak dipilih untuk transaksi baru.
- Batch kedaluwarsa tidak boleh dipakai transaksi normal.
- Histori batch tetap tersedia walaupun batch tidak aktif.

---

### 8.5 PRD-PUR-001: Pembelian Supplier

**Deskripsi:**
Pembelian adalah fitur untuk mencatat barang yang benar-benar datang dari supplier berdasarkan faktur. Pembelian dapat dibuat manual atau ditarik dari PO. Stok hanya bertambah setelah pembelian final disimpan dengan nomor batch, expired date, qty diterima, harga beli final, dan HPP.

**Aktor:**
- Manager

**Prioritas:** Must Have

**Kebutuhan Produk:**
- Manager memilih supplier dari daftar supplier.
- Manager dapat membuat pembelian manual atau dari PO.
- Manager dapat memilih No. PO milik supplier dan menarik item PO sebagai draft pembelian.
- Manager menginput nomor faktur, tanggal faktur, total faktur supplier, mode PPN, diskon pembelian, dan catatan selisih jika diperlukan.
- Manager memilih produk yang dibeli.
- Manager mengisi nomor batch.
- Manager mengisi tanggal kedaluwarsa.
- Manager mengisi harga beli.
- Manager mengisi jumlah pembelian dalam satuan besar.
- Manager dapat memecah satu item PO menjadi beberapa batch jika barang datang dengan batch atau expired date berbeda.
- Manager mengisi atau mengonfirmasi harga jual per satuan jual.
- Sistem menghitung HPP per satuan terkecil.
- Sistem membandingkan total hitung dengan total faktur supplier.
- Sistem menambah stok batch.
- Sistem mencatat mutasi stok masuk.
- Sistem memperbarui status PO jika pembelian berasal dari PO.

**Acceptance Criteria:**
- Pembelian dapat dibuat manual atau dari PO.
- Pembelian dari PO hanya mengambil item sebagai draft, bukan nilai final yang terkunci.
- Pembelian berhasil membuat batch baru.
- Stok batch bertambah sesuai hasil konversi satuan.
- HPP per satuan terkecil tersimpan.
- Diskon pembelian nominal atau persen dapat memengaruhi modal bersih dan HPP.
- Mode pembelian `NON_PPN`, `PPN_INCLUDED`, dan `PPN_EXCLUDED` dapat dicatat untuk pencocokan faktur.
- Sistem membandingkan total sistem dengan total faktur input.
- Setiap barang masuk wajib memiliki batch number dan expired date.
- Mutasi stok masuk tercatat.
- Pembelian dapat ditelusuri kembali dari riwayat pembelian.
- Pembelian final berjalan atomic dan rollback jika salah satu item invalid.

---

### 8.6 PRD-SALE-001: Transaksi Penjualan Kasir

**Deskripsi:**
Sistem harus menyediakan halaman kasir untuk transaksi penjualan obat.

**Aktor:**
- Kasir

**Prioritas:** Must Have

**Kebutuhan Produk:**
- Kasir dapat mencari obat berdasarkan nama, kode, barcode input keyboard, kategori, nama generik, atau batch.
- Kasir dapat memilih satuan jual.
- Kasir dapat mengisi qty.
- Sistem menampilkan keranjang transaksi.
- Sistem menghitung subtotal, diskon, total, uang diterima, dan kembalian.
- Kasir dapat memilih metode pembayaran.
- Sistem menyimpan transaksi.
- Sistem mengurangi stok batch berdasarkan FEFO.
- Sistem menyimpan detail transaksi per batch.

**Acceptance Criteria:**
- Transaksi tidak dapat disimpan jika keranjang kosong.
- Transaksi tidak dapat disimpan jika stok tidak cukup.
- Untuk pembayaran cash, uang diterima harus lebih besar atau sama dengan total.
- Untuk QRIS atau transfer, uang diterima tidak wajib menjadi syarat submit.
- Setelah transaksi tersimpan, stok batch berkurang.
- Detail transaksi menyimpan harga jual, HPP, diskon alokasi, dan laba.

---

### 8.6A PRD-PRESC-001: Pelayanan Resep Dasar

**Deskripsi:**
Pelayanan Resep Dasar adalah fitur untuk mencatat resep dokter yang diterima apotek, memeriksa item obat, mencatat aturan pakai, dan menyiapkan resep agar dapat ditarik ke kasir untuk pembayaran.

**Aktor:**
- Apoteker
- Manager
- Kasir terbatas untuk menarik resep siap bayar

**Prioritas:** Should Have

**Kebutuhan Produk:**
- Apoteker dapat mencatat nomor resep, tanggal diterima, pasien, dokter, fasilitas kesehatan, obat, satuan jual aktif, qty, aturan pakai, catatan etiket, dan catatan substitusi jika ada.
- Resep memiliki status `DRAFT`, `REVIEWED`, `READY_FOR_PAYMENT`, `PAID`, `COMPLETED`, `CANCELLED`, atau `NEED_CONFIRMATION`.
- Resep bukan transaksi final dan tidak langsung mengurangi stok.
- Kasir dapat menarik resep berstatus `READY_FOR_PAYMENT` ke keranjang.
- Stok berkurang hanya setelah checkout kasir berhasil dan backend menjalankan FEFO.

**Acceptance Criteria:**
- Apoteker dapat membuat resep dokter.
- Resep memuat data pasien, dokter, obat, qty, satuan, dan aturan pakai.
- Resep tidak mengurangi stok saat dibuat atau ditandai siap bayar.
- Resep dapat ditandai siap bayar.
- Kasir dapat menarik resep ke transaksi.
- Stok berkurang setelah checkout kasir berhasil.

---

### 8.6B PRD-COUNS-001: Konseling Dasar

**Deskripsi:**
Konseling Dasar adalah fitur dokumentasi edukasi obat yang diberikan oleh apoteker kepada pasien. Konseling dapat terkait dengan resep atau transaksi, tetapi tidak membuat tagihan dan tidak mengubah stok.

**Aktor:**
- Apoteker
- Manager

**Prioritas:** Could Have

**Kebutuhan Produk:**
- Apoteker dapat mencatat tanggal konseling, pasien, resep atau transaksi terkait jika ada, topik, catatan, dan status.
- Konseling tidak menambah stok, tidak mengurangi stok, dan tidak membuat tagihan.
- Konseling tidak boleh menjadi clinical decision support otomatis.

**Acceptance Criteria:**
- Apoteker dapat mencatat konseling.
- Konseling dapat terkait resep atau transaksi.
- Konseling tidak mengubah stok.
- Konseling tidak membuat tagihan.

---

### 8.7 PRD-FEFO-001: FEFO Otomatis

**Deskripsi:**
Sistem harus menerapkan FEFO saat transaksi penjualan.

**Aktor:**
- Kasir
- Manager

**Prioritas:** Must Have

**Kebutuhan Produk:**
- Sistem memilih batch dengan tanggal kedaluwarsa paling dekat.
- Batch expired tidak boleh dipakai.
- Batch stok nol tidak boleh dipakai.
- Jika stok dari batch pertama tidak cukup, sistem mengambil batch berikutnya.

**Acceptance Criteria:**
- Batch dengan expired date paling dekat dipakai lebih dulu.
- Sistem tidak mengambil batch yang sudah expired.
- Sistem tidak mengambil batch dengan stok nol.
- Jika transaksi melewati beberapa batch, sistem membuat split detail transaksi.

---

### 8.8 PRD-SPLIT-001: Split Detail Transaksi Multi-Batch

**Deskripsi:**
Sistem harus memecah detail transaksi otomatis jika satu item penjualan mengambil stok dari lebih dari satu batch.

**Aktor:**
- Kasir
- Manager

**Prioritas:** Must Have

**Kebutuhan Produk:**
- Kasir tetap melihat item sebagai satu baris utama di keranjang jika diperlukan.
- Server menyimpan detail transaksi berdasarkan batch yang benar-benar dipakai.
- Setiap detail batch menyimpan qty, satuan, harga jual, HPP, diskon alokasi, dan laba.

**Acceptance Criteria:**
- Penjualan 15 tablet dapat terbagi menjadi 10 tablet dari Batch A dan 5 tablet dari Batch B.
- Laba dihitung per detail batch.
- Riwayat transaksi dapat menampilkan rincian batch.
- Retur penjualan dapat mengembalikan stok ke batch asal.

---

### 8.9 PRD-DISC-001: Diskon Manual

**Deskripsi:**
Sistem harus mendukung diskon transaksi dalam bentuk persen dan nominal rupiah.

**Aktor:**
- Kasir
- Manager

**Prioritas:** Must Have

**Kebutuhan Produk:**
- Kasir dapat memberi diskon persen.
- Kasir dapat memberi diskon nominal rupiah.
- Diskon diterapkan pada level transaksi.
- Sistem mengalokasikan diskon ke detail batch secara proporsional.
- Diskon memengaruhi laba detail transaksi.

**Acceptance Criteria:**
- Diskon 10% pada subtotal Rp50.000 menghasilkan potongan Rp5.000.
- Diskon nominal Rp5.000 pada subtotal Rp50.000 menghasilkan total Rp45.000.
- Diskon tidak boleh lebih besar dari subtotal.
- Diskon tersimpan pada transaksi dan detail alokasi batch.

---

### 8.10 PRD-RETSALE-001: Retur Penjualan

**Deskripsi:**
Sistem harus mendukung retur penjualan dari pelanggan.

**Aktor:**
- Kasir
- Manager

**Prioritas:** Must Have

**Kebutuhan Produk:**
- Kasir mencari transaksi asal.
- Kasir memilih item transaksi yang diretur.
- Retur dapat dilakukan sebagian.
- Qty retur tidak boleh lebih besar dari qty yang tersedia untuk diretur.
- Stok dikembalikan ke batch asal.
- Laba laporan dikoreksi berdasarkan detail transaksi yang diretur.
- Alasan retur harus dicatat.

**Acceptance Criteria:**
- Retur tidak dapat dibuat tanpa transaksi asal.
- Retur sebagian dapat dilakukan.
- Qty retur tidak boleh melebihi qty transaksi dikurangi retur sebelumnya.
- Stok kembali ke batch asal.
- Riwayat retur tersimpan.

---

### 8.11 PRD-RETPUR-001: Retur Pembelian

**Deskripsi:**
Sistem harus mendukung retur pembelian ke supplier.

**Aktor:**
- Manager

**Prioritas:** Should Have

**Kebutuhan Produk:**
- Manager memilih pembelian asal atau batch terkait.
- Manager mengisi qty retur.
- Qty retur tidak boleh melebihi stok batch tersedia.
- Stok batch berkurang.
- Mutasi stok keluar tercatat.
- Alasan retur harus dicatat.

**Acceptance Criteria:**
- Retur pembelian mengurangi stok batch terkait.
- Sistem menolak retur jika qty melebihi stok tersedia.
- Riwayat retur pembelian tersimpan.
- Mutasi stok keluar tercatat.

---

### 8.12 PRD-STOCK-001: Stok dan Mutasi Stok

**Deskripsi:**
Sistem harus mencatat stok dan seluruh perubahan stok.

**Aktor:**
- Manager
- Kasir

**Prioritas:** Must Have

**Kebutuhan Produk:**
- Stok disimpan dalam satuan terkecil.
- Setiap perubahan stok membuat mutasi stok.
- Mutasi stok mencatat tipe perubahan: pembelian, penjualan, retur penjualan, retur pembelian, koreksi.
- Manager dapat melihat riwayat mutasi stok per produk dan batch.

**Acceptance Criteria:**
- Penjualan membuat mutasi stok keluar.
- Pembelian membuat mutasi stok masuk.
- Retur penjualan membuat mutasi stok masuk.
- Retur pembelian membuat mutasi stok keluar.
- Koreksi stok wajib mencatat alasan.

---

### 8.13 PRD-DASH-001: Dashboard Ringkasan

**Deskripsi:**
Sistem harus menyediakan dashboard untuk memantau kondisi apotek.

**Aktor:**
- Manager
- Pemilik

**Prioritas:** Must Have

**Kebutuhan Produk:**
Dashboard minimal menampilkan:
- omzet hari ini;
- laba hari ini;
- laba minggu ini;
- laba bulan ini;
- laba tahun ini;
- jumlah transaksi hari ini;
- jumlah produk stok kritis;
- jumlah batch mendekati kedaluwarsa;
- daftar ringkas stok kritis;
- daftar ringkas batch mendekati kedaluwarsa.

**Acceptance Criteria:**
- Dashboard tampil setelah manager login.
- Nilai laba berasal dari detail transaksi.
- Stok kritis dihitung dari ambang minimum produk.
- Batch mendekati kedaluwarsa tampil berdasarkan konfigurasi alert.

---

### 8.14 PRD-REPORT-001: Laporan Penjualan dan Laba

**Deskripsi:**
Sistem harus menyediakan laporan penjualan dan laba.

**Aktor:**
- Manager
- Pemilik

**Prioritas:** Must Have

**Kebutuhan Produk:**
- Laporan harian.
- Laporan mingguan.
- Laporan bulanan.
- Laporan tahunan.
- Filter rentang tanggal kustom.
- Total omzet.
- Total HPP.
- Total diskon.
- Total laba.
- Detail transaksi.
- Detail retur yang memengaruhi laporan.

**Acceptance Criteria:**
- Laporan dapat difilter berdasarkan tanggal.
- Laba dihitung dari detail transaksi tersimpan.
- Retur penjualan mengoreksi laporan.
- Laporan tidak berubah ketika harga produk terbaru diubah.

---

### 8.15 PRD-EXPORT-001: Ekspor Laporan

**Deskripsi:**
Sistem harus mendukung ekspor laporan untuk kebutuhan arsip dan analisis.

**Aktor:**
- Manager
- Pemilik

**Prioritas:** Should Have

**Kebutuhan Produk:**
- Laporan dapat diekspor ke Excel `.xlsx`.
- Laporan dapat diekspor ke PDF.
- File ekspor menampilkan periode laporan, omzet, HPP, diskon, laba, dan detail transaksi.

**Acceptance Criteria:**
- Ekspor Excel berhasil dibuat.
- Ekspor PDF berhasil dibuat.
- Isi file ekspor sesuai filter laporan yang aktif.

---

### 8.16 PRD-HIST-001: Riwayat Transaksi

**Deskripsi:**
Sistem harus menyediakan halaman riwayat transaksi untuk melihat transaksi penjualan yang telah tersimpan.

**Aktor:**
- Kasir
- Manager

**Prioritas:** Must Have

**Kebutuhan Produk:**
- Kasir dapat melihat riwayat transaksi penjualan sesuai batasan akses.
- Manager dapat melihat seluruh riwayat transaksi.
- Detail transaksi menampilkan item, qty, satuan, harga jual, diskon, total, metode pembayaran, dan status retur.
- Data sensitif seperti HPP dan laba tidak boleh ditampilkan kepada Kasir.
- Transaksi yang memiliki retur harus dapat ditelusuri dari riwayat transaksi.

**Acceptance Criteria:**
- Riwayat transaksi dapat difilter berdasarkan tanggal.
- Detail transaksi dapat dibuka.
- Transaksi yang memiliki retur menampilkan status retur.
- Kasir tidak melihat HPP dan laba.
- Manager dapat melihat rincian transaksi sesuai hak akses.

---

### 8.17 PRD-USER-001: Manajemen User

**Deskripsi:**
Sistem sebaiknya menyediakan manajemen akun pengguna agar Manager dapat mengatur pengguna yang berhak mengakses sistem.

**Aktor:**
- Manager

**Prioritas:** Should Have

**Kebutuhan Produk:**
- Manager dapat membuat akun pengguna.
- Manager dapat mengubah data pengguna.
- Manager dapat menetapkan role pengguna.
- Manager dapat menonaktifkan akun pengguna.
- Pengguna nonaktif tidak dapat login.
- Role minimal yang wajib tersedia adalah Kasir dan Manager.

**Acceptance Criteria:**
- Manager dapat membuat akun Kasir.
- Manager dapat membuat akun Manager jika diizinkan oleh konfigurasi sistem.
- Akun nonaktif tidak dapat login.
- Kasir tidak dapat mengakses halaman manajemen user.
- Perubahan role pengguna memengaruhi hak akses setelah sesi diperbarui atau login ulang.

Catatan:
- Jika fitur manajemen user UI belum dikerjakan pada tahap awal V1, data user awal dapat dibuat melalui seed database.
- Ketentuan teknis user, token, password, dan authorization dijelaskan lebih lanjut pada SRS, SDD, dan dokumen backend.

---

### 8.18 PRD-SET-001: Pengaturan Profil Apotek

**Deskripsi:**
Sistem sebaiknya menyediakan pengaturan profil apotek untuk menampilkan identitas dasar apotek pada aplikasi, laporan, dan hasil ekspor.

**Aktor:**
- Manager

**Prioritas:** Should Have

**Kebutuhan Produk:**
- Manager dapat mengatur nama apotek.
- Manager dapat mengatur alamat apotek.
- Manager dapat mengatur nomor kontak apotek.
- Manager dapat mengatur informasi dasar yang ditampilkan pada dashboard, halaman kasir, laporan, dan ekspor.
- Kasir tidak dapat mengubah pengaturan profil apotek.

**Acceptance Criteria:**
- Nama apotek tampil pada layout aplikasi.
- Nama apotek tampil pada laporan atau export jika fitur export diaktifkan.
- Manager dapat memperbarui profil apotek.
- Kasir tidak dapat membuka halaman pengaturan.
- Perubahan pengaturan tidak mengubah histori transaksi lama.

---

## 9. Aturan Bisnis Utama

### 9.1 Aturan Stok

| ID | Aturan |
|---|---|
| BR-STOCK-001 | Stok wajib disimpan dalam satuan terkecil |
| BR-STOCK-002 | Stok batch tidak boleh negatif |
| BR-STOCK-003 | Setiap perubahan stok wajib menghasilkan mutasi stok |
| BR-STOCK-004 | Produk nonaktif tidak boleh dipilih pada transaksi baru |
| BR-STOCK-005 | Produk nonaktif tetap tampil pada histori transaksi lama |
| BR-STOCK-006 | Koreksi stok wajib memiliki alasan |

### 9.2 Aturan Batch

| ID | Aturan |
|---|---|
| BR-BATCH-001 | Satu produk dapat memiliki banyak batch |
| BR-BATCH-002 | Batch wajib memiliki tanggal kedaluwarsa |
| BR-BATCH-003 | Batch expired tidak boleh dipakai untuk transaksi normal |
| BR-BATCH-004 | Batch dengan stok nol tidak boleh dipilih sistem |
| BR-BATCH-005 | Batch yang sudah memiliki histori tidak boleh dihapus permanen |
| BR-BATCH-006 | Harga jual transaksi wajib berasal dari batch yang digunakan |

### 9.3 Aturan FEFO

| ID | Aturan |
|---|---|
| BR-FEFO-001 | Batch dengan expired date paling dekat dipakai lebih dulu |
| BR-FEFO-002 | Jika stok batch pertama tidak cukup, sistem mengambil batch berikutnya |
| BR-FEFO-003 | FEFO dihitung server-side |
| BR-FEFO-004 | Frontend hanya boleh menampilkan estimasi FEFO |

### 9.4 Aturan Harga dan HPP

| ID | Aturan |
|---|---|
| BR-PRICE-001 | Harga jual disimpan per batch dan per satuan jual |
| BR-PRICE-002 | HPP dihitung dari harga beli dan konversi satuan |
| BR-PRICE-003 | HPP transaksi disimpan permanen pada detail transaksi |
| BR-PRICE-004 | Perubahan harga setelah transaksi tidak boleh mengubah histori transaksi lama |
| BR-PRICE-005 | Laba tidak boleh dihitung dari harga terbaru produk |
| BR-PRICE-006 | Fitur ini disebut Presisi Harga Modal dan HPP, bukan harga jual fleksibel |
| BR-PRICE-007 | Harga modal, HPP, dan laba internal memakai presisi desimal tinggi |
| BR-PRICE-008 | Harga jual pelanggan ditentukan manual oleh Manager dalam nilai rupiah bulat |
| BR-PRICE-009 | Harga jual kasir tidak dihitung otomatis dari harga modal |
| BR-PRICE-010 | Kasir hanya melihat harga jual final, bukan harga modal, HPP, margin, atau laba |

Sistem harus mendukung penyimpanan harga modal atau harga beli supplier dengan presisi desimal tinggi. Presisi tinggi hanya diterapkan pada harga modal, HPP, dan perhitungan laba internal. Harga jual ke pelanggan tidak dihitung otomatis dari harga modal, melainkan ditentukan secara manual oleh Manager. Harga jual yang tampil pada halaman kasir menggunakan harga jual final yang sudah ditetapkan Manager dalam nilai rupiah bulat.

Presisi tinggi juga berlaku untuk diskon pembelian, PPN pembelian, total modal, dan pencocokan faktur supplier. Uang, HPP, pajak, diskon, dan laba tidak boleh dirancang memakai `FLOAT`, `DOUBLE`, atau `REAL`; gunakan `NUMERIC` atau `DECIMAL`.

### 9.4A Aturan PO, Pembelian Supplier, Resep, dan Konseling

| ID | Aturan |
|---|---|
| BR-PO-001 | PO tidak boleh menambah stok |
| BR-PO-002 | PO tidak boleh mengurangi stok |
| BR-PO-003 | PO dapat dibuat Apoteker atau Manager dan pembuat diambil dari user login |
| BR-PO-004 | PO dapat ditarik ke Pembelian dan dapat diterima sebagian |
| BR-PUR-006 | Pembelian dapat dibuat manual atau dari PO |
| BR-PUR-007 | Pembelian final wajib mencatat batch, expired date, HPP, harga jual final, stok masuk, dan mutasi stok |
| BR-PUR-008 | Diskon pembelian dapat berupa `NONE`, `NOMINAL`, atau `PERCENT` |
| BR-PUR-009 | Mode PPN pembelian adalah `NON_PPN`, `PPN_INCLUDED`, atau `PPN_EXCLUDED` |
| BR-PUR-010 | Total pembelian sistem wajib dibandingkan dengan total faktur supplier |
| BR-UNIT-001 | Kasir hanya dapat memilih satuan jual aktif |
| BR-PRESC-001 | Resep dasar tidak mengurangi stok sebelum checkout berhasil |
| BR-PRESC-002 | Resep siap bayar dapat ditarik ke kasir |
| BR-COUNS-001 | Konseling dasar hanya dokumentasi, tidak membuat tagihan dan tidak mengubah stok |
| BR-FUTURE-001 | Piutang pelanggan dicatat sebagai future enhancement, bukan fitur inti V1 |

### 9.5 Aturan Diskon

| ID | Aturan |
|---|---|
| BR-DISC-001 | Diskon dapat berupa persen atau nominal |
| BR-DISC-002 | Diskon tidak boleh melebihi subtotal transaksi |
| BR-DISC-003 | Diskon transaksi dialokasikan proporsional ke detail batch |
| BR-DISC-004 | Diskon memengaruhi laba detail transaksi |

### 9.6 Aturan Retur

| ID | Aturan |
|---|---|
| BR-RET-001 | Retur penjualan wajib mengacu pada transaksi asal |
| BR-RET-002 | Retur penjualan mengembalikan stok ke batch asal |
| BR-RET-003 | Qty retur tidak boleh melebihi sisa qty yang belum diretur |
| BR-RET-004 | Retur pembelian wajib mengacu pada pembelian atau batch asal |
| BR-RET-005 | Retur tidak boleh menghapus transaksi asli |
| BR-RET-006 | Setiap retur wajib memiliki alasan |

---

## 10. Rumus Produk yang Wajib Dipertahankan

### 10.1 Konversi Satuan

```text
stok_satuan_terkecil = jumlah_satuan_besar * isi_satuan_besar * isi_satuan_menengah
```

Contoh:
```text
1 box = 10 strip
1 strip = 10 tablet
stok_satuan_terkecil = 1 * 10 * 10 = 100 tablet
```

### 10.2 HPP Satuan Terkecil

```text
hpp_satuan_terkecil = harga_beli_satuan_besar / jumlah_satuan_terkecil_dalam_satuan_besar
```

Harga beli supplier dapat disimpan dengan presisi tinggi agar pembagian ke satuan dasar tidak kehilangan akurasi.

### 10.3 Subtotal Detail

```text
subtotal_detail = harga_jual_batch_per_satuan * qty
```

### 10.4 HPP Detail

```text
hpp_detail = hpp_satuan_terkecil * konversi_satuan_jual_ke_terkecil * qty
```

### 10.5 Laba Detail

```text
laba_detail = subtotal_detail - hpp_detail - diskon_alokasi_detail
```

Backend wajib menghitung laba berdasarkan harga jual final yang ditetapkan Manager dikurangi HPP internal yang disimpan secara presisi. Nilai tampilan laporan boleh dibulatkan, tetapi nilai internal tidak boleh diubah hanya untuk kebutuhan display.

### 10.6 Diskon Proporsional

```text
diskon_alokasi_detail = (subtotal_detail / subtotal_transaksi) * total_diskon
```

Catatan:
- Pembulatan nominal harus ditetapkan secara eksplisit di SRS atau SDD.
- Jika terdapat selisih pembulatan, sistem harus mengalokasikan selisih ke detail transaksi terakhir atau menggunakan strategi pembulatan yang konsisten.

---

## 11. Non-Functional Product Requirements

| ID | Kebutuhan | Prioritas | Kriteria |
|---|---|---|---|
| NFR-001 | Responsif | Must Have | Halaman kasir dapat digunakan pada desktop, tablet, dan mobile |
| NFR-002 | Tidak ada horizontal scroll tidak perlu | Must Have | Layout tidak keluar dari viewport pada ukuran layar umum |
| NFR-003 | Kecepatan pencarian | Must Have | Pencarian produk terasa cepat untuk katalog 500-2.000 item |
| NFR-004 | Keamanan akses | Must Have | Role membatasi fitur sesuai hak akses |
| NFR-005 | Konsistensi data | Must Have | Transaksi, stok, batch, dan laporan harus sinkron |
| NFR-006 | Auditability | Must Have | Mutasi stok dan transaksi dapat ditelusuri |
| NFR-007 | Data historis stabil | Must Have | Perubahan harga produk tidak mengubah transaksi lama |
| NFR-008 | Maintainability | Should Have | Struktur fitur mudah dipisahkan menjadi modul |
| NFR-009 | Exportability | Should Have | Laporan dapat diekspor untuk arsip |
| NFR-010 | Error clarity | Must Have | Kesalahan validasi menampilkan pesan yang jelas |

---

## 12. Alur Produk Tingkat Tinggi

### 12.1 Alur Login

```text
Pengguna membuka aplikasi
-> Mengisi username/email dan password
-> Sistem memvalidasi akun
-> Sistem membaca role
-> Kasir diarahkan ke halaman kasir
-> Manager diarahkan ke dashboard
```

### 12.2 Alur Pembelian Supplier

```text
Manager membuka menu pembelian
-> Memilih supplier
-> Opsional memilih No. PO milik supplier
-> Sistem menarik item PO sebagai draft pembelian
-> Manager menyesuaikan produk, qty diterima, harga beli final, diskon, PPN, batch, expired date, dan harga jual
-> Manager mengisi total faktur supplier
-> Sistem menghitung HPP dan total sistem
-> Sistem mencocokkan total sistem dengan faktur supplier
-> Sistem membuat batch
-> Sistem menambah stok
-> Sistem mencatat mutasi stok masuk
-> Sistem memperbarui status PO jika berasal dari PO
```

### 12.2A Alur Pemesanan / PO Obat

```text
Apoteker atau Manager membuka Pemesanan
-> Tambah PO
-> Pilih supplier
-> Input tanggal PO
-> Data pembuat otomatis dari login
-> Tambah item obat, satuan, qty, estimasi harga, dan catatan
-> Simpan PO
-> Cetak PO jika diperlukan
-> Kirim ke supplier
```

### 12.2B Alur PO ke Pembelian

```text
Barang datang
-> Manager membuka Pembelian
-> Memilih supplier
-> Memilih No. PO
-> Item PO ditarik sebagai draft
-> Manager menyesuaikan qty, harga, diskon, PPN, batch, dan expired date
-> Manager mencocokkan faktur
-> Pembelian final disimpan
-> Stok batch bertambah
```

### 12.3 Alur Penjualan Kasir

```text
Kasir membuka halaman kasir
-> Mencari obat
-> Memilih obat
-> Memilih satuan jual
-> Mengisi qty
-> Sistem menampilkan estimasi harga dan stok
-> Kasir menambahkan ke keranjang
-> Kasir mengisi diskon jika ada
-> Kasir memilih metode pembayaran
-> Kasir mengisi uang diterima jika cash
-> Sistem menghitung total dan kembalian
-> Kasir menyimpan transaksi
-> Server menghitung FEFO, split batch, harga final, HPP, diskon alokasi, dan laba
-> Sistem mengurangi stok batch
-> Sistem menyimpan transaksi dan detail transaksi
```

### 12.3A Alur Resep ke Kasir

```text
Apoteker input resep
-> Sistem mengecek produk dan satuan jual aktif
-> Apoteker isi aturan pakai dan catatan etiket
-> Resep disimpan tanpa mengurangi stok
-> Apoteker menandai resep siap bayar
-> Kasir menarik resep READY_FOR_PAYMENT
-> Item resep masuk keranjang
-> Kasir memproses pembayaran
-> Backend checkout menjalankan FEFO dan mengurangi stok
-> Status resep berubah menjadi PAID/COMPLETED
```

### 12.3B Alur Konseling Dasar

```text
Apoteker membuka Konseling
-> Pilih resep/transaksi jika terkait
-> Isi topik dan catatan konseling
-> Simpan catatan
```

### 12.4 Alur Retur Penjualan

```text
Kasir membuka retur penjualan
-> Mencari transaksi asal
-> Memilih item yang diretur
-> Mengisi qty retur
-> Mengisi alasan retur
-> Sistem memvalidasi qty
-> Sistem mengembalikan stok ke batch asal
-> Sistem mengoreksi laba laporan
-> Sistem menyimpan riwayat retur
```

### 12.5 Alur Laporan

```text
Manager membuka laporan
-> Memilih periode
-> Sistem mengambil transaksi dan retur dalam periode
-> Sistem menghitung omzet, HPP, diskon, dan laba
-> Manager melihat ringkasan dan detail
-> Manager dapat mengekspor laporan
```

---

## 13. Acceptance Criteria Produk V1

Produk V1 dianggap layak jika seluruh kriteria berikut terpenuhi:

| ID | Acceptance Criteria |
|---|---|
| AC-001 | Pengguna dapat login sesuai role |
| AC-002 | Role kasir tidak dapat membuka menu laporan laba dan pengaturan harga |
| AC-003 | Manager dapat membuat produk, kategori, supplier, satuan, dan batch |
| AC-004 | Pembelian supplier dapat membuat batch baru |
| AC-005 | Stok pembelian dikonversi ke satuan terkecil |
| AC-005A | PO dapat dibuat, dicetak, tidak mengubah stok, dan dapat ditarik ke pembelian |
| AC-005B | Pembelian dapat dibuat manual atau dari PO |
| AC-005C | Pembelian mendukung diskon pembelian nominal/persen, PPN/non-PPN, dan validasi faktur supplier |
| AC-005D | Setiap barang masuk wajib memiliki nomor batch dan expired date |
| AC-006 | Kasir dapat mencari produk dari halaman kasir |
| AC-007 | Kasir dapat memilih satuan jual |
| AC-007A | Kasir hanya dapat memilih satuan jual aktif |
| AC-008 | Kasir dapat menambahkan item ke keranjang |
| AC-009 | Sistem menolak transaksi jika stok tidak cukup |
| AC-010 | Sistem menerapkan FEFO server-side |
| AC-011 | Sistem melakukan split detail transaksi jika stok berasal dari beberapa batch |
| AC-012 | Detail transaksi menyimpan batch, qty, harga jual, HPP, diskon alokasi, dan laba |
| AC-013 | Diskon persen dan nominal dapat digunakan |
| AC-014 | Diskon tidak boleh lebih besar dari subtotal |
| AC-015 | Retur penjualan mengacu pada transaksi asal |
| AC-016 | Retur penjualan mengembalikan stok ke batch asal |
| AC-017 | Retur penjualan mengoreksi laba laporan |
| AC-018 | Retur pembelian mengurangi stok batch terkait |
| AC-019 | Mutasi stok tercatat untuk pembelian, penjualan, retur, dan koreksi |
| AC-020 | Dashboard menampilkan omzet, laba, transaksi, stok kritis, dan expired alert |
| AC-021 | Laporan dapat difilter berdasarkan tanggal |
| AC-022 | Laporan laba berasal dari detail transaksi, bukan harga produk terbaru |
| AC-023 | Perubahan harga batch setelah transaksi tidak mengubah histori transaksi lama |
| AC-024 | Produk nonaktif tidak dapat dipilih untuk transaksi baru |
| AC-025 | Histori transaksi produk nonaktif tetap dapat dibaca |
| AC-026 | Ekspor laporan Excel berhasil dibuat |
| AC-027 | Ekspor laporan PDF berhasil dibuat |
| AC-028 | Halaman kasir responsif dan tidak memunculkan horizontal scroll yang tidak perlu |
| AC-029 | Input uang cash menghitung kembalian otomatis |
| AC-030 | Transaksi tidak dapat disimpan jika pembayaran cash kurang dari total |
| AC-031 | Riwayat transaksi dapat ditampilkan dan difilter berdasarkan tanggal |
| AC-032 | Detail transaksi dapat dibuka sesuai hak akses role |
| AC-033 | Kasir tidak melihat HPP dan laba pada riwayat transaksi |
| AC-034 | Manager dapat mengelola user jika fitur manajemen user diaktifkan |
| AC-035 | User nonaktif tidak dapat login |
| AC-036 | Manager dapat mengatur profil apotek jika fitur settings diaktifkan |
| AC-037 | Apoteker dapat membuat resep dasar dan resep tidak mengurangi stok sebelum checkout |
| AC-038 | Kasir dapat menarik resep siap bayar ke transaksi |
| AC-039 | Apoteker dapat mencatat konseling tanpa tagihan dan tanpa perubahan stok |
| AC-040 | Piutang pelanggan tetap future enhancement dan tidak masuk task P0/P1 V1 |

---

## 14. Guardrail Implementasi untuk AI Coding

AI coding wajib mengikuti batasan berikut:

1. Jangan menyimpan stok hanya pada level produk.
2. Jangan menghitung laba dari harga produk terbaru.
3. Jangan menyimpan harga jual hanya pada level produk.
4. Jangan mengabaikan batch saat transaksi.
5. Jangan mengabaikan FEFO saat penjualan normal.
6. Jangan membiarkan stok batch menjadi negatif.
7. Jangan membuat retur tanpa referensi transaksi atau pembelian asal.
8. Jangan menghapus permanen transaksi, batch, pembelian, retur, atau mutasi stok yang sudah memiliki histori.
9. Jangan menjadikan frontend sebagai sumber kebenaran harga final, HPP, FEFO, split batch, diskon alokasi, atau laba.
10. Jangan memberi akses laporan laba dan pengaturan harga kepada kasir.
11. Jangan menambahkan fitur payment gateway, BPJS, multi-cabang, atau loyalty program pada V1.
12. Jangan menamai requirement ini sebagai harga jual fleksibel; gunakan Presisi Harga Modal dan HPP.
13. Jangan menghitung harga jual pelanggan otomatis dari harga modal.
14. Jangan menjadikan PO sebagai penambah stok.
15. Jangan mengurangi stok saat resep dibuat.
16. Jangan menganggap semua satuan dasar otomatis boleh dijual.
17. Jangan memakai FLOAT, DOUBLE, atau REAL untuk uang, HPP, pajak, diskon, atau laba.
18. Jangan membuat clinical decision support otomatis.
19. Jangan memasukkan piutang sebagai fitur inti V1 tanpa keputusan eksplisit.
20. Jangan mencampur detail SRS, SDD, UI flow, dan task teknis terlalu dalam ke PRD ini.
21. Jangan membuat nama field database final hanya berdasarkan PRD; finalisasi database harus dilakukan di SDD.
22. Jangan membuat endpoint API final hanya berdasarkan PRD; finalisasi API harus dilakukan di SDD.
23. Jangan mengubah aturan bisnis utama tanpa memperbarui PRD, SRS, SDD, UI/UX Flow, dan Task Breakdown secara konsisten.

---

## 15. Risiko Produk

| ID | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| RISK-001 | Kalkulasi stok salah karena konversi satuan tidak konsisten | Tinggi | Semua stok disimpan dalam satuan terkecil |
| RISK-002 | Laba salah karena harga batch tidak disimpan di detail transaksi | Tinggi | Detail transaksi wajib menyimpan harga jual dan HPP final |
| RISK-003 | Batch expired terjual karena FEFO tidak diterapkan server-side | Tinggi | FEFO wajib dihitung server-side |
| RISK-004 | Diskon membuat laporan laba tidak akurat | Sedang | Diskon dialokasikan proporsional ke detail batch |
| RISK-005 | Retur merusak histori transaksi | Tinggi | Retur harus membuat catatan baru, bukan menghapus transaksi asli |
| RISK-006 | Kasir mengakses data keuangan sensitif | Sedang | Role-based access control wajib diterapkan |
| RISK-007 | Fitur V1 terlalu luas | Tinggi | Out of Scope harus dipatuhi |
| RISK-008 | UI kasir terlalu kompleks | Sedang | UI kasir harus fokus pada transaksi utama |
| RISK-009 | Perubahan harga mengubah laporan lama | Tinggi | Harga transaksi disimpan permanen di detail transaksi |
| RISK-010 | Data lokal frontend dianggap final | Tinggi | Frontend hanya menyimpan draft/estimasi, server tetap sumber kebenaran |

---

## 16. Definisi Istilah

| Istilah | Definisi |
|---|---|
| POS | Point of Sale, sistem pencatatan transaksi penjualan |
| Produk | Master obat atau barang apotek |
| Batch | Kelompok stok produk berdasarkan nomor batch, tanggal kedaluwarsa, harga beli, HPP, dan harga jual |
| FEFO | First Expired First Out, metode penggunaan stok berdasarkan tanggal kedaluwarsa terdekat |
| Satuan besar | Satuan pembelian besar, misalnya box atau dus |
| Satuan menengah | Satuan di antara satuan besar dan terkecil, misalnya strip |
| Satuan terkecil | Satuan dasar penyimpanan stok, misalnya tablet, kaplet, kapsul, botol, atau biji |
| HPP | Harga Pokok Penjualan |
| Omzet | Total nilai penjualan kotor sebelum dikurangi HPP |
| Diskon | Potongan harga transaksi |
| Laba detail | Subtotal detail dikurangi HPP detail dan diskon alokasi |
| Mutasi stok | Riwayat perubahan stok |
| Retur penjualan | Pengembalian barang dari pelanggan ke apotek |
| Retur pembelian | Pengembalian barang dari apotek ke supplier |
| Produk nonaktif | Produk yang tidak dapat dipakai transaksi baru tetapi histori lamanya tetap tersimpan |

---

## 17. Traceability Awal

| PRD ID | Akan Diturunkan ke SRS | Akan Diturunkan ke SDD | Akan Diturunkan ke UI/UX | Akan Diturunkan ke Task |
|---|---|---|---|---|
| PRD-AUTH-001 | SRS-AUTH-* | SDD-AUTH-* | UX-LOGIN-* | TASK-AUTH-* |
| PRD-PROD-001 | SRS-PROD-* | SDD-DB-PROD-* | UX-PROD-* | TASK-PROD-* |
| PRD-UNIT-001 | SRS-UNIT-* | SDD-DB-UNIT-* | UX-UNIT-* | TASK-UNIT-* |
| PRD-BATCH-001 | SRS-BATCH-* | SDD-DB-BATCH-* | UX-BATCH-* | TASK-BATCH-* |
| PRD-PUR-001 | SRS-PUR-* | SDD-API-PUR-* | UX-PUR-* | TASK-PUR-* |
| PRD-SALE-001 | SRS-SALE-* | SDD-API-SALE-* | UX-KASIR-* | TASK-SALE-* |
| PRD-FEFO-001 | SRS-FEFO-* | SDD-SERVICE-FEFO-* | UX-KASIR-* | TASK-FEFO-* |
| PRD-SPLIT-001 | SRS-SPLIT-* | SDD-SERVICE-SPLIT-* | UX-RIWAYAT-* | TASK-SPLIT-* |
| PRD-DISC-001 | SRS-DISC-* | SDD-SERVICE-DISC-* | UX-KASIR-* | TASK-DISC-* |
| PRD-RETSALE-001 | SRS-RETSALE-* | SDD-API-RETSALE-* | UX-RETSALE-* | TASK-RETSALE-* |
| PRD-RETPUR-001 | SRS-RETPUR-* | SDD-API-RETPUR-* | UX-RETPUR-* | TASK-RETPUR-* |
| PRD-STOCK-001 | SRS-STOCK-* | SDD-DB-STOCK-* | UX-STOCK-* | TASK-STOCK-* |
| PRD-DASH-001 | SRS-DASH-* | SDD-API-DASH-* | UX-DASH-* | TASK-DASH-* |
| PRD-REPORT-001 | SRS-REPORT-* | SDD-API-REPORT-* | UX-REPORT-* | TASK-REPORT-* |
| PRD-EXPORT-001 | SRS-EXPORT-* | SDD-SERVICE-EXPORT-* | UX-REPORT-* | TASK-EXPORT-* |
| PRD-HIST-001 | SRS-HIST-* | SDD-API-SALE-* | UX-RIWAYAT-* | TASK-HIST-* |
| PRD-USER-001 | SRS-USER-* | SDD-AUTH-USER-* | UX-USER-* | TASK-USER-* |
| PRD-SET-001 | SRS-SET-* | SDD-API-SETTINGS-* | UX-SETTINGS-* | TASK-SETTINGS-* |

---

## 18. Definition of Done PRD

Dokumen PRD ini dianggap selesai jika:

- tujuan produk sudah jelas;
- target pengguna sudah terdefinisi;
- scope V1 dan out of scope sudah tegas;
- fitur utama memiliki ID;
- prioritas fitur sudah ditentukan;
- user stories tersedia;
- aturan bisnis utama tersedia;
- acceptance criteria produk tersedia;
- guardrail implementasi tersedia;
- dokumen dapat menjadi dasar untuk menyusun SRS, SDD, UI/UX Flow, dan Task Breakdown;
- dokumen frontend dan backend sudah dicatat sebagai dokumen teknis turunan;
- scope tambahan hasil sinkronisasi frontend dan backend sudah dicatat tanpa mengubah PRD menjadi dokumen teknis implementasi.

---

## 19. Catatan Sinkronisasi Dokumen

Dokumen PRD ini telah diperbarui untuk mencatat keputusan pemisahan backend dan frontend yang sudah ditetapkan.

Dokumen yang harus tetap disinkronkan setelah pembaruan PRD:

1. `02_SRS_POS_APOTEK.md`
   Fokus: kebutuhan sistem, validasi, error handling, rule detail, permission, dan perilaku fitur.

2. `03_SDD_SYSTEM_DESIGN_POS_APOTEK.md`
   Fokus: arsitektur, database final, API, service layer, auth, security, deployment, dan backup.

3. `04_UI_UX_FLOW_POS_APOTEK.md`
   Fokus: halaman login, dashboard, kasir, riwayat transaksi, produk, batch, pembelian, stok, retur, laporan, settings, dan responsif.

4. `05_TASK_BREAKDOWN_POS_APOTEK.md`
   Fokus: daftar task frontend, backend, database, testing, dan definition of done setiap task.

5. `06_FRONTEND_POS_APOTEK.md`
   Fokus: arsitektur frontend, routing, layout, komponen UI, state management, validasi frontend, role-based UI, dan integrasi API.

6. `07_BACKEND_POS_APOTEK.md`
   Fokus: arsitektur backend, service layer, database konseptual, API, transaksi stok, FEFO, split batch, HPP, laba, authorization, audit log, testing, deployment, dan backup.

Jika kebutuhan produk berubah, pembaruan harus dimulai dari PRD, lalu diturunkan secara konsisten ke SRS, SDD, UI/UX Flow, Task Breakdown, Frontend, dan Backend. Jalur ini memang terdengar membosankan, tetapi jauh lebih baik daripada membiarkan dokumen saling bertentangan seperti rapat tanpa moderator.

---

## 20. Ringkasan Perubahan Versi 1.1.0

| Area | Perubahan |
|---|---|
| Metadata | Versi dinaikkan ke 1.1.0, status diperbarui, dan tanggal disinkronkan |
| Related documents | Menambahkan dokumen frontend dan backend |
| Instruksi pembacaan | Menambahkan urutan prioritas dokumen jika terjadi konflik |
| Prinsip produk | Menambahkan keputusan pemisahan tanggung jawab frontend dan backend |
| Scope V1 | Menambahkan riwayat transaksi, manajemen user, dan pengaturan profil apotek |
| Acceptance criteria | Menambahkan kriteria riwayat transaksi, user nonaktif, dan settings |
| Traceability | Menambahkan mapping untuk riwayat transaksi, user, dan settings |
| Catatan sinkronisasi | Menjelaskan dokumen turunan yang harus tetap selaras |
