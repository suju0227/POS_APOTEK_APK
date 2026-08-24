---
document_name: "07_BACKEND_ONLY_POS_APOTEK"
document_type: "Backend Analysis / Backend Architecture Guide"
project_name: "POS Apotek"
version: "1.0.0"
status: "Draft"
prepared_for: "AI Vibe Coding / Codex GPT"
prepared_by: "Suryadi Umar"
last_updated: "2026-06-02"
source_documents:
  - "01_PRD_POS_APOTEK.md"
  - "02_SRS_POS_APOTEK.md"
related_documents:
  - "03_SDD_SYSTEM_DESIGN_POS_APOTEK.md"
  - "04_UI_UX_FLOW_POS_APOTEK.md"
  - "05_TASK_BREAKDOWN_POS_APOTEK.md"
  - "06_FRONTEND_ONLY_POS_APOTEK.md"
---

# Backend Only - POS Apotek

## 0. Instruksi Pembacaan untuk AI Coding

Dokumen ini menjelaskan rancangan dan analisis **backend-only** untuk aplikasi **POS Apotek**. Dokumen ini harus digunakan sebagai pedoman dalam membangun server, database, API, autentikasi, otorisasi, service layer, transaksi stok, FEFO, split batch, HPP, diskon alokasi, retur, mutasi stok, laporan, ekspor, logging, dan testing backend.

Dokumen ini **bukan** dokumen frontend. Frontend hanya disebut sebagai konsumen API. Semua keputusan antarmuka pengguna, layout, komponen UI, dan state management frontend harus mengikuti dokumen frontend terpisah.

AI coding wajib mengikuti ketentuan berikut:

1. Backend adalah sumber kebenaran untuk stok, batch, FEFO, HPP, harga final transaksi, split batch, diskon alokasi, laba, retur, dan mutasi stok.
2. Frontend tidak boleh menentukan hasil final transaksi. Backend wajib menghitung ulang seluruh nilai penting saat transaksi disimpan.
3. Backend tidak boleh menyimpan stok hanya pada level produk.
4. Backend wajib menyimpan stok berdasarkan batch.
5. Backend wajib menyimpan stok dalam satuan dasar atau satuan terkecil.
6. Backend wajib menggunakan database transaction untuk proses penjualan, pembelian, retur, koreksi stok, dan mutasi stok.
7. Backend wajib mencegah stok batch menjadi negatif.
8. Backend wajib menyimpan harga jual final, HPP final, diskon alokasi, dan laba pada detail transaksi.
9. Backend wajib mendukung Presisi Harga Modal dan HPP: harga modal/HPP/laba internal presisi tinggi, harga jual pelanggan rupiah bulat manual dari Manager.
10. Backend wajib menerapkan FEFO saat penjualan normal.
11. Backend wajib melakukan split detail transaksi jika satu item penjualan mengambil stok dari lebih dari satu batch.
12. Backend wajib mencatat mutasi stok untuk setiap perubahan stok.
13. Backend wajib menjaga histori transaksi, batch, pembelian, retur, dan mutasi stok agar tidak dihapus permanen sembarangan.
14. Backend wajib menerapkan role-based access control untuk Kasir, Apoteker, dan Manager.
15. Backend wajib menolak akses harga modal, HPP, margin, laba, laporan laba, koreksi stok, dan pengaturan harga dari role Kasir.
16. Backend wajib memastikan PO tidak menambah/mengurangi stok dan resep tidak mengurangi stok sebelum checkout berhasil.
17. Backend wajib menolak checkout dengan satuan jual yang tidak aktif.
18. Backend tidak boleh menambahkan fitur di luar scope V1 seperti BPJS, payment gateway otomatis, multi-cabang, loyalty program, clinical decision support otomatis, piutang inti V1, dan akuntansi lengkap.

Jika ada konflik antara dokumen ini dan SRS, aturan SRS harus diutamakan. Jika ada konflik antara dokumen ini dan PRD, kebutuhan produk pada PRD harus dijadikan dasar koreksi.

---

## 1. Tujuan Dokumen

Tujuan dokumen ini adalah memberikan pedoman backend yang jelas, terstruktur, dan dapat langsung digunakan oleh AI coding dalam membangun sistem POS Apotek.

Secara khusus, dokumen ini bertujuan untuk:

- menentukan stack backend yang paling cocok;
- menjelaskan arsitektur backend;
- mendefinisikan modul backend;
- mendefinisikan struktur folder backend;
- menjelaskan rancangan database konseptual;
- menjelaskan service layer dan tanggung jawabnya;
- menjelaskan alur transaksi penjualan berbasis FEFO;
- menjelaskan strategi database transaction dan locking;
- menjelaskan autentikasi dan otorisasi;
- menjelaskan rancangan API;
- menjelaskan error handling;
- menjelaskan logging dan audit trail;
- menjelaskan strategi testing backend;
- menyediakan guardrail implementasi backend;
- menyediakan prompt eksekusi untuk Codex atau AI coding.

---

## 2. Karakteristik Backend POS Apotek

Backend POS Apotek bukan sekadar backend CRUD. Sistem ini adalah backend transaksi yang harus menjaga akurasi stok, batch, HPP, dan laporan laba.

Karakteristik utama backend:

| Aspek | Kebutuhan Backend |
|---|---|
| Transaksi stok | Penjualan, pembelian, retur, dan koreksi stok harus atomic |
| Batch obat | Setiap produk dapat memiliki banyak batch dengan stok, expired date, HPP, dan harga jual berbeda |
| FEFO | Penjualan normal harus memakai batch dengan expired date paling dekat |
| Split batch | Satu item penjualan dapat terbagi ke beberapa batch |
| HPP historis | HPP transaksi harus disimpan pada detail transaksi |
| Harga historis | Harga jual transaksi harus disimpan pada detail transaksi |
| Retur | Retur harus mengacu pada transaksi atau pembelian asal |
| Auditability | Semua perubahan stok harus memiliki mutasi stok dan referensi |
| Role-based access | Kasir dan Manager memiliki hak akses berbeda |
| PO obat | PO adalah rencana pemesanan dan tidak mengubah stok |
| Resep dasar | Resep ditarik ke kasir dan stok hanya keluar saat checkout |
| Satuan jual aktif | Checkout hanya boleh memakai product unit aktif yang boleh dijual |
| Laporan | Laporan laba harus dihitung dari detail transaksi, bukan harga terbaru |

Backend yang hanya membuat endpoint `create`, `read`, `update`, dan `delete` tanpa service transaksi akan berbahaya untuk POS Apotek. Sistem seperti itu mungkin terlihat selesai, tetapi diam-diam menyiapkan bencana stok. Sebuah tradisi manusia yang aneh: menyebut CRUD sebagai sistem bisnis, lalu kaget ketika bisnisnya ikut kacau.

---

## 3. Rekomendasi Stack Backend

Stack backend yang direkomendasikan:

```text
NestJS
TypeScript
PostgreSQL
Prisma ORM
Raw SQL untuk operasi stok kritis
JWT + Refresh Token
Role-Based Access Control
Zod atau class-validator
Docker
Vitest/Jest untuk testing
```

### 3.1 Alasan Pemilihan Stack

| Komponen | Rekomendasi | Alasan |
|---|---|---|
| Framework | NestJS | Cocok untuk modular monolith, controller, service, guard, pipe, middleware, dan testing |
| Bahasa | TypeScript | Mengurangi kesalahan tipe data pada transaksi, batch, stok, dan laporan |
| Database | PostgreSQL | Cocok untuk data relasional, transaksi atomic, constraint, index, dan locking |
| ORM | Prisma | Cocok untuk schema, migration, query relasional, dan transaksi aplikasi |
| Query kritis | Raw SQL | Dibutuhkan untuk locking stok batch dan query laporan tertentu |
| Auth | JWT + Refresh Token | Cocok untuk aplikasi web dengan role Kasir dan Manager |
| Validasi | DTO + Zod/class-validator | Memastikan input API valid sebelum masuk service layer |
| Deployment | Docker | Memudahkan konsistensi environment lokal dan produksi |
| Testing | Jest/Vitest + Supertest | Cocok untuk unit test, integration test, dan API test |

### 3.2 Keputusan Final Stack

```text
Backend Framework : NestJS
Language          : TypeScript
Database          : PostgreSQL
ORM               : Prisma
Critical Query    : Raw SQL inside database transaction
Auth              : JWT + Refresh Token
Authorization     : Role-Based Access Control
Validation        : DTO + Zod/class-validator
Architecture      : Modular Monolith
Deployment        : Docker + VPS/Cloud
Testing           : Unit, Integration, E2E API Test
```

---

## 4. Keputusan Arsitektur Backend

### 4.1 Gunakan Modular Monolith

Arsitektur backend yang disarankan untuk V1 adalah **modular monolith**.

Alasan:

1. POS Apotek V1 fokus pada satu apotek.
2. Modul bisnis saling terkait erat.
3. Penjualan memengaruhi stok, batch, mutasi, HPP, diskon, retur, dashboard, dan laporan.
4. Microservices akan membuat transaksi lintas layanan menjadi terlalu rumit.
5. Deployment modular monolith lebih sederhana.
6. Testing lebih mudah.
7. Pengembangan oleh AI coding lebih mudah diarahkan.

Microservices tidak direkomendasikan untuk V1. Menggunakan microservices untuk sistem satu apotek sama seperti membawa kontainer pelabuhan untuk mengangkut satu kantong obat batuk. Bisa, tetapi keputusan itu mencurigakan secara teknis.

### 4.2 Backend Layer

Backend harus dibagi menjadi beberapa layer:

```text
Controller Layer
-> DTO/Validation Layer
-> Guard/Authorization Layer
-> Service Layer
-> Domain/Business Logic Layer
-> Repository/Database Access Layer
-> Database
```

### 4.3 Prinsip Layer

| Layer | Tanggung Jawab |
|---|---|
| Controller | Menerima request, memanggil service, mengembalikan response |
| DTO/Validation | Memvalidasi bentuk input |
| Guard | Memeriksa login dan role |
| Service | Menjalankan alur bisnis utama |
| Domain Logic | FEFO, split batch, HPP, diskon alokasi, laba, retur |
| Repository | Query database dan transaksi |
| Database | Menyimpan data dan menjaga constraint |

Controller tidak boleh berisi logika bisnis berat. Controller yang menghitung FEFO adalah tanda bahwa proyek mulai kehilangan akal sehat.

---

## 5. Modul Backend

Modul backend yang disarankan:

```text
auth
users
roles
categories
products
units
suppliers
batches
purchase-orders
purchases
prescriptions
counseling-records
sales
sales-returns
purchase-returns
stock
stock-mutations
stock-adjustments
dashboard
reports
exports
settings
audit-logs
common
```

### 5.1 Daftar Modul dan Tanggung Jawab

| Modul | Tanggung Jawab |
|---|---|
| auth | Login, logout, refresh token, validasi sesi |
| users | Manajemen user, status user, role user |
| roles | Definisi role dan permission |
| categories | Manajemen kategori produk |
| products | Manajemen produk obat/barang |
| units | Satuan dasar dan konversi satuan jual |
| suppliers | Manajemen supplier |
| batches | Manajemen batch, stok batch, harga batch, expired date |
| purchase-orders | PO obat, print preview, dan convert ke draft pembelian |
| purchases | Pembelian supplier manual/dari PO, faktur, diskon pembelian, PPN, dan penambahan stok batch |
| prescriptions | Pelayanan resep dasar dan tarik resep ke kasir |
| counseling-records | Dokumentasi konseling dasar |
| sales | Transaksi penjualan, FEFO, split batch, stok keluar |
| sales-returns | Retur penjualan dan stok kembali ke batch asal |
| purchase-returns | Retur pembelian dan stok keluar ke supplier |
| stock | Ringkasan stok produk dan stok batch |
| stock-mutations | Riwayat mutasi stok |
| stock-adjustments | Koreksi stok oleh Manager |
| dashboard | Ringkasan omzet, laba, stok kritis, expired alert |
| reports | Laporan penjualan dan laporan laba |
| exports | Ekspor laporan ke Excel dan PDF |
| settings | Pengaturan profil apotek dan konfigurasi sistem |
| audit-logs | Catatan aktivitas penting |
| common | Helper, constants, error, pipes, guards, decorators |

---

## 6. Struktur Folder Backend

Struktur folder yang disarankan:

```text
src/
├── main.ts
├── app.module.ts
│
├── config/
│   ├── env.schema.ts
│   ├── app.config.ts
│   ├── database.config.ts
│   └── auth.config.ts
│
├── common/
│   ├── constants/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── roles.decorator.ts
│   ├── dto/
│   ├── enums/
│   ├── errors/
│   │   ├── app-error.ts
│   │   └── error-codes.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── interceptors/
│   ├── pipes/
│   └── utils/
│
├── database/
│   ├── prisma.module.ts
│   ├── prisma.service.ts
│   ├── transaction.service.ts
│   └── seed/
│
├── modules/
│   ├── auth/
│   ├── users/
│   ├── roles/
│   ├── categories/
│   ├── products/
│   ├── units/
│   ├── suppliers/
│   ├── batches/
│   ├── purchase-orders/
│   ├── purchases/
│   ├── prescriptions/
│   ├── counseling-records/
│   ├── sales/
│   ├── sales-returns/
│   ├── purchase-returns/
│   ├── stock/
│   ├── stock-mutations/
│   ├── stock-adjustments/
│   ├── dashboard/
│   ├── reports/
│   ├── exports/
│   ├── settings/
│   └── audit-logs/
│
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

### 6.1 Struktur Per Modul

Setiap modul utama sebaiknya memakai pola:

```text
modules/sales/
├── sales.module.ts
├── sales.controller.ts
├── sales.service.ts
├── sales.repository.ts
├── dto/
│   ├── create-sale.dto.ts
│   └── sale-filter.dto.ts
├── types/
│   └── sale.types.ts
├── utils/
│   ├── discount-allocation.util.ts
│   └── sale-calculation.util.ts
└── tests/
    ├── sales.service.spec.ts
    └── sales.controller.spec.ts
```

---

## 7. Rancangan Database Konseptual

Bagian ini menjelaskan database secara konseptual. Struktur final, tipe data final, index final, dan constraint final tetap harus difinalkan pada SDD.

### 7.1 Entitas Utama

```text
users
roles
user_roles
categories
products
units
product_unit_conversions
suppliers
batches
batch_prices
purchase_orders
purchase_order_items
purchases
purchase_items
prescriptions
prescription_items
counseling_records
sales
sale_items
sale_batch_allocations
sales_returns
sales_return_items
purchase_returns
purchase_return_items
stock_mutations
stock_adjustments
settings
audit_logs
refresh_tokens
```

### 7.2 Relasi Utama

| Relasi | Keterangan |
|---|---|
| Product -> Category | Satu produk memiliki satu kategori |
| Product -> ProductUnitConversion | Satu produk memiliki banyak satuan jual |
| Product -> Batch | Satu produk memiliki banyak batch |
| Supplier -> Purchase | Satu supplier dapat memiliki banyak pembelian |
| Supplier -> PurchaseOrder | Satu supplier dapat memiliki banyak PO |
| PurchaseOrder -> PurchaseOrderItem | Satu PO memiliki banyak item |
| PurchaseOrder -> Purchase | PO dapat dikonversi menjadi pembelian |
| Purchase -> PurchaseItem | Satu pembelian memiliki banyak item |
| Batch -> PurchaseItem | Batch dapat berasal dari pembelian |
| Prescription -> PrescriptionItem | Satu resep memiliki banyak item obat |
| Prescription -> Sale | Resep dapat ditarik menjadi transaksi kasir |
| Prescription/Sale -> CounselingRecord | Konseling dapat terkait resep atau transaksi |
| Sale -> SaleItem | Satu transaksi memiliki banyak item utama |
| SaleItem -> SaleBatchAllocation | Satu item dapat terbagi ke beberapa batch |
| Batch -> SaleBatchAllocation | Batch yang dipakai pada transaksi |
| SaleBatchAllocation -> SalesReturnItem | Retur mengacu detail batch asal |
| Batch -> StockMutation | Setiap perubahan stok mengacu batch |
| User -> StockMutation | Setiap mutasi mencatat user pelaku |

---

## 8. Prinsip Database

### 8.1 Stok Disimpan di Batch

Stok tidak boleh hanya disimpan pada tabel `products`.

Tabel `products` hanya menyimpan data master produk, sedangkan stok aktual disimpan pada tabel `batches`.

Contoh field penting pada `batches`:

```text
id
product_id
batch_number
expired_date
current_stock_base_unit
hpp_base_unit
status
created_at
updated_at
```

### 8.2 Total Stok Produk Dihitung dari Batch

Total stok produk dihitung dari batch aktif yang:

```text
status = ACTIVE
current_stock_base_unit > 0
expired_date >= current_date
```

Batch expired tidak dihitung sebagai stok tersedia untuk penjualan normal.

### 8.3 Gunakan Constraint Database

Constraint database wajib dipakai untuk mencegah data rusak.

| Area | Constraint |
|---|---|
| products | kode produk unik |
| products | barcode unik jika diisi |
| units | faktor konversi > 0 |
| batches | stok tidak boleh negatif |
| batches | HPP tidak boleh negatif |
| batch_prices | harga jual tidak boleh negatif |
| sales | total tidak boleh negatif |
| sale_batch_allocations | qty > 0 |
| stock_mutations | qty perubahan tidak boleh 0 |
| returns | qty retur > 0 |

Rekomendasi tipe data untuk Presisi Harga Modal dan HPP:

| Field | Tipe |
|---|---|
| purchase_price | NUMERIC(18,6) |
| purchase_discount_value | NUMERIC(18,6) |
| purchase_discount_amount | NUMERIC(18,6) |
| purchase_gross_total | NUMERIC(18,6) |
| purchase_net_total | NUMERIC(18,6) |
| tax_amount | NUMERIC(18,6) |
| invoice_total_input | NUMERIC(18,6) |
| calculated_total | NUMERIC(18,6) |
| rounding_adjustment | NUMERIC(18,6) |
| hpp_base | NUMERIC(18,8) |
| selling_price | NUMERIC(18,0) |
| sale_unit_price atau snapshot harga jual transaksi | NUMERIC(18,0) |
| sale_total | NUMERIC(18,0) |
| paid_amount | NUMERIC(18,0) |
| change_amount | NUMERIC(18,0) |
| profit_amount | NUMERIC(18,8) |
| profit_display | nilai laporan yang dibulatkan saat ditampilkan |

Jangan gunakan `FLOAT`, `DOUBLE`, atau `REAL` untuk uang, HPP, pajak, diskon, dan laba.

### 8.4 Soft Delete untuk Data Historis

Data berikut tidak boleh dihapus permanen jika sudah memiliki histori:

```text
products
categories
suppliers
units
batches
purchases
sales
sales_returns
purchase_returns
stock_mutations
```

Gunakan field seperti:

```text
is_active
deleted_at
archived_at
```

Namun, untuk transaksi final dan mutasi stok, lebih aman menggunakan status atau arsip daripada delete. Menghapus transaksi final adalah cara cepat membuat laporan berubah menjadi dongeng.

---

## 9. Strategi Transaction dan Locking

### 9.1 Operasi yang Wajib Menggunakan Database Transaction

Operasi berikut wajib berjalan dalam satu database transaction:

| Operasi | Alasan |
|---|---|
| Membuat pembelian | Menambah batch dan mencatat mutasi stok masuk |
| Menyimpan penjualan | Mengurangi stok, split batch, menyimpan transaksi, mencatat mutasi stok |
| Membuat retur penjualan | Mengembalikan stok ke batch asal dan mengoreksi laporan |
| Membuat retur pembelian | Mengurangi stok batch dan mencatat mutasi stok keluar |
| Koreksi stok | Mengubah stok dan mencatat alasan koreksi |
| Menonaktifkan data sensitif | Menjaga histori dan konsistensi referensi |

### 9.2 Locking Batch Saat Penjualan

Saat penjualan disimpan, backend harus mengunci batch yang akan dipakai.

Tujuan locking:

1. Mencegah dua transaksi memakai stok batch yang sama secara bersamaan.
2. Mencegah stok batch menjadi negatif.
3. Menjamin hasil FEFO tetap konsisten saat transaksi berjalan.

Pola konseptual:

```sql
SELECT *
FROM batches
WHERE product_id = $1
  AND status = 'ACTIVE'
  AND current_stock_base_unit > 0
  AND expired_date >= CURRENT_DATE
ORDER BY expired_date ASC, created_at ASC
FOR UPDATE;
```

Catatan:

- Query final harus disesuaikan dengan struktur tabel SDD.
- Locking harus dilakukan di dalam database transaction.
- Jika stok tidak cukup setelah batch dikunci, transaksi harus gagal dan rollback.

### 9.3 Atomicity

Jika satu langkah gagal, seluruh transaksi harus rollback.

Contoh kegagalan:

```text
produk tidak aktif
satuan tidak valid
stok tidak cukup
diskon tidak valid
batch valid tidak tersedia
cash kurang dari total
query database gagal
```

Tidak boleh ada kondisi ketika transaksi gagal tetapi stok sudah berkurang. Itu bukan bug kecil; itu lubang akuntansi yang memakai kostum aplikasi.

---

## 10. Service Layer Utama

### 10.1 AuthService

Tanggung jawab:

- login;
- validasi password;
- membuat access token;
- membuat refresh token;
- logout;
- revoke refresh token;
- membaca user aktif;
- menolak user nonaktif.

### 10.2 UserService

Tanggung jawab:

- membuat user;
- mengubah user;
- menonaktifkan user;
- menetapkan role;
- memastikan user memiliki role valid.

### 10.3 ProductService

Tanggung jawab:

- membuat produk;
- mengubah produk;
- menonaktifkan produk;
- mencari produk;
- memastikan kode produk unik;
- memastikan barcode tidak duplikat pada produk aktif.

### 10.4 UnitConversionService

Tanggung jawab:

- membuat satuan dasar;
- membuat satuan jual;
- mengatur faktor konversi ke satuan dasar;
- mencegah faktor konversi nol atau negatif;
- mencegah penghapusan satuan yang sudah dipakai transaksi.

### 10.5 BatchService

Tanggung jawab:

- membuat batch;
- mengubah data batch;
- mengelola status batch;
- mengatur HPP batch;
- mengatur harga jual per satuan;
- menandai batch expired;
- mencegah batch historis dihapus permanen.

### 10.6 PurchaseService

Tanggung jawab:

- menyimpan pembelian supplier;
- menghitung HPP satuan dasar;
- membuat atau menambah batch sesuai aturan;
- menambah stok batch;
- mencatat mutasi stok masuk.

### 10.7 SaleService

Tanggung jawab:

- validasi keranjang;
- validasi produk dan satuan;
- menghitung ulang subtotal;
- memvalidasi diskon;
- memvalidasi metode pembayaran;
- memanggil FEFO service;
- memanggil split batch service;
- menyimpan transaksi;
- mengurangi stok batch;
- mencatat mutasi stok keluar;
- menghitung HPP dan laba detail.

### 10.8 FefoService

Tanggung jawab:

- mengambil batch valid berdasarkan expired date terdekat;
- mengabaikan batch expired;
- mengabaikan batch nonaktif;
- mengabaikan batch stok nol;
- memilih batch berikutnya jika stok batch pertama tidak cukup.

### 10.9 SaleBatchAllocationService

Tanggung jawab:

- memecah item transaksi menjadi detail batch;
- menyimpan qty per batch;
- menyimpan harga jual final;
- menyimpan HPP final;
- menyimpan diskon alokasi;
- menyimpan laba detail.

### 10.10 DiscountService

Tanggung jawab:

- memvalidasi diskon persen dan nominal;
- menghitung total diskon;
- mengalokasikan diskon ke detail batch secara proporsional;
- menangani selisih pembulatan secara deterministik.

### 10.11 ProfitService

Tanggung jawab:

- menghitung HPP detail;
- menghitung laba detail;
- menghitung koreksi laba retur;
- memastikan laporan laba berasal dari detail transaksi.

### 10.12 SalesReturnService

Tanggung jawab:

- mencari transaksi asal;
- memvalidasi item yang dapat diretur;
- memvalidasi qty retur;
- mengembalikan stok ke batch asal;
- mencatat mutasi stok masuk;
- menyimpan riwayat retur;
- mengoreksi laporan laba.

### 10.13 PurchaseReturnService

Tanggung jawab:

- memilih batch atau pembelian asal;
- memvalidasi qty retur;
- mengurangi stok batch;
- mencatat mutasi stok keluar;
- menyimpan riwayat retur pembelian.

### 10.14 StockMutationService

Tanggung jawab:

- mencatat setiap perubahan stok;
- menyimpan qty sebelum;
- menyimpan qty perubahan;
- menyimpan qty sesudah;
- menyimpan tipe mutasi;
- menyimpan referensi transaksi;
- menyimpan user pelaku;
- menyimpan alasan untuk retur dan koreksi.

### 10.15 ReportService

Tanggung jawab:

- laporan penjualan;
- laporan laba;
- filter tanggal;
- filter produk;
- filter kategori;
- filter kasir;
- filter metode pembayaran;
- menghitung koreksi retur;
- memastikan laporan tidak memakai harga produk terbaru.

### 10.16 ExportService

Tanggung jawab:

- ekspor laporan penjualan ke Excel;
- ekspor laporan laba ke Excel;
- ekspor laporan ke PDF jika fitur diaktifkan;
- memastikan isi export sama dengan filter laporan.

---

## 11. Alur Backend: Pembelian Supplier

### 11.1 Input Pembelian

```text
supplier_id
tanggal_pembelian
nomor_invoice opsional
items[]
  product_id
  batch_number
  expired_date
  purchase_unit_id
  qty_purchase
  purchase_price
  selling_prices[]
```

### 11.2 Proses Backend

```text
1. Validasi role Manager.
2. Validasi supplier aktif.
3. Validasi minimal satu item pembelian.
4. Validasi produk aktif.
5. Validasi satuan pembelian memiliki konversi valid.
6. Validasi qty > 0.
7. Validasi harga beli tidak negatif.
8. Hitung qty satuan dasar.
9. Hitung HPP satuan dasar.
10. Buat record purchase.
11. Buat record purchase item.
12. Buat batch baru atau tambahkan ke batch sesuai aturan.
13. Tambah stok batch.
14. Catat stock mutation PURCHASE_IN.
15. Commit transaction.
```

### 11.3 Formula HPP Pembelian

```text
hpp_satuan_dasar = harga_beli_satuan_pembelian / jumlah_satuan_dasar_dalam_satuan_pembelian
```

Contoh:

```text
1 box = 100 tablet
harga beli 1 box = Rp50.000
hpp satuan dasar = 50.000 / 100 = Rp500 per tablet
```

---

## 12. Alur Backend: Penjualan Kasir

### 12.1 Input Penjualan

```text
items[]
  product_id
  unit_id
  qty
  note opsional

discount_type
  NONE | PERCENT | NOMINAL

discount_value
payment_method
  CASH | TRANSFER | QRIS | DEBIT
cash_received opsional
customer_data opsional
note opsional
```

### 12.2 Proses Backend

```text
1. Validasi role Kasir atau Manager.
2. Validasi keranjang tidak kosong.
3. Validasi setiap produk aktif.
4. Validasi setiap satuan jual aktif.
5. Hitung qty satuan dasar untuk setiap item.
6. Hitung ulang subtotal berdasarkan harga batch/satuan yang valid.
7. Validasi diskon.
8. Hitung total transaksi.
9. Validasi metode pembayaran.
10. Jika cash, validasi cash_received >= total.
11. Mulai database transaction.
12. Ambil dan lock batch valid berdasarkan FEFO.
13. Validasi stok cukup setelah batch dikunci.
14. Lakukan split batch jika stok berasal dari lebih dari satu batch.
15. Alokasikan diskon ke setiap detail batch.
16. Hitung HPP detail.
17. Hitung laba detail.
18. Simpan sale.
19. Simpan sale item.
20. Simpan sale batch allocation.
21. Kurangi stok batch.
22. Catat stock mutation SALE_OUT.
23. Commit transaction.
24. Kembalikan nomor transaksi dan ringkasan transaksi final.
```

### 12.3 Output Penjualan

```text
sale_id
sale_number
sale_date
cashier
subtotal
discount_total
grand_total
payment_method
cash_received
change_amount
items
  product_name
  unit_name
  qty
  subtotal
  batch_allocations
    batch_number
    expired_date
    qty_base_unit
    selling_price
    hpp
    discount_allocation
    profit
```

Untuk role Kasir, response tidak boleh menampilkan HPP dan laba kecuali diperlukan secara internal dan tidak dikirim ke frontend kasir.

---

## 13. FEFO dan Split Batch

### 13.1 Aturan FEFO

Backend wajib memilih batch dengan urutan:

```text
1. product_id sesuai item
2. status ACTIVE
3. current_stock_base_unit > 0
4. expired_date >= current_date
5. order by expired_date ASC
6. jika expired_date sama, order by created_at ASC
```

### 13.2 Contoh Split Batch

Kebutuhan penjualan:

```text
Produk: Paracetamol
Qty jual: 15 tablet
```

Batch tersedia:

```text
Batch A: 10 tablet, expired 2026-07-01
Batch B: 30 tablet, expired 2026-09-01
```

Backend harus menyimpan:

```text
Sale Batch Allocation 1:
- Batch A
- Qty 10 tablet

Sale Batch Allocation 2:
- Batch B
- Qty 5 tablet
```

### 13.3 Larangan FEFO

Backend tidak boleh:

1. memilih batch expired;
2. memilih batch stok nol;
3. memilih batch nonaktif;
4. menyerahkan keputusan batch final kepada frontend;
5. menggabungkan detail batch sampai histori batch hilang;
6. mengurangi stok tanpa mencatat mutasi.

---

## 14. Diskon dan Laba

### 14.1 Diskon Transaksi

Diskon didukung dalam bentuk:

```text
PERCENT
NOMINAL
NONE
```

Validasi:

| Tipe Diskon | Validasi |
|---|---|
| PERCENT | nilai 0 sampai 100 |
| NOMINAL | nilai tidak boleh melebihi subtotal |
| NONE | nilai diskon dianggap 0 |

### 14.2 Alokasi Diskon

Formula:

```text
diskon_alokasi_detail = (subtotal_detail / subtotal_transaksi) * total_diskon
```

Jika ada selisih pembulatan, backend harus mengalokasikan selisih ke detail terakhir atau memakai strategi pembulatan deterministik lain yang konsisten.

### 14.3 HPP Detail

Formula:

```text
hpp_detail = qty_satuan_dasar * hpp_satuan_dasar
```

`hpp_satuan_dasar` disimpan dengan presisi tinggi. Backend tidak boleh membulatkan HPP internal hanya karena tampilan laporan memakai rupiah bulat.

### 14.4 Laba Detail

Formula:

```text
laba_detail = subtotal_detail - hpp_detail - diskon_alokasi_detail
```

`subtotal_detail` berasal dari snapshot harga jual final rupiah bulat yang ditetapkan Manager. `hpp_detail` berasal dari HPP internal presisi tinggi. Laba internal disimpan presisi tinggi; pembulatan hanya dilakukan saat display laporan.

### 14.5 Aturan Historis

Backend wajib menyimpan nilai berikut pada detail transaksi:

```text
harga_jual_final
hpp_final
diskon_alokasi
laba_detail
batch_id
qty_satuan_dasar
unit_id
conversion_factor
```

Tujuannya agar laporan lama tidak berubah saat harga batch atau produk diubah kemudian.

---

## 15. Retur Penjualan

### 15.1 Prinsip Retur Penjualan

Retur penjualan wajib mengacu pada transaksi asal dan detail batch asal. Retur tidak boleh menghapus transaksi lama.

### 15.2 Input Retur Penjualan

```text
sale_id
items[]
  sale_batch_allocation_id
  qty_return
reason
note opsional
```

### 15.3 Proses Backend

```text
1. Validasi role Kasir atau Manager.
2. Validasi transaksi asal ada.
3. Validasi sale batch allocation ada.
4. Hitung sisa qty yang masih dapat diretur.
5. Validasi qty_return > 0.
6. Validasi qty_return <= sisa qty retur.
7. Validasi alasan retur wajib diisi.
8. Mulai database transaction.
9. Simpan sales return.
10. Simpan sales return item.
11. Tambahkan stok ke batch asal.
12. Catat stock mutation SALES_RETURN_IN.
13. Hitung koreksi omzet, HPP, diskon, dan laba.
14. Commit transaction.
```

### 15.4 Output Retur Penjualan

```text
return_id
return_number
sale_number
returned_items
total_return_amount
profit_correction
created_by
created_at
```

Untuk Kasir, `profit_correction` tidak perlu dikirim ke frontend.

---

## 16. Retur Pembelian

### 16.1 Prinsip Retur Pembelian

Retur pembelian mengurangi stok batch terkait dan mencatat mutasi keluar.

### 16.2 Input Retur Pembelian

```text
purchase_id opsional
batch_id
qty_return
reason
note opsional
```

### 16.3 Proses Backend

```text
1. Validasi role Manager.
2. Validasi batch ada.
3. Validasi qty_return > 0.
4. Validasi qty_return <= stok batch tersedia.
5. Validasi alasan retur wajib diisi.
6. Mulai database transaction.
7. Simpan purchase return.
8. Simpan purchase return item.
9. Kurangi stok batch.
10. Catat stock mutation PURCHASE_RETURN_OUT.
11. Commit transaction.
```

---

## 17. Koreksi Stok

### 17.1 Prinsip Koreksi Stok

Koreksi stok hanya dapat dilakukan oleh Manager. Koreksi stok wajib memiliki alasan.

### 17.2 Input Koreksi Stok

```text
batch_id
new_qty_base_unit
reason
```

### 17.3 Proses Backend

```text
1. Validasi role Manager.
2. Validasi batch ada.
3. Validasi new_qty_base_unit >= 0.
4. Validasi alasan wajib diisi.
5. Ambil qty sebelum.
6. Hitung selisih qty.
7. Update stok batch.
8. Catat stock mutation:
   - STOCK_ADJUSTMENT_IN jika selisih positif
   - STOCK_ADJUSTMENT_OUT jika selisih negatif
9. Simpan stock adjustment record.
10. Commit transaction.
```

---

## 18. Mutasi Stok

### 18.1 Tipe Mutasi

```text
PURCHASE_IN
SALE_OUT
SALES_RETURN_IN
PURCHASE_RETURN_OUT
STOCK_ADJUSTMENT_IN
STOCK_ADJUSTMENT_OUT
```

### 18.2 Data Mutasi Minimal

```text
id
product_id
batch_id
mutation_type
qty_before
qty_change
qty_after
reference_type
reference_id
user_id
reason
created_at
```

### 18.3 Aturan Mutasi

1. Setiap perubahan stok wajib membuat mutasi.
2. Mutasi wajib memiliki referensi.
3. Mutasi wajib mencatat user pelaku.
4. Mutasi koreksi dan retur wajib memiliki alasan.
5. Mutasi tidak boleh dihapus permanen.
6. Qty before dan qty after harus sesuai dengan perubahan stok batch.

---

## 19. Auth dan Authorization

### 19.1 Role Minimum

```text
KASIR
MANAGER
```

Role `PEMILIK` boleh ditambahkan jika dibutuhkan, tetapi pada V1 dapat memakai akses Manager atau akses laporan saja.

### 19.2 Permission Matrix Backend

| Permission | Kasir | Manager |
|---|---:|---:|
| login | Ya | Ya |
| create sale | Ya | Ya |
| create sales return | Ya | Ya |
| view limited stock | Ya | Ya |
| manage products | Tidak | Ya |
| manage categories | Tidak | Ya |
| manage suppliers | Tidak | Ya |
| manage units | Tidak | Ya |
| manage batches | Tidak | Ya |
| create purchase | Tidak | Ya |
| create purchase return | Tidak | Ya |
| adjust stock | Tidak | Ya |
| view sales report | Tidak | Ya |
| view profit report | Tidak | Ya |
| export report | Tidak | Ya |
| manage users | Tidak | Ya |
| manage settings | Tidak | Ya |

### 19.3 Guard Backend

Backend harus memiliki:

```text
JwtAuthGuard
RolesGuard
PermissionGuard opsional
```

### 19.4 Larangan Akses Kasir

Kasir tidak boleh:

1. melihat HPP;
2. melihat laba;
3. melihat laporan laba;
4. mengubah harga jual;
5. mengubah HPP;
6. melakukan koreksi stok;
7. mengelola supplier;
8. mengelola pembelian;
9. mengelola user;
10. mengakses endpoint Manager melalui URL langsung.

Apoteker dapat mengakses PO, resep dasar, konseling, dan stok terbatas. Apoteker tidak boleh melihat HPP, laba, margin, atau harga beli supplier kecuali izin khusus ditetapkan eksplisit.

---

## 20. Rancangan API Backend

API menggunakan REST.

### 20.1 Auth API

```text
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me
```

### 20.2 User API

```text
GET    /api/users
POST   /api/users
GET    /api/users/:id
PATCH  /api/users/:id
PATCH  /api/users/:id/deactivate
```

### 20.3 Product API

```text
GET    /api/products
POST   /api/products
GET    /api/products/:id
PATCH  /api/products/:id
PATCH  /api/products/:id/deactivate
GET    /api/products/search
```

### 20.4 Category API

```text
GET    /api/categories
POST   /api/categories
PATCH  /api/categories/:id
PATCH  /api/categories/:id/deactivate
```

### 20.5 Supplier API

```text
GET    /api/suppliers
POST   /api/suppliers
PATCH  /api/suppliers/:id
PATCH  /api/suppliers/:id/deactivate
```

### 20.6 Unit Conversion API

```text
GET    /api/products/:productId/unit-conversions
POST   /api/products/:productId/unit-conversions
PATCH  /api/unit-conversions/:id
PATCH  /api/unit-conversions/:id/deactivate
```

### 20.7 Batch API

```text
GET    /api/batches
POST   /api/batches
GET    /api/batches/:id
PATCH  /api/batches/:id
PATCH  /api/batches/:id/deactivate
GET    /api/batches/expired-alert
```

### 20.8 Purchase API

```text
GET    /api/purchases
GET    /api/purchases/create-from-po/:poId
POST   /api/purchases
GET    /api/purchases/:id
```

### 20.9 Purchase Order API

```text
GET    /api/purchase-orders
POST   /api/purchase-orders
GET    /api/purchase-orders/:id
PATCH  /api/purchase-orders/:id
POST   /api/purchase-orders/:id/print-preview
POST   /api/purchase-orders/:id/convert-to-purchase
PATCH  /api/purchase-orders/:id/cancel
```

### 20.10 Prescription API

```text
GET    /api/prescriptions
POST   /api/prescriptions
GET    /api/prescriptions/:id
PATCH  /api/prescriptions/:id
POST   /api/prescriptions/:id/mark-ready-for-payment
POST   /api/prescriptions/:id/cancel
GET    /api/prescriptions/ready-for-payment
POST   /api/sales/from-prescription/:prescriptionId
```

### 20.11 Counseling API

```text
GET    /api/counseling-records
POST   /api/counseling-records
GET    /api/counseling-records/:id
PATCH  /api/counseling-records/:id
```

### 20.12 Sale API

```text
GET    /api/sales
POST   /api/sales
GET    /api/sales/:id
GET    /api/sales/:id/returnable-items
```

### 20.13 Sales Return API

```text
GET    /api/sales-returns
POST   /api/sales-returns
GET    /api/sales-returns/:id
```

### 20.14 Purchase Return API

```text
GET    /api/purchase-returns
POST   /api/purchase-returns
GET    /api/purchase-returns/:id
```

### 20.15 Stock API

```text
GET    /api/stock
GET    /api/stock/:productId
GET    /api/stock/mutations
POST   /api/stock/adjustments
```

### 20.16 Dashboard API

```text
GET    /api/dashboard/summary
GET    /api/dashboard/low-stock
GET    /api/dashboard/expired-batches
GET    /api/dashboard/recent-transactions
```

### 20.17 Report API

```text
GET    /api/reports/sales
GET    /api/reports/profit
GET    /api/reports/stock
GET    /api/reports/expired-batches
```

### 20.18 Export API

```text
GET    /api/exports/reports/sales.xlsx
GET    /api/exports/reports/profit.xlsx
GET    /api/exports/reports/sales.pdf
GET    /api/exports/reports/profit.pdf
```

### 20.19 Settings API

```text
GET    /api/settings
PATCH  /api/settings
```

---

## 21. Response dan Error Format

### 21.1 Response Sukses

```json
{
  "success": true,
  "message": "Transaksi berhasil disimpan",
  "data": {}
}
```

### 21.2 Response Error

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

### 21.3 Error Code Utama

```text
VALIDATION_ERROR
UNAUTHORIZED
ACCESS_DENIED
SESSION_EXPIRED
DATA_NOT_FOUND
DUPLICATE_DATA
PRODUCT_INACTIVE
UNIT_INVALID
BATCH_EXPIRED
VALID_BATCH_NOT_AVAILABLE
STOCK_NOT_ENOUGH
STOCK_NEGATIVE_NOT_ALLOWED
CART_EMPTY
DISCOUNT_EXCEEDS_SUBTOTAL
CASH_NOT_ENOUGH
RETURN_QTY_EXCEEDS_AVAILABLE
TRANSACTION_FAILED
EXPORT_FAILED
SERVER_ERROR
```

### 21.4 Prinsip Pesan Error

1. Pesan harus spesifik.
2. Pesan tidak boleh membocorkan detail teknis internal.
3. Pesan validasi sebaiknya menyebut field bermasalah.
4. Error stok harus menyebut produk yang bermasalah.
5. Error akses harus jelas.

---

## 22. Laporan Backend

### 22.1 Laporan Penjualan

Filter minimal:

```text
start_date
end_date
payment_method opsional
cashier_id opsional
product_id opsional
category_id opsional
```

Data minimal:

```text
sale_number
sale_date
cashier
payment_method
subtotal
discount_total
grand_total
return_status
```

### 22.2 Laporan Laba

Filter minimal:

```text
start_date
end_date
product_id opsional
category_id opsional
batch_id opsional
```

Data minimal:

```text
omzet
hpp
discount
profit_before_return
return_correction
profit_after_return
```

### 22.3 Prinsip Laporan Laba

Laporan laba wajib dihitung dari:

```text
sale_batch_allocations
sales_return_items
```

Laporan laba tidak boleh dihitung dari:

```text
harga produk terbaru
harga batch terbaru
HPP batch terbaru setelah transaksi
```

---

## 23. Export Backend

### 23.1 Format Export

```text
.xlsx
.pdf
```

### 23.2 Aturan Export

1. Export hanya untuk Manager atau Pemilik jika role Pemilik dibuat.
2. Export mengikuti filter laporan aktif.
3. Export laporan laba tidak boleh dapat diakses Kasir.
4. File export harus mencantumkan periode laporan.
5. File export harus mencantumkan tanggal export.
6. File export harus memakai hasil perhitungan yang sama dengan endpoint laporan.

---

## 24. Audit Log

### 24.1 Aktivitas yang Perlu Dicatat

```text
login gagal berulang
user dibuat/diubah/dinonaktifkan
produk dibuat/diubah/dinonaktifkan
batch dibuat/diubah/dinonaktifkan
harga batch diubah
pembelian dibuat
penjualan dibuat
retur penjualan dibuat
retur pembelian dibuat
koreksi stok dibuat
laporan laba diakses
export laporan dibuat
```

### 24.2 Data Audit Minimal

```text
id
user_id
action
entity_type
entity_id
old_value opsional
new_value opsional
ip_address opsional
user_agent opsional
created_at
```

---

## 25. Security Backend

### 25.1 Password

Aturan password:

1. Password tidak boleh disimpan plaintext.
2. Gunakan hashing yang aman seperti bcrypt atau argon2.
3. Password hash tidak boleh dikirim ke frontend.
4. Password harus divalidasi saat login.

### 25.2 Token

Aturan token:

1. Access token berumur pendek.
2. Refresh token dapat dicabut saat logout.
3. Refresh token sebaiknya disimpan dalam bentuk hash di database.
4. Token user nonaktif harus ditolak.

### 25.3 Authorization

Backend wajib memeriksa role pada setiap endpoint sensitif.

Endpoint sensitif:

```text
purchases
purchase-returns
stock-adjustments
reports/profit
exports
users
settings
batches price update
```

### 25.4 Data Sensitif

Data berikut tidak boleh dikirim ke Kasir:

```text
hpp_base_unit
hpp_detail
harga_modal
purchase_price
profit_detail
profit_report
batch purchase cost
margin
supplier purchase price jika tidak diperlukan
```

---

## 26. Validasi Backend

### 26.1 Validasi Global

```text
field wajib tidak boleh kosong
qty harus lebih besar dari 0
nilai uang tidak boleh negatif
diskon tidak boleh membuat total negatif
tanggal wajib valid
expired date wajib valid
produk nonaktif tidak boleh digunakan transaksi baru
supplier nonaktif tidak boleh digunakan pembelian baru
batch expired tidak boleh digunakan transaksi normal
stok tidak boleh negatif
role tidak berhak harus ditolak
retur wajib memiliki referensi asal
koreksi stok wajib memiliki alasan
transaksi final wajib dihitung server-side
histori lama tidak boleh berubah akibat harga baru
PO tidak boleh mengubah stok
resep tidak boleh mengurangi stok sebelum checkout
checkout wajib menolak satuan jual yang tidak aktif
diskon pembelian tidak boleh negatif atau melebihi subtotal item
tax_mode pembelian wajib NON_PPN, PPN_INCLUDED, atau PPN_EXCLUDED
total faktur supplier wajib divalidasi terhadap total sistem
```

### 26.2 Validasi yang Tidak Boleh Hanya di Frontend

Backend tetap wajib memvalidasi:

1. stok cukup;
2. produk aktif;
3. satuan aktif;
4. batch valid;
5. diskon valid;
6. cash cukup;
7. role valid;
8. qty retur valid;
9. stok koreksi valid;
10. HPP dan harga tidak negatif.
11. satuan jual aktif;
12. status PO;
13. status resep;
14. validasi faktur supplier;
15. batch dan expired date barang masuk.

---

## 27. Testing Backend

### 27.1 Unit Test

Unit test wajib atau sangat disarankan untuk:

```text
FefoService
DiscountService
ProfitService
UnitConversionService
SaleCalculationService
SalesReturnService
PermissionGuard
```

### 27.2 Integration Test

Integration test wajib atau sangat disarankan untuk:

```text
membuat pembelian supplier
membuat PO tanpa mengubah stok
membuat pembelian dari PO dan memperbarui status PO
menolak pembelian dengan faktur tidak valid tanpa catatan selisih
menyimpan penjualan single batch
menyimpan penjualan multi-batch
menolak stok tidak cukup
menolak batch expired
menghitung diskon alokasi
menghitung laba detail
membuat retur penjualan sebagian
membuat retur pembelian
menarik resep siap bayar ke kasir
memastikan resep tidak mengurangi stok sebelum checkout
menyimpan konseling tanpa tagihan dan tanpa mutasi stok
melakukan koreksi stok
menghasilkan laporan laba
```

### 27.3 E2E API Test

E2E test minimal:

```text
login manager
-> buat produk
-> buat satuan konversi
-> buat supplier
-> buat pembelian
-> login kasir
-> buat penjualan
-> cek stok berkurang
-> buat retur penjualan
-> cek stok kembali
-> login manager
-> cek laporan laba
```

### 27.4 Test Case Kritis

| ID | Test Case |
|---|---|
| BE-TC-001 | Penjualan gagal tidak mengurangi stok |
| BE-TC-002 | Dua transaksi bersamaan tidak membuat stok negatif |
| BE-TC-003 | FEFO memilih batch expired terdekat yang masih valid |
| BE-TC-004 | Batch expired tidak dipilih |
| BE-TC-005 | Split batch menyimpan detail batch yang benar |
| BE-TC-006 | HPP detail disalin dari batch saat transaksi |
| BE-TC-007 | Perubahan harga setelah transaksi tidak mengubah laporan lama |
| BE-TC-008 | Diskon alokasi sama dengan total diskon transaksi |
| BE-TC-009 | Retur sebagian tidak boleh melebihi sisa qty |
| BE-TC-010 | Retur mengembalikan stok ke batch asal |
| BE-TC-011 | Kasir tidak bisa akses laporan laba |
| BE-TC-012 | Kasir tidak bisa melakukan koreksi stok |
| BE-TC-013 | Mutasi stok tercatat untuk semua perubahan stok |
| BE-TC-014 | Export laporan mengikuti filter |
| BE-TC-015 | User nonaktif tidak dapat login |
| BE-TC-016 | PO tidak menambah atau mengurangi stok |
| BE-TC-017 | Pembelian dari PO menambah stok batch dan memperbarui status PO |
| BE-TC-018 | Presisi harga modal, diskon pembelian, PPN, HPP, dan laba tersimpan dengan NUMERIC/DECIMAL |
| BE-TC-019 | Resep tidak mengurangi stok sebelum checkout |
| BE-TC-020 | Checkout menolak satuan jual tidak aktif |
| BE-TC-021 | Konseling tidak membuat tagihan dan tidak mengubah stok |

---

## 28. Environment dan Konfigurasi

### 28.1 Environment Variable

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pos_apotek_risyah
JWT_ACCESS_SECRET=change_me
JWT_REFRESH_SECRET=change_me
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
APP_TIMEZONE=Asia/Jakarta
EXPORT_DIR=storage/exports
```

### 28.2 Aturan Konfigurasi

1. Secret tidak boleh ditulis langsung di kode.
2. `.env` tidak boleh masuk repository publik.
3. Gunakan validasi environment saat aplikasi start.
4. Timezone aplikasi harus konsisten.
5. Waktu transaksi harus disimpan secara aman di database.

---

## 29. Deployment Backend

### 29.1 Rekomendasi Deployment V1

```text
Docker
PostgreSQL managed atau PostgreSQL di VPS
Nginx reverse proxy
HTTPS
PM2 hanya jika tidak memakai container orchestration
Backup database harian
```

### 29.2 Backup Database

Backup wajib dilakukan karena sistem menyimpan transaksi dan stok historis.

Rekomendasi:

```text
backup harian otomatis
backup sebelum migration besar
backup disimpan terpisah dari server utama
uji restore backup secara berkala
```

Backup yang tidak pernah diuji restore sebenarnya bukan backup. Itu cuma ritual penenang batin untuk administrator yang terlalu optimistis.

---

## 30. Prioritas Implementasi Backend V1

### 30.1 Prioritas Tinggi

| Urutan | Fitur Backend |
|---:|---|
| 1 | Setup NestJS, PostgreSQL, Prisma, konfigurasi environment |
| 2 | Auth, user, role, RBAC |
| 3 | Master kategori, produk, supplier |
| 4 | Satuan dasar dan konversi satuan |
| 5 | Batch, HPP, harga jual batch |
| 6 | Pembelian supplier dan stok masuk |
| 7 | Mutasi stok |
| 8 | Transaksi penjualan dengan FEFO |
| 9 | Split batch dan pengurangan stok |
| 10 | Diskon alokasi dan laba detail |
| 11 | Retur penjualan |
| 12 | Laporan penjualan dan laba |
| 13 | Dashboard summary |
| 14 | Error handling global |
| 15 | Test transaksi stok kritis |

### 30.2 Prioritas Sedang

| Urutan | Fitur Backend |
|---:|---|
| 1 | Retur pembelian |
| 2 | Koreksi stok |
| 3 | Export Excel |
| 4 | Export PDF |
| 5 | Audit log |
| 6 | Rate limiting login |
| 7 | Advanced filter laporan |

### 30.3 Prioritas Rendah

| Fitur | Alasan |
|---|---|
| Payment gateway otomatis | Out of scope V1 |
| BPJS | Out of scope V1 |
| Multi-cabang | Out of scope V1 |
| Loyalty program | Out of scope V1 |
| Akuntansi lengkap | Out of scope V1 |
| Shift kasir kompleks | Tidak wajib pada V1 |

---

## 31. Guardrail Implementasi Backend

AI coding wajib mematuhi guardrail berikut:

1. Jangan menyimpan stok hanya pada tabel produk.
2. Jangan mengurangi stok tanpa batch.
3. Jangan mengurangi stok tanpa database transaction.
4. Jangan mengizinkan stok batch negatif.
5. Jangan memilih batch expired untuk transaksi normal.
6. Jangan menjalankan FEFO di frontend sebagai keputusan final.
7. Jangan menyimpan transaksi tanpa detail batch.
8. Jangan menghitung laba dari harga terbaru produk.
9. Jangan mengubah laporan lama saat harga batch berubah.
10. Jangan menyimpan HPP hanya pada batch tanpa menyalinnya ke detail transaksi.
11. Jangan mengabaikan diskon alokasi.
12. Jangan menghapus permanen transaksi final.
13. Jangan menghapus permanen batch yang sudah punya histori.
14. Jangan membuat retur tanpa transaksi atau pembelian asal.
15. Jangan mengizinkan retur melebihi qty yang belum diretur.
16. Jangan memberi akses HPP dan laba kepada Kasir.
17. Jangan memberi akses laporan laba kepada Kasir.
18. Jangan memberi akses koreksi stok kepada Kasir.
19. Jangan menampilkan error teknis mentah kepada pengguna akhir.
20. Jangan menambahkan fitur out of scope V1.
21. Jangan mencampur logika bisnis utama langsung di controller.
22. Jangan membuat query laporan dari harga terbaru.
23. Jangan mengabaikan audit mutasi stok.
24. Jangan melakukan migration destruktif tanpa backup.
25. Jangan menghitung harga jual pelanggan otomatis dari harga modal.
26. Jangan membulatkan harga modal, HPP, atau laba internal sebelum disimpan.
27. Jangan menamai requirement ini sebagai harga jual fleksibel; gunakan Presisi Harga Modal dan HPP.
28. Jangan mengubah istilah inti tanpa memperbarui dokumen terkait.
29. Jangan menjadikan PO sebagai penambah atau pengurang stok.
30. Jangan mengurangi stok saat resep dibuat atau ditandai siap bayar.
31. Jangan mengizinkan checkout dengan satuan jual tidak aktif.
32. Jangan memakai FLOAT, DOUBLE, atau REAL untuk uang, HPP, pajak, diskon, atau laba.
33. Jangan membuat PPN pembelian menjadi e-faktur atau modul perpajakan lengkap.
34. Jangan membuat clinical decision support otomatis.
35. Jangan memasukkan piutang sebagai fitur inti V1 tanpa keputusan eksplisit.

---

## 32. Prompt Eksekusi untuk Codex / AI Coding

Gunakan prompt berikut saat ingin memulai implementasi backend:

```text
Baca dan pahami dokumen berikut secara berurutan:
1. 01_PRD_POS_APOTEK.md
2. 02_SRS_POS_APOTEK.md
3. 03_SDD_SYSTEM_DESIGN_POS_APOTEK.md jika tersedia
4. 04_UI_UX_FLOW_POS_APOTEK.md jika tersedia
5. 05_TASK_BREAKDOWN_POS_APOTEK.md jika tersedia
6. 06_FRONTEND_ONLY_POS_APOTEK.md
7. 07_BACKEND_ONLY_POS_APOTEK.md

Tugas kamu adalah membangun backend POS Apotek menggunakan NestJS, TypeScript, PostgreSQL, Prisma, JWT Auth, dan Role-Based Access Control.

Ikuti seluruh guardrail berikut:
- Backend adalah sumber kebenaran untuk stok, batch, FEFO, HPP, harga final transaksi, split batch, diskon alokasi, laba, retur, dan mutasi stok.
- Semua proses penjualan, pembelian, retur, dan koreksi stok harus memakai database transaction.
- Stok wajib disimpan berdasarkan batch dalam satuan dasar.
- Penjualan wajib menerapkan FEFO server-side.
- Jika satu item penjualan memakai lebih dari satu batch, backend wajib membuat split batch allocation.
- Detail transaksi wajib menyimpan harga jual final, HPP final, diskon alokasi, dan laba.
- Retur penjualan wajib mengacu ke transaksi dan batch asal.
- Kasir tidak boleh mengakses HPP, laba, laporan laba, pengaturan harga, pembelian, dan koreksi stok.
- PO tidak boleh menambah stok; stok masuk hanya lewat pembelian final.
- Resep tidak boleh mengurangi stok sebelum checkout kasir berhasil.
- Checkout wajib menolak satuan jual tidak aktif.
- Jangan menambahkan fitur out of scope V1 seperti BPJS, payment gateway otomatis, multi-cabang, loyalty program, atau akuntansi lengkap.

Mulai dari setup project backend, konfigurasi environment, Prisma, database module, auth module, user/role module, RBAC guard, dan struktur modul. Setelah itu lanjutkan ke master data produk, satuan, supplier, batch, pembelian, mutasi stok, lalu transaksi penjualan FEFO sebagai prioritas utama.
```

---

## 33. Kesimpulan

Backend POS Apotek harus dibangun sebagai backend transaksional yang menjaga konsistensi stok, batch, HPP, diskon, retur, dan laporan laba. Stack yang paling sesuai adalah **NestJS + TypeScript + PostgreSQL + Prisma**, dengan raw SQL atau query khusus untuk operasi stok kritis yang membutuhkan locking.

Keputusan backend paling penting adalah menjadikan server sebagai sumber kebenaran. Frontend boleh menampilkan estimasi, tetapi backend wajib menghitung final transaksi. Penjualan harus atomic, stok harus berbasis batch, FEFO harus server-side, HPP dan harga jual final harus disimpan pada detail transaksi, dan retur harus mengacu pada detail batch asal.

Backend yang baik bukan backend yang sekadar punya banyak endpoint. Backend yang baik adalah backend yang tetap benar ketika transaksi ramai, stok menipis, batch hampir expired, kasir terburu-buru, dan laporan laba diminta pemilik. Dengan kata lain, backend harus tetap waras ketika manusia mulai menggunakan sistemnya secara nyata.

---

## 34. Definition of Done Backend Analysis

Dokumen ini dianggap selesai jika:

- stack backend sudah ditentukan;
- arsitektur backend sudah dijelaskan;
- modul backend sudah didefinisikan;
- struktur folder backend sudah tersedia;
- rancangan database konseptual sudah tersedia;
- service layer utama sudah dijelaskan;
- strategi transaction dan locking sudah dijelaskan;
- alur pembelian, penjualan, retur, dan koreksi stok sudah dijelaskan;
- FEFO dan split batch sudah dijelaskan;
- diskon, HPP, dan laba sudah dijelaskan;
- auth dan authorization sudah dijelaskan;
- API endpoint utama sudah dirancang;
- error handling sudah dirancang;
- security, audit log, testing, deployment, dan backup sudah dijelaskan;
- guardrail implementasi backend sudah tersedia;
- prompt eksekusi AI coding sudah tersedia;
- isi dokumen selaras dengan PRD dan SRS.
