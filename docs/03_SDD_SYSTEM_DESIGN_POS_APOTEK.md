---
document_name: "03_SDD_SYSTEM_DESIGN_POS_APOTEK_REVISI_SINKRON"
document_type: "Software Design Document / System Design"
project_name: "POS Apotek"
version: "1.2.0"
status: "Draft Revisi - Synchronized with PRD, SRS, Frontend, Backend, and UI/UX Flow"
prepared_for: "AI Vibe Coding / Codex GPT"
prepared_by: "Suryadi Umar"
last_updated: "2026-06-02"
source_documents:
  - "01_PRD_POS_APOTEK.md"
  - "02_SRS_POS_APOTEK.md"
  - "03_SDD_SYSTEM_DESIGN_POS_APOTEK.md"
  - "04_UI_UX_FLOW_POS_APOTEK.md"
  - "06_FRONTEND_POS_APOTEK.md"
  - "07_BACKEND_POS_APOTEK.md"
related_documents:
  - "05_TASK_BREAKDOWN_POS_APOTEK.md"
revision_focus:
  - "sinkronisasi route frontend dengan UI/UX Flow dan Frontend Specification"
  - "penegasan pemisahan route frontend dan API backend"
  - "sinkronisasi timezone Asia/Makassar untuk tampilan dan UTC untuk database"
  - "penambahan aturan idempotency dari sisi frontend dan backend"
  - "penambahan alur teknis manajemen user"
  - "penambahan mapping error backend ke UI"
  - "penegasan role-based UI dan backend authorization"
---

# SDD / System Design - POS Apotek

## Versi Revisi Sinkron 1.2.0

## 0. Status Pembaruan Dokumen

Dokumen ini merupakan versi revisi sinkron dari `03_SDD_SYSTEM_DESIGN_POS_APOTEK.md`. Revisi ini menyelaraskan desain sistem dengan dokumen berikut:

1. `01_PRD_POS_APOTEK.md`
2. `02_SRS_POS_APOTEK.md`
3. `04_UI_UX_FLOW_POS_APOTEK.md`
4. `06_FRONTEND_POS_APOTEK.md`
5. `07_BACKEND_POS_APOTEK.md`

Pembaruan utama pada versi 1.2.0 meliputi:

- penetapan stack final frontend dan backend;
- penyelarasan arsitektur modular monolith;
- penyelarasan struktur folder frontend dan backend;
- penyelarasan naming convention database, API, dan frontend;
- penyelarasan timezone operasional sistem;
- penyelarasan role dan permission;
- penambahan mekanisme idempotency untuk mencegah transaksi ganda;
- penambahan tabel `refresh_tokens`, `audit_logs`, dan `idempotency_keys`;
- perbaikan constraint database untuk soft delete;
- penegasan API contract antara frontend dan backend;
- penegasan bahwa frontend hanya menghitung estimasi, sedangkan backend menghitung final;
- penegasan bahwa seluruh transaksi stok harus atomic dan berbasis batch;
- penyelarasan route frontend dengan dokumen UI/UX Flow dan Frontend Specification;
- penambahan mapping route frontend ke endpoint API backend;
- penambahan aturan idempotency dari sisi UI untuk mencegah transaksi ganda akibat double click, retry jaringan, atau request timeout;
- penambahan detail teknis manajemen user sebagai fitur `Should Have` untuk Manager;
- penambahan mapping error code backend ke tampilan UI;
- penegasan bahwa jam realtime frontend hanya informasi visual, sedangkan waktu final transaksi selalu berasal dari backend.

Dokumen ini menjadi rujukan teknis pusat. Dokumen frontend dan backend tetap dipertahankan sebagai dokumen turunan yang lebih spesifik. Dengan kata lain, SDD ini adalah peta besar, bukan sekadar tumpukan tabel yang berharap terlihat seperti arsitektur.

---

## 1. Instruksi Pembacaan untuk AI Coding

Dokumen ini adalah **Software Design Document (SDD)** atau **System Design** untuk aplikasi **POS Apotek**.

Dokumen ini menjelaskan rancangan teknis sistem secara menyeluruh, meliputi:

- arsitektur aplikasi;
- stack final frontend dan backend;
- pembagian modul;
- struktur database;
- relasi data;
- service layer;
- desain API;
- autentikasi dan otorisasi;
- strategi transaksi database;
- strategi FEFO;
- strategi split batch;
- strategi diskon;
- strategi retur;
- strategi laporan;
- keamanan;
- deployment;
- testing;
- guardrail implementasi.

Urutan pembacaan dokumen untuk AI coding:

```text
01_PRD_POS_APOTEK.md
02_SRS_POS_APOTEK.md
03_SDD_SYSTEM_DESIGN_POS_APOTEK_REVISI_SINKRON.md
06_FRONTEND_POS_APOTEK.md
07_BACKEND_POS_APOTEK.md
04_UI_UX_FLOW_POS_APOTEK.md
05_TASK_BREAKDOWN_POS_APOTEK.md
```

Jika terjadi konflik antar dokumen, urutan prioritas adalah:

1. PRD dan SRS untuk aturan bisnis;
2. SDD ini untuk desain sistem terpadu;
3. Backend document untuk implementasi backend rinci;
4. Frontend document untuk implementasi frontend rinci;
5. UI/UX Flow dan Task Breakdown untuk alur dan eksekusi pekerjaan.

AI coding wajib mengikuti aturan berikut:

1. Backend adalah sumber kebenaran untuk stok, batch, FEFO, harga final, HPP, diskon alokasi, laba, retur, dan mutasi stok.
2. Frontend hanya boleh menghitung estimasi tampilan sementara.
3. Semua operasi yang mengubah stok harus berjalan dalam database transaction.
4. Stok tidak boleh negatif dalam kondisi apa pun.
5. Data historis tidak boleh berubah akibat perubahan master data baru.
6. Transaksi final, retur, batch, pembelian, dan mutasi stok tidak boleh dihapus permanen.
7. Stok wajib disimpan pada level batch dalam satuan dasar.
8. FEFO final wajib dilakukan di backend.
9. Split batch wajib disimpan pada detail transaksi.
10. Laporan laba wajib menggunakan detail transaksi historis, bukan harga terbaru.
11. Role kasir tidak boleh menerima data HPP, laba, margin, pembelian, koreksi stok, atau laporan laba.
12. Jangan menambahkan fitur di luar scope V1 seperti BPJS, payment gateway otomatis, multi-cabang, loyalty program, dan akuntansi lengkap.

---

## 2. Tujuan System Design

Tujuan dokumen ini adalah menerjemahkan kebutuhan produk dan sistem menjadi rancangan teknis yang dapat langsung digunakan oleh AI coding atau developer.

SDD ini digunakan sebagai dasar untuk:

- membangun backend;
- membangun frontend;
- membuat database;
- membuat API;
- mengatur role dan permission;
- menjaga konsistensi stok;
- menjaga konsistensi laporan;
- mengatur integrasi frontend dan backend;
- menyusun task breakdown;
- menyusun strategi testing;
- menyiapkan deployment.

---

## 3. Ruang Lingkup Teknis

### 3.1 In Scope V1

| ID | Area Teknis | Status |
|---|---|---|
| SDD-SCOPE-001 | Arsitektur web POS Apotek | Wajib |
| SDD-SCOPE-002 | Frontend React + Vite + TypeScript | Wajib |
| SDD-SCOPE-003 | Backend NestJS + TypeScript | Wajib |
| SDD-SCOPE-004 | PostgreSQL + Prisma ORM | Wajib |
| SDD-SCOPE-005 | Auth JWT + Refresh Token | Wajib |
| SDD-SCOPE-006 | Role-based access control | Wajib |
| SDD-SCOPE-007 | Master produk, kategori, supplier, satuan | Wajib |
| SDD-SCOPE-008 | Batch, expired date, HPP, dan harga jual batch | Wajib |
| SDD-SCOPE-009 | Pembelian supplier | Wajib |
| SDD-SCOPE-010 | Transaksi kasir | Wajib |
| SDD-SCOPE-011 | FEFO server-side | Wajib |
| SDD-SCOPE-012 | Split transaksi multi-batch | Wajib |
| SDD-SCOPE-013 | Diskon dan alokasi diskon | Wajib |
| SDD-SCOPE-014 | Retur penjualan | Wajib |
| SDD-SCOPE-015 | Retur pembelian | Disarankan |
| SDD-SCOPE-016 | Mutasi stok | Wajib |
| SDD-SCOPE-017 | Koreksi stok oleh Manager | Wajib |
| SDD-SCOPE-018 | Dashboard Manager | Wajib |
| SDD-SCOPE-019 | Laporan penjualan | Wajib |
| SDD-SCOPE-020 | Laporan laba | Wajib untuk Manager |
| SDD-SCOPE-021 | Export laporan Excel | Disarankan |
| SDD-SCOPE-022 | Export laporan PDF | Opsional V1 |
| SDD-SCOPE-023 | Audit log aktivitas penting | Disarankan kuat |
| SDD-SCOPE-024 | Testing unit, integration, dan E2E | Wajib |
| SDD-SCOPE-025 | Deployment Docker + PostgreSQL | Wajib |

### 3.2 Out of Scope V1

| ID | Area | Status |
|---|---|---|
| SDD-OOS-001 | Payment gateway otomatis | Tidak dibuat |
| SDD-OOS-002 | Integrasi BPJS | Tidak dibuat |
| SDD-OOS-003 | Multi-cabang | Tidak dibuat |
| SDD-OOS-004 | Loyalty program | Tidak dibuat |
| SDD-OOS-005 | Akuntansi biaya operasional penuh | Tidak dibuat |
| SDD-OOS-006 | Sinkronisasi offline kompleks | Tidak dibuat |
| SDD-OOS-007 | Data warehouse atau BI terpisah | Tidak dibuat |
| SDD-OOS-008 | PWA offline penuh | Tidak dibuat |
| SDD-OOS-009 | Integrasi printer thermal khusus | Tidak wajib |
| SDD-OOS-010 | Integrasi hardware barcode khusus | Tidak wajib |

---

## 4. Stack Final Sistem

### 4.1 Stack Frontend Final

| Layer | Teknologi | Status |
|---|---|---|
| UI Library | React | Final |
| Build Tool | Vite | Final |
| Bahasa | TypeScript | Final |
| Styling | Tailwind CSS | Final |
| UI Component | shadcn/ui | Final |
| Server State | TanStack Query | Final |
| Local State | Zustand | Final |
| Form Handling | React Hook Form | Final |
| Schema Validation | Zod | Final |
| Chart | Recharts | Final |
| HTTP Client | Axios atau Fetch Wrapper | Final |

Frontend bertugas menampilkan UI, mengelola interaksi pengguna, validasi awal, cache data API, dan state lokal seperti keranjang kasir. Frontend tidak boleh mengambil keputusan final terkait stok, batch, FEFO, HPP, laba, diskon alokasi, atau mutasi stok.

### 4.2 Stack Backend Final

| Layer | Teknologi | Status |
|---|---|---|
| Backend Framework | NestJS | Final |
| Bahasa | TypeScript | Final |
| Database | PostgreSQL | Final |
| ORM | Prisma | Final |
| Query Kritis | Raw SQL dalam database transaction | Final |
| Authentication | JWT + Refresh Token | Final |
| Authorization | Role-Based Access Control | Final |
| Validation | DTO + Zod atau class-validator | Final |
| Testing | Jest/Vitest + Supertest | Final |
| Deployment | Docker + VPS/Cloud | Final |

Backend adalah pusat logika bisnis. Seluruh transaksi penjualan, pembelian, retur, koreksi stok, FEFO, split batch, HPP, laba, dan laporan final harus dihitung oleh backend.

### 4.3 Stack Database Final

| Komponen | Keputusan |
|---|---|
| Database utama | PostgreSQL |
| Primary key | UUID |
| Money | `NUMERIC/DECIMAL` sesuai jenis nilai: harga modal `18,6`, HPP/laba internal `18,8`, harga jual pelanggan `18,0` |
| Quantity | `NUMERIC(14,3)` |
| Timestamp storage | UTC |
| Timezone tampilan | Asia/Makassar |
| Soft delete | `deleted_at` untuk master data historis |
| Constraint | Foreign key, check constraint, unique constraint, partial unique index |
| Locking stok | Row-level lock dengan `SELECT ... FOR UPDATE` |

---

## 5. Prinsip Arsitektur

| ID | Prinsip | Penjelasan |
|---|---|---|
| ARCH-PRIN-001 | Backend sebagai sumber kebenaran | Semua kalkulasi penting dilakukan di backend |
| ARCH-PRIN-002 | Atomic transaction | Pembelian, penjualan, retur, dan koreksi stok harus atomic |
| ARCH-PRIN-003 | Auditability | Semua perubahan stok memiliki catatan mutasi |
| ARCH-PRIN-004 | Historical immutability | Transaksi lama tidak berubah saat master data berubah |
| ARCH-PRIN-005 | Modular monolith | Sistem dipisah menjadi modul, tetapi tetap satu aplikasi backend |
| ARCH-PRIN-006 | Relational consistency | Relasi data memakai foreign key dan constraint |
| ARCH-PRIN-007 | Role-based access | Hak akses ditentukan berdasarkan role |
| ARCH-PRIN-008 | FEFO server-side | Frontend tidak boleh menentukan batch final |
| ARCH-PRIN-009 | No silent failure | Error harus jelas dan dapat ditelusuri |
| ARCH-PRIN-010 | Minimal V1 | Jangan membangun fitur di luar scope |
| ARCH-PRIN-011 | Frontend estimation only | Estimasi UI tidak boleh dianggap data final |
| ARCH-PRIN-012 | Naming consistency | Database, API, dan frontend harus memakai konvensi jelas |

---

## 6. Keputusan Desain Waktu

| Area | Keputusan |
|---|---|
| Penyimpanan timestamp | UTC |
| Tampilan waktu pengguna | Asia/Makassar |
| Transaksi final | Ditentukan backend |
| Jam realtime frontend | Hanya tampilan |
| Filter laporan harian | Berdasarkan Asia/Makassar |
| Export laporan | Menggunakan timezone Asia/Makassar pada tampilan |

Aturan penting:

1. Backend menentukan `saleTime`, `purchaseDate`, `returnTime`, dan `createdAt` final.
2. Frontend boleh menampilkan jam realtime lokal, tetapi tidak boleh menjadi sumber waktu transaksi final.
3. Database menyimpan timestamp dalam UTC.
4. Laporan harian harus menghitung batas hari berdasarkan `Asia/Makassar`, bukan timezone server.
5. Environment backend wajib memakai:

```env
APP_TIMEZONE=Asia/Makassar
```

Kesalahan timezone biasanya terlihat kecil sampai laporan harian menunjukkan transaksi kemarin masuk hari ini. Begitulah cara sistem membuat kasir dan pemilik saling curiga tanpa alasan yang layak.

---

## 7. Naming Convention Sistem

### 7.1 Konvensi Database

Database memakai `snake_case`.

Contoh:

```text
product_id
product_unit_id
sale_time
current_stock_base
created_at
updated_at
```

### 7.2 Konvensi API JSON

API JSON memakai `camelCase` agar selaras dengan frontend TypeScript.

Contoh:

```json
{
  "productId": "uuid",
  "productUnitId": "uuid",
  "saleTime": "2026-06-02T05:00:00.000Z",
  "currentStockBase": 120
}
```

### 7.3 Konvensi Prisma

Prisma boleh memakai `camelCase` dengan mapping ke database `snake_case`.

Contoh:

```prisma
model ProductBatch {
  id               String   @id @default(uuid())
  productId        String   @map("product_id")
  batchNumber      String   @map("batch_number")
  currentStockBase Decimal  @map("current_stock_base")
  expiredDate      DateTime @map("expired_date")

  @@map("product_batches")
}
```

### 7.4 Konvensi Route

| Area | Konvensi |
|---|---|
| API backend | Bahasa Inggris teknis, contoh `/api/sales` |
| Route frontend | Bahasa Indonesia atau istilah UI, contoh `/riwayat-transaksi` |
| Nama komponen frontend | Bahasa Inggris teknis, contoh `CashierPage` |
| Label UI | Bahasa Indonesia |

### 7.5 Mapping Route Frontend Final

Route frontend harus mengikuti dokumen `06_FRONTEND_POS_APOTEK.md` dan diselaraskan dengan UI/UX Flow. Route frontend tidak sama dengan endpoint API backend. Frontend memakai route UI yang mudah dipahami pengguna, sedangkan backend tetap memakai endpoint REST teknis.

| Halaman UI | Route Frontend Final | Role Akses | Endpoint API Utama |
|---|---|---|---|
| Login | `/login` | Publik | `POST /api/auth/login` |
| Dashboard | `/dashboard` | Manager, Pemilik, Kasir terbatas opsional | `/api/dashboard/*` |
| Kasir | `/kasir` | Kasir, Manager | `POST /api/sales`, `GET /api/products/search` |
| Riwayat Transaksi | `/riwayat-transaksi` | Kasir terbatas, Manager penuh | `GET /api/sales` |
| Retur Penjualan | `/retur-penjualan` | Kasir, Manager | `POST /api/sales-returns` |
| Produk | `/produk` | Manager, Kasir lihat terbatas opsional | `/api/products` |
| Kategori | `/kategori` | Manager | `/api/categories` |
| Supplier | `/supplier` | Manager | `/api/suppliers` |
| Satuan | `/satuan` | Manager | `/api/units`, `/api/products/:productId/units` |
| Batch | `/batch` | Manager, Kasir terbatas opsional | `/api/batches` |
| Pembelian | `/pembelian` | Manager | `/api/purchases` |
| Stok | `/stok` | Manager, Kasir terbatas | `/api/stock` |
| Mutasi Stok | `/mutasi-stok` | Manager | `/api/stock/mutations` |
| Koreksi Stok | `/koreksi-stok` | Manager | `POST /api/stock/adjustments` |
| Retur Pembelian | `/retur-pembelian` | Manager | `/api/purchase-returns` |
| Laporan Penjualan | `/laporan/penjualan` | Manager, Pemilik | `/api/reports/sales` |
| Laporan Laba | `/laporan/laba` | Manager, Pemilik | `/api/reports/profit` |
| Laporan Stok | `/laporan/stok` | Manager, Pemilik | `/api/reports/stock` |
| Laporan Expired | `/laporan/expired` | Manager, Pemilik | `/api/reports/expired-batches` |
| Export | `/export` | Manager, Pemilik | `/api/exports/*` |
| Manajemen User | `/users` | Manager | `/api/users` |
| Pengaturan | `/settings` | Manager | `/api/settings` |

Aturan sinkronisasi route:

1. Route frontend lama seperti `/products`, `/categories`, `/suppliers`, `/units`, `/batches`, `/purchases`, dan `/sales` tidak dipakai sebagai route UI utama.
2. Nama folder feature frontend tetap boleh memakai bahasa Inggris teknis seperti `products`, `sales`, dan `purchase-returns`.
3. Label menu UI menggunakan bahasa Indonesia.
4. API backend tetap memakai bahasa Inggris teknis dan prefix `/api`.
5. Jika UI/UX Flow masih menyebut route bahasa Inggris, implementasi frontend mengikuti tabel route final pada SDD ini.

---

## 8. Arsitektur Sistem Tingkat Tinggi

### 8.1 Diagram Arsitektur

```mermaid
flowchart LR
    User[Kasir / Manager / Pemilik Opsional] --> Browser[Web Browser]
    Browser --> Frontend[React + Vite Frontend]
    Frontend --> API[NestJS Backend API]
    API --> Auth[Auth + RBAC]
    API --> ProductSvc[Product Service]
    API --> BatchSvc[Batch Service]
    API --> PurchaseSvc[Purchase Service]
    API --> SalesSvc[Sales Service]
    API --> ReturnSvc[Return Service]
    API --> StockSvc[Stock Service]
    API --> ReportSvc[Report Service]
    API --> ExportSvc[Export Service]
    API --> AuditSvc[Audit Log Service]
    API --> DB[(PostgreSQL Database)]
```

### 8.2 Pola Arsitektur

Sistem menggunakan pola **modular monolith** untuk V1.

Alasan:

- domain bisnis masih berada dalam satu aplikasi POS Apotek;
- transaksi stok lebih mudah dijaga dalam satu database;
- deployment lebih sederhana;
- pengujian lebih mudah;
- belum ada kebutuhan multi-cabang atau skala layanan terpisah;
- integrasi frontend dan backend lebih mudah dikontrol.

Microservices tidak digunakan pada V1. Menggunakan microservices untuk satu apotek adalah cara mewah untuk menciptakan masalah yang belum diminta siapa pun.

---

## 9. Pembagian Layer

```text
Frontend Layer
  -> React pages
  -> reusable components
  -> form validation ringan
  -> cashier cart state
  -> API client
  -> server state cache

Backend API Layer
  -> NestJS controllers
  -> DTO validation
  -> authentication guard
  -> authorization guard
  -> response formatter

Service Layer
  -> business logic
  -> FEFO
  -> split batch
  -> stock mutation
  -> discount allocation
  -> profit calculation
  -> report calculation

Repository / Data Access Layer
  -> Prisma query
  -> raw SQL query kritis
  -> transaction handling
  -> row-level locking

Database Layer
  -> PostgreSQL tables
  -> constraints
  -> indexes
  -> partial unique indexes
  -> views jika diperlukan
```

---

## 10. Struktur Folder Frontend Final

Struktur frontend mengikuti dokumen frontend yang sudah ditetapkan.

```text
src/
├── app/
│   ├── router.tsx
│   ├── providers.tsx
│   ├── protected-route.tsx
│   └── role-route.tsx
│
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── cashier/
│   ├── products/
│   ├── categories/
│   ├── suppliers/
│   ├── units/
│   ├── batches/
│   ├── purchases/
│   ├── stock/
│   ├── stock-mutations/
│   ├── sales/
│   ├── sales-returns/
│   ├── purchase-returns/
│   ├── reports/
│   ├── exports/
│   ├── users/
│   └── settings/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── table/
│   ├── form/
│   ├── feedback/
│   ├── modal/
│   └── empty-state/
│
├── hooks/
├── lib/
├── stores/
├── types/
├── assets/
├── styles/
└── main.tsx
```

Aturan utama frontend:

1. Gunakan struktur berbasis feature.
2. Gunakan TanStack Query untuk server state.
3. Gunakan Zustand untuk keranjang kasir dan state UI ringan.
4. Gunakan React Hook Form dan Zod untuk validasi form.
5. Jangan menghitung FEFO, HPP, laba, atau mutasi stok final di frontend.
6. Jangan menampilkan HPP dan laba kepada kasir.

---

## 11. Struktur Folder Backend Final

Struktur backend mengikuti dokumen backend yang sudah ditetapkan.

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
│   ├── dto/
│   ├── enums/
│   ├── errors/
│   ├── filters/
│   ├── guards/
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
│   ├── purchases/
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

Aturan utama backend:

1. Controller tidak boleh berisi logika bisnis berat.
2. Service layer wajib menjadi pusat logika transaksi.
3. Repository atau Prisma service menangani query database.
4. Query stok kritis dapat memakai raw SQL dalam transaction.
5. Semua endpoint sensitif wajib melewati auth guard dan role guard.

---

## 12. Modul Sistem

| Modul | Tanggung Jawab |
|---|---|
| Auth Module | Login, logout, refresh token, validasi sesi |
| User Module | Manajemen user dan status user |
| Role Module | Role dan permission |
| Product Module | Produk, kategori, barcode, status produk |
| Unit Module | Satuan dasar dan konversi satuan jual |
| Supplier Module | Data supplier |
| Batch Module | Batch, expired date, stok batch, HPP, harga jual batch |
| Purchase Module | Pembelian supplier dan batch masuk |
| Sales Module | Transaksi kasir, FEFO, split batch, laba |
| Discount Module | Diskon dan alokasi diskon detail |
| Stock Module | Stok batch, stok produk, koreksi stok |
| Stock Mutation Module | Riwayat mutasi stok |
| Sales Return Module | Retur penjualan ke batch asal |
| Purchase Return Module | Retur pembelian ke supplier |
| Dashboard Module | Ringkasan omzet, laba, stok, expired |
| Report Module | Laporan penjualan, laba, stok, expired |
| Export Module | Ekspor laporan ke Excel/PDF |
| Settings Module | Profil apotek dan konfigurasi dasar |
| Audit Log Module | Catatan aktivitas penting |

---

## 13. Role dan Permission

### 13.1 Role Final V1

| Role | Status | Keterangan |
|---|---|---|
| KASIR | Wajib | Untuk transaksi penjualan dan retur penjualan terbatas |
| MANAGER | Wajib | Untuk pengelolaan produk, batch, stok, pembelian, laporan, dan user |
| PEMILIK | Opsional | Dapat ditambahkan untuk akses laporan dan dashboard tanpa aksi operasional |

Untuk implementasi V1 paling aman, gunakan `KASIR` dan `MANAGER` sebagai role wajib. Role `PEMILIK` boleh disiapkan pada database, tetapi permission-nya harus eksplisit jika diaktifkan.

### 13.2 Permission Matrix

| Permission | Kasir | Manager | Pemilik Opsional |
|---|---:|---:|---:|
| Login | Ya | Ya | Ya |
| Membuat transaksi penjualan | Ya | Ya | Tidak |
| Membuat retur penjualan | Ya | Ya | Tidak |
| Melihat stok terbatas | Ya | Ya | Ya |
| Mengelola produk | Tidak | Ya | Tidak |
| Mengelola kategori | Tidak | Ya | Tidak |
| Mengelola supplier | Tidak | Ya | Tidak |
| Mengelola satuan | Tidak | Ya | Tidak |
| Mengelola batch | Tidak | Ya | Tidak |
| Mengubah harga jual batch | Tidak | Ya | Tidak |
| Membuat pembelian | Tidak | Ya | Tidak |
| Membuat retur pembelian | Tidak | Ya | Tidak |
| Koreksi stok | Tidak | Ya | Tidak |
| Melihat mutasi stok lengkap | Tidak | Ya | Ya |
| Melihat laporan penjualan | Tidak | Ya | Ya |
| Melihat laporan laba | Tidak | Ya | Ya |
| Export laporan | Tidak | Ya | Ya |
| Manajemen user | Tidak | Ya | Tidak |
| Pengaturan aplikasi | Tidak | Ya | Tidak |

### 13.3 Larangan Akses Kasir

Kasir tidak boleh:

1. melihat HPP;
2. melihat laba;
3. melihat margin;
4. melihat harga beli;
5. mengubah harga jual;
6. mengelola pembelian;
7. mengelola supplier;
8. melakukan koreksi stok;
9. melihat laporan laba;
10. mengakses endpoint Manager melalui URL langsung.

Frontend boleh menyembunyikan menu, tetapi keamanan final tetap wajib di backend. Menyembunyikan tombol bukan keamanan; itu hanya dekorasi dengan rasa percaya diri berlebihan.

### 13.4 Sinkronisasi Role UI, Frontend Route, dan Backend Permission

| Area | Kasir | Manager | Pemilik Opsional | Catatan Teknis |
|---|---:|---:|---:|---|
| Sidebar kasir | Ya | Opsional | Tidak | Kasir hanya melihat menu operasional transaksi |
| Sidebar manager | Tidak | Ya | Tidak | Manager melihat master data, stok, pembelian, laporan, user, settings |
| Dashboard laba | Tidak | Ya | Ya | Backend tidak boleh mengirim HPP/laba ke role Kasir |
| Halaman kasir | Ya | Ya | Tidak wajib | Manager boleh membantu transaksi jika diperlukan |
| Riwayat transaksi | Terbatas | Penuh | Lihat | Kasir tidak melihat HPP/laba |
| Retur penjualan | Ya | Ya | Tidak wajib | Retur wajib mengacu transaksi dan batch asal |
| Produk | Lihat terbatas opsional | Kelola | Lihat opsional | Kasir tidak boleh mengubah produk |
| Batch | Lihat stok/harga jual terbatas | Kelola | Lihat | Kasir tidak melihat HPP |
| Pembelian | Tidak | Kelola | Lihat opsional | Kasir tidak boleh melihat harga beli supplier |
| Koreksi stok | Tidak | Ya | Tidak wajib | Wajib alasan dan audit |
| Laporan penjualan | Tidak | Ya | Ya | Laporan untuk Manager/Pemilik |
| Laporan laba | Tidak | Ya | Ya | Endpoint wajib menolak Kasir |
| Export laporan | Tidak | Ya | Ya | Export mengikuti filter laporan |
| Manajemen user | Tidak | Ya | Tidak wajib | Role user diubah oleh Manager |
| Pengaturan sistem | Tidak | Ya | Tidak wajib | Termasuk profil apotek dan ambang expired |

Aturan implementasi:

1. Frontend wajib memakai `ProtectedRoute` untuk halaman internal.
2. Frontend wajib memakai `RoleRoute` atau permission mapping untuk halaman role khusus.
3. Backend wajib memakai `JwtAuthGuard` dan `RolesGuard` pada endpoint sensitif.
4. Response API untuk Kasir harus disanitasi agar tidak mengandung `hpp`, `profit`, `margin`, `purchasePrice`, `totalHpp`, atau `totalProfit`.
5. Jika frontend memanipulasi URL secara manual, backend tetap harus menolak request yang tidak sesuai role.

---

## 14. Desain Database

### 14.1 Konvensi Database

| Konvensi | Aturan |
|---|---|
| Primary key | UUID |
| Timestamp | `created_at`, `updated_at`, `deleted_at` jika diperlukan |
| Soft delete | Gunakan `deleted_at` untuk master data historis |
| Status aktif | Gunakan `is_active` |
| Money | `NUMERIC/DECIMAL`; harga modal dan total pembelian `NUMERIC(18,6)`, HPP/laba internal `NUMERIC(18,8)`, harga jual pelanggan `NUMERIC(18,0)` |
| Quantity | `NUMERIC(14,3)` |
| Timezone storage | UTC |
| Foreign key | Wajib untuk relasi utama |
| Index | Wajib pada kolom pencarian dan foreign key |
| Unique constraint | Wajib untuk kode unik |
| Partial unique index | Wajib untuk unique data aktif dengan soft delete |
| Audit field | `created_by`, `updated_by` jika relevan |

### 14.2 Entity Relationship Diagram

```mermaid
erDiagram
    roles ||--o{ users : has
    users ||--o{ refresh_tokens : owns
    users ||--o{ sales : creates
    users ||--o{ purchases : creates
    users ||--o{ purchase_orders : creates
    users ||--o{ prescriptions : pharmacist
    users ||--o{ counseling_records : pharmacist
    users ||--o{ stock_mutations : performs
    users ||--o{ audit_logs : generates

    categories ||--o{ products : groups
    units ||--o{ products : base_unit
    units ||--o{ product_units : sale_unit
    products ||--o{ product_units : has
    products ||--o{ product_batches : has
    products ||--o{ purchase_order_items : ordered
    products ||--o{ purchase_items : purchased
    products ||--o{ prescription_items : prescribed
    products ||--o{ sale_items : sold

    suppliers ||--o{ purchase_orders : receives
    suppliers ||--o{ purchases : supplies
    suppliers ||--o{ product_batches : source
    purchase_orders ||--o{ purchase_order_items : contains
    purchase_orders ||--o{ purchases : converted_to
    purchases ||--o{ purchase_items : contains
    purchase_order_items ||--o{ purchase_items : received_as
    purchase_items ||--o| product_batches : creates

    product_batches ||--o{ batch_unit_prices : has
    product_batches ||--o{ sale_batch_allocations : allocated
    product_batches ||--o{ stock_mutations : mutates
    product_batches ||--o{ purchase_return_items : returned

    sales ||--o{ sale_items : contains
    sale_items ||--o{ sale_batch_allocations : split_into
    sales ||--o{ sales_returns : has
    sales ||--o{ counseling_records : related
    sales_returns ||--o{ sales_return_items : contains
    sale_batch_allocations ||--o{ sales_return_items : returned_from

    prescriptions ||--o{ prescription_items : contains
    prescriptions ||--o| sales : checkout
    prescriptions ||--o{ counseling_records : related

    purchases ||--o{ purchase_returns : has
    purchase_returns ||--o{ purchase_return_items : contains
```

---

## 15. Tabel Database Utama

Bagian ini mendefinisikan tabel utama. Detail migration final dapat disesuaikan dengan Prisma, tetapi constraint bisnis tidak boleh dihilangkan.

### 15.1 Tabel `roles`

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID role |
| name | VARCHAR(50) | Yes | UNIQUE | `KASIR`, `APOTEKER`, `MANAGER`, `PEMILIK` opsional |
| description | TEXT | No | - | Deskripsi role |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |
| updated_at | TIMESTAMP | Yes | DEFAULT now | Waktu diubah |

Seed minimal:

```text
KASIR
APOTEKER
MANAGER
```

Seed opsional:

```text
PEMILIK
```

### 15.2 Tabel `users`

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID user |
| role_id | UUID | Yes | FK roles.id | Role pengguna |
| name | VARCHAR(150) | Yes | - | Nama pengguna |
| username | VARCHAR(100) | Yes | UNIQUE | Username login |
| email | VARCHAR(150) | No | UNIQUE NULLABLE | Email login |
| password_hash | TEXT | Yes | - | Password yang sudah di-hash |
| is_active | BOOLEAN | Yes | DEFAULT true | Status akun |
| last_login_at | TIMESTAMP | No | - | Login terakhir |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |
| updated_at | TIMESTAMP | Yes | DEFAULT now | Waktu diubah |
| deleted_at | TIMESTAMP | No | - | Soft delete |

Index:

```sql
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

### 15.3 Tabel `refresh_tokens`

Tabel ini dibutuhkan karena backend final memakai JWT + Refresh Token.

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID token |
| user_id | UUID | Yes | FK users.id | Pemilik token |
| token_hash | TEXT | Yes | - | Refresh token yang sudah di-hash |
| expires_at | TIMESTAMP | Yes | - | Waktu kedaluwarsa |
| revoked_at | TIMESTAMP | No | - | Waktu dicabut |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |

Aturan:

1. Refresh token tidak boleh disimpan plaintext.
2. Token dicabut saat logout.
3. Token user nonaktif harus ditolak.

### 15.4 Tabel `categories`

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID kategori |
| name | VARCHAR(150) | Yes | - | Nama kategori |
| description | TEXT | No | - | Deskripsi |
| is_active | BOOLEAN | Yes | DEFAULT true | Status aktif |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |
| updated_at | TIMESTAMP | Yes | DEFAULT now | Waktu diubah |
| deleted_at | TIMESTAMP | No | - | Soft delete |

Partial unique index:

```sql
CREATE UNIQUE INDEX uq_categories_name_active
ON categories(name)
WHERE deleted_at IS NULL;
```

### 15.5 Tabel `suppliers`

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID supplier |
| name | VARCHAR(150) | Yes | - | Nama supplier |
| phone | VARCHAR(50) | No | - | Nomor telepon |
| address | TEXT | No | - | Alamat |
| contact_person | VARCHAR(150) | No | - | Nama kontak |
| is_active | BOOLEAN | Yes | DEFAULT true | Status aktif |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |
| updated_at | TIMESTAMP | Yes | DEFAULT now | Waktu diubah |
| deleted_at | TIMESTAMP | No | - | Soft delete |

Partial unique index:

```sql
CREATE UNIQUE INDEX uq_suppliers_name_active
ON suppliers(name)
WHERE deleted_at IS NULL;
```

### 15.6 Tabel `units`

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID satuan |
| name | VARCHAR(100) | Yes | UNIQUE | Nama satuan |
| symbol | VARCHAR(30) | No | - | Simbol satuan |
| is_active | BOOLEAN | Yes | DEFAULT true | Status aktif |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |
| updated_at | TIMESTAMP | Yes | DEFAULT now | Waktu diubah |

Seed awal:

```text
tablet
kaplet
kapsul
strip
box
botol
tube
sachet
biji
pcs
```

### 15.7 Tabel `products`

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID produk |
| category_id | UUID | Yes | FK categories.id | Kategori produk |
| base_unit_id | UUID | Yes | FK units.id | Satuan dasar stok |
| code | VARCHAR(100) | Yes | - | Kode produk |
| barcode | VARCHAR(150) | No | - | Barcode produk |
| name | VARCHAR(200) | Yes | - | Nama produk |
| generic_name | VARCHAR(200) | No | - | Nama generik |
| description | TEXT | No | - | Deskripsi produk |
| min_stock_base | NUMERIC(14,3) | Yes | DEFAULT 0 | Stok minimum dalam satuan dasar |
| is_active | BOOLEAN | Yes | DEFAULT true | Status aktif |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |
| updated_at | TIMESTAMP | Yes | DEFAULT now | Waktu diubah |
| deleted_at | TIMESTAMP | No | - | Soft delete |

Constraint dan index:

```sql
CREATE UNIQUE INDEX uq_products_code_active
ON products(code)
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX uq_products_barcode_active
ON products(barcode)
WHERE barcode IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_base_unit_id ON products(base_unit_id);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_is_active ON products(is_active);
```

### 15.8 Tabel `product_units`

Tabel ini menyimpan satuan jual produk dan faktor konversinya ke satuan dasar.

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID konversi |
| product_id | UUID | Yes | FK products.id | Produk |
| unit_id | UUID | Yes | FK units.id | Satuan jual |
| conversion_to_base | NUMERIC(14,3) | Yes | CHECK > 0 | Jumlah satuan dasar dalam 1 satuan jual |
| is_default_sale_unit | BOOLEAN | Yes | DEFAULT false | Satuan jual default |
| is_sale_unit | BOOLEAN | Yes | DEFAULT true | Boleh dipilih sebagai satuan jual kasir |
| is_active | BOOLEAN | Yes | DEFAULT true | Status aktif |
| min_sale_qty | NUMERIC(14,3) | Yes | DEFAULT 1 | Minimum qty jual untuk satuan ini |
| sale_unit_note | TEXT | No | - | Catatan batasan satuan jual |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |
| updated_at | TIMESTAMP | Yes | DEFAULT now | Waktu diubah |
| deleted_at | TIMESTAMP | No | - | Soft delete |

Constraint:

```sql
ALTER TABLE product_units
ADD CONSTRAINT chk_product_units_conversion_positive
CHECK (conversion_to_base > 0);

ALTER TABLE product_units
ADD CONSTRAINT chk_product_units_min_sale_qty_positive
CHECK (min_sale_qty > 0);

CREATE UNIQUE INDEX uq_product_units_active
ON product_units(product_id, unit_id)
WHERE deleted_at IS NULL;
```

Contoh:

```text
Produk: Paracetamol 500mg
base_unit: tablet

1 tablet = 1 tablet
1 strip = 10 tablet
1 box = 100 tablet
```

Aturan:

1. Stok tetap disimpan pada satuan dasar.
2. Satuan dasar tidak otomatis boleh dijual.
3. Kasir hanya boleh melihat `product_units` dengan `is_active = true` dan `is_sale_unit = true`.
4. Backend checkout wajib menolak product unit yang tidak aktif atau bukan satuan jual.

### 15.9 Tabel `product_batches`

Tabel ini adalah pusat stok produk. Stok tidak boleh hanya disimpan pada tabel `products`.

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID batch |
| product_id | UUID | Yes | FK products.id | Produk |
| supplier_id | UUID | No | FK suppliers.id | Supplier asal |
| purchase_item_id | UUID | No | FK purchase_items.id | Detail pembelian asal |
| batch_number | VARCHAR(150) | Yes | - | Nomor batch |
| expired_date | DATE | Yes | - | Tanggal kedaluwarsa |
| initial_stock_base | NUMERIC(14,3) | Yes | CHECK >= 0 | Stok awal satuan dasar |
| current_stock_base | NUMERIC(14,3) | Yes | CHECK >= 0 | Stok saat ini satuan dasar |
| hpp_base | NUMERIC(18,8) | Yes | CHECK >= 0 | HPP per satuan dasar presisi tinggi |
| received_at | TIMESTAMP | Yes | DEFAULT now | Waktu batch masuk |
| is_active | BOOLEAN | Yes | DEFAULT true | Status aktif |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |
| updated_at | TIMESTAMP | Yes | DEFAULT now | Waktu diubah |
| deleted_at | TIMESTAMP | No | - | Soft delete |

Constraint dan index:

```sql
ALTER TABLE product_batches
ADD CONSTRAINT chk_batches_current_stock_non_negative
CHECK (current_stock_base >= 0);

ALTER TABLE product_batches
ADD CONSTRAINT chk_batches_initial_stock_non_negative
CHECK (initial_stock_base >= 0);

ALTER TABLE product_batches
ADD CONSTRAINT chk_batches_hpp_non_negative
CHECK (hpp_base >= 0);

CREATE INDEX idx_batches_product_id ON product_batches(product_id);
CREATE INDEX idx_batches_supplier_id ON product_batches(supplier_id);
CREATE INDEX idx_batches_expired_date ON product_batches(expired_date);
CREATE INDEX idx_batches_fefo
ON product_batches(product_id, expired_date, received_at, current_stock_base);
```

Catatan desain:

1. `current_stock_base` disimpan sebagai denormalisasi untuk performa transaksi.
2. Semua perubahan `current_stock_base` wajib disertai `stock_mutations`.
3. Konsistensi stok batch dan mutasi dijaga oleh service layer dalam satu database transaction.
4. Rekomendasi final untuk implementasi berikutnya: `hpp_base NUMERIC(18,8)` agar HPP per satuan dasar tidak kehilangan presisi.

### 15.10 Tabel `batch_unit_prices`

Harga jual disimpan per batch dan satuan jual. Harga jual ini ditentukan manual oleh Manager dan digunakan sebagai harga jual final kasir; backend tidak menghitung harga jual otomatis dari harga modal.

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID harga |
| batch_id | UUID | Yes | FK product_batches.id | Batch |
| product_unit_id | UUID | Yes | FK product_units.id | Satuan jual produk |
| selling_price | NUMERIC(18,0) | Yes | CHECK >= 0 | Harga jual manual per satuan jual dalam rupiah bulat |
| is_active | BOOLEAN | Yes | DEFAULT true | Status aktif |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |
| updated_at | TIMESTAMP | Yes | DEFAULT now | Waktu diubah |

Constraint:

```sql
ALTER TABLE batch_unit_prices
ADD CONSTRAINT chk_batch_unit_prices_non_negative
CHECK (selling_price >= 0);

CREATE UNIQUE INDEX uq_batch_unit_prices_active
ON batch_unit_prices(batch_id, product_unit_id);
```

Aturan:

1. Harga jual transaksi harus disalin ke detail transaksi.
2. Perubahan harga di tabel ini tidak boleh mengubah transaksi lama.
3. Harga jual pelanggan tetap rupiah bulat, walaupun harga modal dan HPP internal memakai presisi tinggi.

### 15.10A Tabel `purchase_orders`

Tabel ini menyimpan rencana pemesanan obat ke supplier. PO tidak menambah stok dan tidak mengurangi stok.

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID PO |
| po_number | VARCHAR(100) | Yes | UNIQUE | Nomor PO, contoh `PO-20260603-0001` |
| po_date | DATE | Yes | - | Tanggal pemesanan |
| supplier_id | UUID | Yes | FK suppliers.id | Supplier tujuan |
| created_by | UUID | Yes | FK users.id | User pembuat PO dari login |
| pharmacist_id | UUID | No | FK users.id | Apoteker penanggung jawab jika berbeda |
| status | VARCHAR(50) | Yes | - | DRAFT/SENT/PARTIALLY_RECEIVED/RECEIVED/CANCELLED |
| notes | TEXT | No | - | Catatan PO |
| paper_size | VARCHAR(50) | No | - | A4/A5/CUSTOM |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |
| updated_at | TIMESTAMP | Yes | DEFAULT now | Waktu diubah |
| deleted_at | TIMESTAMP | No | - | Soft delete |

### 15.10B Tabel `purchase_order_items`

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID item PO |
| purchase_order_id | UUID | Yes | FK purchase_orders.id | PO |
| product_id | UUID | Yes | FK products.id | Produk yang dipesan |
| product_name_snapshot | VARCHAR(200) | Yes | - | Nama produk saat PO dibuat |
| unit_id | UUID | Yes | FK units.id | Satuan pemesanan |
| qty_ordered | NUMERIC(14,3) | Yes | CHECK > 0 | Jumlah dipesan |
| estimated_purchase_price | NUMERIC(18,6) | No | CHECK >= 0 | Estimasi harga beli presisi tinggi |
| notes | TEXT | No | - | Catatan item |
| qty_received | NUMERIC(14,3) | Yes | DEFAULT 0 | Qty yang sudah diterima lewat pembelian |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |
| updated_at | TIMESTAMP | Yes | DEFAULT now | Waktu diubah |

Nilai `remaining_qty` dihitung dari `qty_ordered - qty_received`. PO dapat diterima sebagian dan status PO diperbarui setelah pembelian final.

### 15.11 Tabel `purchases`

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID pembelian |
| supplier_id | UUID | Yes | FK suppliers.id | Supplier |
| purchase_order_id | UUID | No | FK purchase_orders.id | PO asal jika pembelian dari PO |
| purchase_number | VARCHAR(100) | Yes | UNIQUE | Nomor pembelian internal |
| invoice_number | VARCHAR(150) | No | - | Nomor invoice supplier |
| invoice_date | DATE | No | - | Tanggal faktur supplier |
| purchase_date | TIMESTAMP | Yes | - | Tanggal pembelian |
| tax_mode | VARCHAR(50) | Yes | DEFAULT NON_PPN | NON_PPN/PPN_INCLUDED/PPN_EXCLUDED |
| tax_rate_percent | NUMERIC(5,2) | No | CHECK >= 0 | Tarif PPN jika digunakan |
| subtotal | NUMERIC(18,6) | Yes | CHECK >= 0 | Subtotal pembelian |
| purchase_discount_amount | NUMERIC(18,6) | Yes | DEFAULT 0 | Total diskon pembelian |
| tax_amount | NUMERIC(18,6) | Yes | DEFAULT 0 | Nilai PPN pembelian |
| invoice_total_input | NUMERIC(18,6) | Yes | CHECK >= 0 | Total faktur input Manager |
| calculated_total | NUMERIC(18,6) | Yes | CHECK >= 0 | Total hasil hitung sistem |
| rounding_adjustment | NUMERIC(18,6) | Yes | DEFAULT 0 | Selisih pembulatan |
| difference_note | TEXT | No | - | Alasan selisih signifikan |
| note | TEXT | No | - | Catatan |
| status | VARCHAR(50) | Yes | DEFAULT FINAL | DRAFT/FINAL/CANCELLED |
| created_by | UUID | Yes | FK users.id | User pembuat |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |
| updated_at | TIMESTAMP | Yes | DEFAULT now | Waktu diubah |
| deleted_at | TIMESTAMP | No | - | Soft delete |

Status:

```text
DRAFT
FINAL
CANCELLED
```

Untuk V1, pembelian boleh langsung `FINAL`.

### 15.12 Tabel `purchase_items`

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID item pembelian |
| purchase_id | UUID | Yes | FK purchases.id | Pembelian |
| product_id | UUID | Yes | FK products.id | Produk |
| product_unit_id | UUID | Yes | FK product_units.id | Satuan pembelian |
| batch_id | UUID | No | FK product_batches.id | Batch yang dibuat/diperbarui |
| purchase_order_item_id | UUID | No | FK purchase_order_items.id | Item PO asal jika ada |
| batch_number | VARCHAR(150) | Yes | - | Nomor batch |
| expired_date | DATE | Yes | - | Tanggal kedaluwarsa |
| qty_ordered | NUMERIC(14,3) | No | CHECK >= 0 | Qty dari PO jika ada |
| qty_purchase_unit | NUMERIC(14,3) | Yes | CHECK > 0 | Qty satuan pembelian |
| qty_received | NUMERIC(14,3) | Yes | CHECK > 0 | Qty barang yang benar-benar datang |
| conversion_to_base | NUMERIC(14,3) | Yes | CHECK > 0 | Konversi saat pembelian |
| qty_base | NUMERIC(14,3) | Yes | CHECK > 0 | Qty satuan dasar |
| purchase_price | NUMERIC(18,6) | Yes | CHECK >= 0 | Harga beli supplier presisi tinggi per satuan pembelian |
| discount_type | VARCHAR(30) | Yes | DEFAULT NONE | NONE/NOMINAL/PERCENT |
| discount_value | NUMERIC(18,6) | Yes | DEFAULT 0 | Nilai diskon input |
| discount_amount | NUMERIC(18,6) | Yes | DEFAULT 0 | Hasil hitung diskon item |
| gross_total | NUMERIC(18,6) | Yes | CHECK >= 0 | Total sebelum diskon |
| net_total | NUMERIC(18,6) | Yes | CHECK >= 0 | Total setelah diskon |
| hpp_base | NUMERIC(18,8) | Yes | CHECK >= 0 | HPP satuan dasar presisi tinggi |
| selling_price | NUMERIC(18,0) | Yes | CHECK >= 0 | Harga jual manual Manager rupiah bulat |
| total_price | NUMERIC(18,6) | Yes | CHECK >= 0 | Total harga item |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |

Formula:

```text
qty_base = qty_received * conversion_to_base
gross_total = qty_received * purchase_price
discount_amount = diskon item nominal atau hasil persen dari gross_total
net_total = gross_total - discount_amount
hpp_base = net_total / qty_base
```

Jika UI memakai input total harga item, formula HPP menjadi:

```text
hpp_base = total_price / qty_base
```

Pilih satu pendekatan input di UI agar tidak ambigu. Aplikasi tidak perlu menguji kesabaran manusia dengan dua jenis harga yang kelihatannya sama tetapi maknanya berbeda.

Aturan pembelian:

1. Pembelian dapat dibuat manual atau dari PO.
2. Pembelian dari PO hanya menarik item sebagai draft; qty diterima, harga beli final, diskon, PPN, batch, expired date, dan harga jual tetap dapat disesuaikan Manager.
3. Setiap item pembelian final wajib memiliki `batch_number` dan `expired_date`.
4. Jika satu item PO datang dalam batch atau expired date berbeda, item pembelian dapat dipecah menjadi beberapa baris.
5. `tax_mode` hanya untuk pencocokan faktur supplier, bukan e-faktur atau perpajakan lengkap.
6. Jika selisih `invoice_total_input` dan `calculated_total` signifikan, pembelian wajib ditolak atau menyimpan `difference_note`.
7. Pembelian final menambah stok batch dan mencatat `stock_mutations` dalam database transaction.

### 15.13 Tabel `sales`

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID transaksi |
| sale_number | VARCHAR(100) | Yes | UNIQUE | Nomor transaksi |
| sale_time | TIMESTAMP | Yes | DEFAULT now UTC | Waktu transaksi backend |
| cashier_id | UUID | Yes | FK users.id | Kasir |
| customer_name | VARCHAR(150) | No | - | Nama pelanggan opsional |
| payment_method | VARCHAR(50) | Yes | - | CASH/TRANSFER/QRIS/DEBIT |
| subtotal | NUMERIC(18,0) | Yes | CHECK >= 0 | Subtotal sebelum diskon, rupiah bulat |
| discount_type | VARCHAR(30) | No | - | PERCENT/NOMINAL/NONE |
| discount_value | NUMERIC(18,6) | Yes | DEFAULT 0 | Nilai diskon input; persen boleh desimal, nominal rupiah |
| discount_amount | NUMERIC(18,0) | Yes | DEFAULT 0 | Nominal diskon final rupiah bulat |
| total | NUMERIC(18,0) | Yes | CHECK >= 0 | Total setelah diskon, rupiah bulat |
| paid_amount | NUMERIC(18,0) | No | - | Uang diterima |
| change_amount | NUMERIC(18,0) | No | - | Kembalian |
| total_hpp | NUMERIC(18,8) | Yes | DEFAULT 0 | Total HPP internal presisi |
| total_profit | NUMERIC(18,8) | Yes | DEFAULT 0 | Total laba internal presisi tinggi |
| status | VARCHAR(50) | Yes | DEFAULT FINAL | FINAL/VOID |
| note | TEXT | No | - | Catatan |
| idempotency_key | VARCHAR(100) | No | - | Proteksi transaksi ganda |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |
| updated_at | TIMESTAMP | Yes | DEFAULT now | Waktu diubah |
| deleted_at | TIMESTAMP | No | - | Soft delete jika diperlukan |

Payment method:

```text
CASH
TRANSFER
QRIS
DEBIT
```

Discount type:

```text
NONE
PERCENT
NOMINAL
```

### 15.14 Tabel `sale_items`

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID item penjualan |
| sale_id | UUID | Yes | FK sales.id | Transaksi |
| product_id | UUID | Yes | FK products.id | Produk |
| product_unit_id | UUID | Yes | FK product_units.id | Satuan jual |
| product_name_snapshot | VARCHAR(200) | Yes | - | Nama produk saat transaksi |
| unit_name_snapshot | VARCHAR(100) | Yes | - | Nama satuan saat transaksi |
| qty_sale_unit | NUMERIC(14,3) | Yes | CHECK > 0 | Qty dalam satuan jual |
| conversion_to_base | NUMERIC(14,3) | Yes | CHECK > 0 | Konversi saat transaksi |
| qty_base_total | NUMERIC(14,3) | Yes | CHECK > 0 | Total qty satuan dasar |
| unit_price | NUMERIC(18,0) | Yes | CHECK >= 0 | Snapshot harga jual final rupiah bulat |
| subtotal | NUMERIC(18,0) | Yes | CHECK >= 0 | Subtotal item rupiah bulat |
| discount_allocated | NUMERIC(18,0) | Yes | DEFAULT 0 | Diskon alokasi item rupiah bulat |
| hpp_total | NUMERIC(18,8) | Yes | DEFAULT 0 | Total HPP item presisi |
| profit_total | NUMERIC(18,8) | Yes | DEFAULT 0 | Total laba internal item |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |

Tabel ini memudahkan riwayat transaksi berdasarkan tampilan kasir. Split teknis per batch tetap disimpan pada `sale_batch_allocations`.

### 15.15 Tabel `sale_batch_allocations`

Tabel ini adalah detail teknis alokasi stok batch untuk transaksi penjualan.

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID alokasi |
| sale_item_id | UUID | Yes | FK sale_items.id | Item penjualan |
| batch_id | UUID | Yes | FK product_batches.id | Batch yang dipakai |
| batch_number_snapshot | VARCHAR(150) | Yes | - | Nomor batch saat transaksi |
| expired_date_snapshot | DATE | Yes | - | Expired date saat transaksi |
| qty_base | NUMERIC(14,3) | Yes | CHECK > 0 | Qty satuan dasar dari batch |
| qty_sale_unit_equivalent | NUMERIC(14,3) | Yes | CHECK > 0 | Qty ekuivalen satuan jual |
| unit_price_snapshot | NUMERIC(18,0) | Yes | CHECK >= 0 | Snapshot harga jual final saat transaksi |
| hpp_base_snapshot | NUMERIC(18,8) | Yes | CHECK >= 0 | HPP dasar presisi saat transaksi |
| subtotal_allocated | NUMERIC(18,0) | Yes | CHECK >= 0 | Subtotal alokasi rupiah bulat |
| discount_allocated | NUMERIC(18,0) | Yes | DEFAULT 0 | Diskon alokasi rupiah bulat |
| hpp_allocated | NUMERIC(18,8) | Yes | CHECK >= 0 | HPP alokasi internal presisi |
| profit_allocated | NUMERIC(18,8) | Yes | - | Laba alokasi internal presisi |
| returned_qty_base | NUMERIC(14,3) | Yes | DEFAULT 0 | Qty yang sudah diretur |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |

Formula:

```text
hpp_allocated = qty_base * hpp_base_snapshot
profit_allocated = subtotal_allocated - hpp_allocated - discount_allocated
```

`profit_display` untuk laporan adalah hasil pembulatan tampilan dari `profit_allocated` atau total laba internal, bukan nilai baru yang menggantikan laba internal.

Aturan:

1. Retur penjualan harus mengacu ke tabel ini.
2. Laporan laba harus memakai tabel ini atau ringkasan yang berasal dari tabel ini.
3. Jangan menghitung laba laporan dari master produk. Itu bukan laporan, itu ramalan dengan antarmuka tabel.

### 15.16 Tabel `sales_returns`

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID retur penjualan |
| sale_id | UUID | Yes | FK sales.id | Transaksi asal |
| return_number | VARCHAR(100) | Yes | UNIQUE | Nomor retur |
| return_time | TIMESTAMP | Yes | DEFAULT now UTC | Waktu retur |
| cashier_id | UUID | Yes | FK users.id | User pembuat |
| reason | TEXT | Yes | - | Alasan retur |
| total_refund | NUMERIC(18,0) | Yes | DEFAULT 0 | Nilai pengembalian rupiah bulat |
| total_hpp_reversed | NUMERIC(18,8) | Yes | DEFAULT 0 | HPP yang dikoreksi presisi |
| total_profit_reversed | NUMERIC(18,8) | Yes | DEFAULT 0 | Laba yang dikoreksi presisi |
| status | VARCHAR(50) | Yes | DEFAULT FINAL | Status retur |
| idempotency_key | VARCHAR(100) | No | - | Proteksi retur ganda |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |

### 15.17 Tabel `sales_return_items`

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID item retur |
| sales_return_id | UUID | Yes | FK sales_returns.id | Retur penjualan |
| sale_batch_allocation_id | UUID | Yes | FK sale_batch_allocations.id | Alokasi batch asal |
| product_id | UUID | Yes | FK products.id | Produk |
| batch_id | UUID | Yes | FK product_batches.id | Batch asal |
| qty_base_returned | NUMERIC(14,3) | Yes | CHECK > 0 | Qty retur satuan dasar |
| refund_amount | NUMERIC(18,0) | Yes | CHECK >= 0 | Nilai refund rupiah bulat |
| hpp_reversed | NUMERIC(18,8) | Yes | CHECK >= 0 | HPP yang dikoreksi presisi |
| profit_reversed | NUMERIC(18,8) | Yes | - | Laba yang dikoreksi presisi |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |

Rule:

```text
qty_base_returned <= sale_batch_allocations.qty_base - sale_batch_allocations.returned_qty_base
```

Formula retur sebagian:

```text
return_ratio = qty_base_returned / sale_batch_allocations.qty_base
refund_amount = return_ratio * (subtotal_allocated - discount_allocated)
hpp_reversed = return_ratio * hpp_allocated
profit_reversed = refund_amount - hpp_reversed
```

### 15.18 Tabel `purchase_returns`

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID retur pembelian |
| purchase_id | UUID | No | FK purchases.id | Pembelian asal |
| supplier_id | UUID | Yes | FK suppliers.id | Supplier |
| return_number | VARCHAR(100) | Yes | UNIQUE | Nomor retur pembelian |
| return_time | TIMESTAMP | Yes | DEFAULT now UTC | Waktu retur |
| manager_id | UUID | Yes | FK users.id | User pembuat |
| reason | TEXT | Yes | - | Alasan retur |
| total_amount | NUMERIC(18,6) | Yes | DEFAULT 0 | Nilai retur pembelian presisi |
| status | VARCHAR(50) | Yes | DEFAULT FINAL | Status |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |

### 15.19 Tabel `purchase_return_items`

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID item retur pembelian |
| purchase_return_id | UUID | Yes | FK purchase_returns.id | Retur pembelian |
| batch_id | UUID | Yes | FK product_batches.id | Batch |
| product_id | UUID | Yes | FK products.id | Produk |
| qty_base_returned | NUMERIC(14,3) | Yes | CHECK > 0 | Qty retur satuan dasar |
| hpp_base_snapshot | NUMERIC(18,8) | Yes | CHECK >= 0 | HPP saat retur presisi |
| total_amount | NUMERIC(18,6) | Yes | CHECK >= 0 | Nilai retur pembelian presisi |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |

### 15.20 Tabel `stock_mutations`

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID mutasi |
| product_id | UUID | Yes | FK products.id | Produk |
| batch_id | UUID | Yes | FK product_batches.id | Batch |
| mutation_type | VARCHAR(50) | Yes | - | Jenis mutasi |
| reference_type | VARCHAR(50) | Yes | - | SALE/PURCHASE/RETURN/ADJUSTMENT |
| reference_id | UUID | Yes | - | ID referensi |
| qty_before | NUMERIC(14,3) | Yes | CHECK >= 0 | Stok sebelum |
| qty_change | NUMERIC(14,3) | Yes | CHECK <> 0 | Perubahan stok |
| qty_after | NUMERIC(14,3) | Yes | CHECK >= 0 | Stok sesudah |
| reason | TEXT | No | - | Alasan |
| created_by | UUID | Yes | FK users.id | User |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu mutasi |

Mutation type:

```text
PURCHASE_IN
SALE_OUT
SALES_RETURN_IN
PURCHASE_RETURN_OUT
STOCK_ADJUSTMENT_IN
STOCK_ADJUSTMENT_OUT
```

Reference type:

```text
PURCHASE
SALE
SALES_RETURN
PURCHASE_RETURN
STOCK_ADJUSTMENT
```

Constraint:

```sql
ALTER TABLE stock_mutations
ADD CONSTRAINT chk_stock_mutations_qty_after_non_negative
CHECK (qty_after >= 0);

ALTER TABLE stock_mutations
ADD CONSTRAINT chk_stock_mutations_qty_change_not_zero
CHECK (qty_change <> 0);
```

### 15.21 Tabel `stock_adjustments`

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID koreksi |
| batch_id | UUID | Yes | FK product_batches.id | Batch |
| product_id | UUID | Yes | FK products.id | Produk |
| old_qty_base | NUMERIC(14,3) | Yes | CHECK >= 0 | Stok lama |
| new_qty_base | NUMERIC(14,3) | Yes | CHECK >= 0 | Stok baru |
| difference_qty | NUMERIC(14,3) | Yes | - | Selisih |
| reason | TEXT | Yes | - | Alasan koreksi |
| created_by | UUID | Yes | FK users.id | Manager |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |

### 15.22 Tabel `app_settings`

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID setting |
| pharmacy_name | VARCHAR(200) | No | - | Nama apotek |
| address | TEXT | No | - | Alamat |
| phone | VARCHAR(50) | No | - | Telepon |
| expired_alert_days | INTEGER | Yes | DEFAULT 30 | Ambang alert expired |
| currency | VARCHAR(20) | Yes | DEFAULT IDR | Mata uang |
| timezone | VARCHAR(100) | Yes | DEFAULT Asia/Makassar | Zona waktu tampilan |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |
| updated_at | TIMESTAMP | Yes | DEFAULT now | Waktu diubah |

### 15.23 Tabel `audit_logs`

Tabel ini mencatat aktivitas penting sistem.

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID audit |
| user_id | UUID | No | FK users.id | User pelaku |
| action | VARCHAR(100) | Yes | - | Nama aksi |
| entity_type | VARCHAR(100) | Yes | - | Jenis entitas |
| entity_id | UUID | No | - | ID entitas |
| old_value | JSONB | No | - | Data sebelum perubahan |
| new_value | JSONB | No | - | Data setelah perubahan |
| ip_address | VARCHAR(100) | No | - | IP pengguna |
| user_agent | TEXT | No | - | User agent |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |

Aktivitas yang perlu dicatat:

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

### 15.24 Tabel `idempotency_keys`

Tabel ini mencegah transaksi ganda akibat double submit atau retry request.

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID |
| key | VARCHAR(150) | Yes | UNIQUE | Idempotency key dari client |
| user_id | UUID | Yes | FK users.id | User pemilik request |
| endpoint | VARCHAR(200) | Yes | - | Endpoint terkait |
| request_hash | TEXT | Yes | - | Hash payload request |
| response_body | JSONB | No | - | Response sukses yang disimpan |
| status | VARCHAR(50) | Yes | - | PROCESSING/SUCCESS/FAILED |
| expires_at | TIMESTAMP | Yes | - | Kedaluwarsa key |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |
| updated_at | TIMESTAMP | Yes | DEFAULT now | Waktu diubah |

Endpoint yang wajib mendukung idempotency:

```text
POST /api/sales
POST /api/sales-returns
POST /api/purchases
POST /api/purchase-returns
POST /api/stock/adjustments
```

### 15.24A Tabel `prescriptions`

Tabel ini menyimpan resep dasar yang disiapkan sebelum pembayaran. Resep tidak mengurangi stok sebelum checkout berhasil.

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID resep |
| prescription_number | VARCHAR(100) | Yes | UNIQUE | Nomor resep internal |
| received_date | TIMESTAMP | Yes | - | Tanggal resep diterima |
| patient_name | VARCHAR(150) | Yes | - | Nama pasien |
| patient_phone | VARCHAR(50) | No | - | Kontak pasien |
| doctor_name | VARCHAR(150) | No | - | Nama dokter |
| health_facility | VARCHAR(150) | No | - | Klinik/RS asal resep |
| pharmacist_id | UUID | Yes | FK users.id | Apoteker pemeriksa dari login |
| sale_id | UUID | No | FK sales.id | Transaksi jika sudah checkout |
| status | VARCHAR(50) | Yes | - | DRAFT/REVIEWED/READY_FOR_PAYMENT/PAID/COMPLETED/CANCELLED/NEED_CONFIRMATION |
| notes | TEXT | No | - | Catatan resep |
| attachment_url | TEXT | No | - | Foto/scan resep, future enhancement |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |
| updated_at | TIMESTAMP | Yes | DEFAULT now | Waktu diubah |
| deleted_at | TIMESTAMP | No | - | Soft delete |

### 15.24B Tabel `prescription_items`

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID item resep |
| prescription_id | UUID | Yes | FK prescriptions.id | Resep |
| product_id | UUID | Yes | FK products.id | Obat |
| product_unit_id | UUID | Yes | FK product_units.id | Satuan jual aktif |
| qty | NUMERIC(14,3) | Yes | CHECK > 0 | Jumlah obat |
| usage_instruction | TEXT | Yes | - | Aturan pakai |
| label_note | TEXT | No | - | Catatan etiket |
| substitution_note | TEXT | No | - | Catatan substitusi |
| item_status | VARCHAR(50) | Yes | DEFAULT AVAILABLE | AVAILABLE/OUT_OF_STOCK/SUBSTITUTED/CANCELLED |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |

### 15.24C Tabel `counseling_records`

Tabel ini hanya dokumentasi pelayanan. Konseling tidak membuat tagihan dan tidak mengubah stok.

| Field | Type | Required | Constraint | Description |
|---|---|---:|---|---|
| id | UUID | Yes | PK | ID konseling |
| counseling_date | TIMESTAMP | Yes | - | Tanggal konseling |
| pharmacist_id | UUID | Yes | FK users.id | Apoteker dari login |
| patient_name | VARCHAR(150) | No | - | Nama pasien |
| prescription_id | UUID | No | FK prescriptions.id | Resep terkait |
| sale_id | UUID | No | FK sales.id | Transaksi terkait |
| topic | VARCHAR(200) | No | - | Topik konseling |
| notes | TEXT | Yes | - | Catatan konseling |
| status | VARCHAR(50) | Yes | DEFAULT COMPLETED | COMPLETED/CANCELLED |
| created_at | TIMESTAMP | Yes | DEFAULT now | Waktu dibuat |
| updated_at | TIMESTAMP | Yes | DEFAULT now | Waktu diubah |

### 15.25 Rekomendasi Final Tipe Data Harga

Requirement ini disebut **Presisi Harga Modal dan HPP**. Presisi tinggi hanya diterapkan pada harga modal, HPP, dan perhitungan laba internal. Harga jual pelanggan tetap ditentukan manual oleh Manager sebagai nilai Rupiah bulat.

| Field | Tipe Rekomendasi | Catatan |
|---|---|---|
| `purchase_price` | `NUMERIC(18,6)` | Harga beli supplier |
| `purchase_discount_value` | `NUMERIC(18,6)` | Nilai diskon pembelian input |
| `purchase_discount_amount` | `NUMERIC(18,6)` | Hasil hitung diskon pembelian |
| `purchase_gross_total` | `NUMERIC(18,6)` | Total kotor pembelian |
| `purchase_net_total` | `NUMERIC(18,6)` | Total bersih pembelian |
| `tax_amount` | `NUMERIC(18,6)` | Nilai PPN pembelian |
| `invoice_total_input` | `NUMERIC(18,6)` | Total faktur supplier input |
| `calculated_total` | `NUMERIC(18,6)` | Total pembelian hasil hitung sistem |
| `rounding_adjustment` | `NUMERIC(18,6)` | Selisih pembulatan faktur |
| `hpp_base` | `NUMERIC(18,8)` | HPP per satuan dasar |
| `selling_price` | `NUMERIC(18,0)` | Harga jual final manual dari Manager |
| `sale_unit_price` atau snapshot ekuivalen | `NUMERIC(18,0)` | Snapshot harga jual saat transaksi |
| `sale_total` | `NUMERIC(18,0)` | Total penjualan rupiah bulat |
| `paid_amount` | `NUMERIC(18,0)` | Uang diterima rupiah bulat |
| `change_amount` | `NUMERIC(18,0)` | Kembalian rupiah bulat |
| `profit_amount` atau field profit allocation | `NUMERIC(18,8)` | Laba internal presisi |
| `profit_display` | Nilai laporan yang dibulatkan saat tampil | Tidak mengubah nilai internal |

Backend wajib menghitung laba dari snapshot harga jual final dikurangi HPP internal presisi. Perubahan harga jual baru tidak boleh mengubah histori transaksi lama, dan response Kasir tidak boleh memuat harga modal, HPP, margin, atau laba.

Jangan gunakan `FLOAT`, `DOUBLE`, atau `REAL` untuk uang, HPP, pajak, diskon, dan laba. Gunakan `NUMERIC` atau `DECIMAL`.

---

## 16. View Database

### 16.1 View `v_product_stock_summary`

View ini membantu dashboard dan daftar stok.

```sql
CREATE VIEW v_product_stock_summary AS
SELECT
  p.id AS product_id,
  p.name AS product_name,
  p.code AS product_code,
  p.category_id,
  p.base_unit_id,
  COALESCE(SUM(
    CASE
      WHEN b.is_active = true
       AND b.deleted_at IS NULL
       AND b.expired_date >= CURRENT_DATE
      THEN b.current_stock_base
      ELSE 0
    END
  ), 0) AS available_stock_base,
  p.min_stock_base,
  CASE
    WHEN COALESCE(SUM(
      CASE
        WHEN b.is_active = true
         AND b.deleted_at IS NULL
         AND b.expired_date >= CURRENT_DATE
        THEN b.current_stock_base
        ELSE 0
      END
    ), 0) <= p.min_stock_base
    THEN true
    ELSE false
  END AS is_low_stock
FROM products p
LEFT JOIN product_batches b ON b.product_id = p.id
WHERE p.deleted_at IS NULL
GROUP BY p.id;
```

Catatan:

1. View ini tidak menggantikan validasi stok saat transaksi.
2. Validasi stok final tetap dilakukan dalam `SalesService` dengan row lock.
3. Untuk laporan besar, view atau materialized view dapat dipertimbangkan setelah kebutuhan performa terbukti.

---

## 17. Service Layer

### 17.1 AuthService

Tanggung jawab:

- login;
- logout;
- refresh token;
- validasi password;
- membuat access token;
- membuat refresh token;
- revoke refresh token;
- membaca user aktif;
- menolak user nonaktif.

Fungsi minimal:

```text
login(identifier, password)
logout(userId, refreshToken)
refresh(refreshToken)
getCurrentUser(userId)
assertAuthenticated(user)
assertRole(user, allowedRoles)
```

### 17.2 ProductService

Tanggung jawab:

- membuat produk;
- mengubah produk;
- menonaktifkan produk;
- mengaktifkan produk;
- mencari produk;
- memvalidasi kategori;
- memvalidasi satuan dasar;
- memastikan kode dan barcode tidak duplikat.

### 17.3 UnitService

Tanggung jawab:

- mengelola satuan;
- mengelola konversi satuan produk;
- memastikan faktor konversi valid;
- mencegah penghapusan satuan yang sudah memiliki histori transaksi.

### 17.4 BatchService

Tanggung jawab:

- membuat batch;
- mengubah status batch;
- menyimpan HPP;
- menyimpan harga jual batch;
- mengambil batch aktif untuk FEFO;
- mengelola expired alert;
- mencegah batch historis dihapus permanen.

### 17.5 PurchaseService

Tanggung jawab:

- membuat pembelian;
- menghitung HPP;
- membuat batch atau memperbarui batch sesuai aturan;
- menambah stok batch;
- mencatat mutasi stok masuk.

Atomic rule:

```text
BEGIN
  validate supplier
  validate items
  create purchase
  create purchase items
  create/update product_batches
  create/update batch_unit_prices
  increase stock
  create stock_mutations
  create audit_log
COMMIT
```

Jika salah satu langkah gagal:

```text
ROLLBACK
```

### 17.6 SalesService

Tanggung jawab:

- validasi keranjang;
- menghitung subtotal;
- validasi diskon;
- validasi pembayaran;
- menjalankan FEFO;
- membuat split batch;
- menyimpan transaksi;
- mengurangi stok;
- mencatat mutasi;
- menghitung laba;
- menyimpan idempotency.

Atomic rule:

```text
BEGIN
  validate idempotency key
  validate cart
  validate product and unit
  lock selected batches
  run FEFO
  calculate split allocations
  calculate subtotal
  calculate discount
  allocate discount
  calculate hpp and profit
  create sale
  create sale items
  create sale batch allocations
  update batch stock
  create stock mutations
  create audit log
  save idempotency response
COMMIT
```

Jika gagal:

```text
ROLLBACK
```

### 17.7 FefoService

Tanggung jawab:

- memilih batch berdasarkan expired date terdekat;
- mengabaikan batch expired;
- mengabaikan batch stok nol;
- mengabaikan batch nonaktif;
- melakukan split jika stok satu batch tidak cukup.

Pseudocode:

```text
function allocateBatches(productId, requiredQtyBase):
    remainingQty = requiredQtyBase
    allocations = []

    batches = find batches where:
        product_id = productId
        is_active = true
        deleted_at is null
        expired_date >= today
        current_stock_base > 0
    order by expired_date asc, received_at asc
    lock rows for update

    for batch in batches:
        if remainingQty <= 0:
            break

        qtyFromBatch = min(batch.current_stock_base, remainingQty)

        allocations.append({
            batch_id: batch.id,
            qty_base: qtyFromBatch,
            hpp_base: batch.hpp_base,
            expired_date: batch.expired_date,
            batch_number: batch.batch_number
        })

        remainingQty = remainingQty - qtyFromBatch

    if remainingQty > 0:
        throw STOCK_NOT_ENOUGH

    return allocations
```

### 17.8 DiscountService

Tanggung jawab:

- menghitung diskon persen;
- menghitung diskon nominal;
- memastikan diskon tidak melebihi subtotal;
- mengalokasikan diskon ke detail batch;
- menangani pembulatan.

Formula:

```text
discount_amount =
  if NONE: 0
  if PERCENT: subtotal * discount_value / 100
  if NOMINAL: discount_value
```

Alokasi:

```text
discount_allocated = subtotal_allocated / subtotal_total * discount_amount
```

Rule pembulatan:

1. Gunakan pembulatan uang ke 2 desimal.
2. Selisih pembulatan diberikan ke detail terakhir.
3. Total diskon alokasi harus sama dengan total diskon transaksi.

### 17.9 ProfitService

Tanggung jawab:

- menghitung HPP detail;
- menghitung laba detail;
- menghitung koreksi laba retur;
- memastikan laporan laba berasal dari detail transaksi.

Formula:

```text
hpp_allocated = qty_base * hpp_base_snapshot
profit_allocated = subtotal_allocated - discount_allocated - hpp_allocated
```

### 17.10 StockService

Tanggung jawab:

- menambah stok;
- mengurangi stok;
- memastikan stok tidak negatif;
- mencatat mutasi;
- koreksi stok.

Rule:

1. Semua perubahan stok harus melalui `StockService`.
2. Tidak boleh ada modul yang langsung mengubah `current_stock_base` tanpa mutasi.
3. Pengecualian hanya migrasi awal dan harus diberi catatan.

### 17.11 ReturnService

Tanggung jawab:

- membuat retur penjualan;
- membuat retur pembelian;
- memvalidasi qty retur;
- mengembalikan stok ke batch asal;
- mengurangi stok untuk retur pembelian;
- mengoreksi laporan.

Retur penjualan atomic rule:

```text
BEGIN
  validate idempotency key
  validate original sale
  lock sale_batch_allocations
  validate allocation available for return
  create sales_return
  create sales_return_items
  increase batch stock
  update returned_qty_base
  create stock_mutation
  create audit_log
COMMIT
```

### 17.12 ReportService

Tanggung jawab:

- dashboard;
- laporan penjualan;
- laporan laba;
- laporan stok;
- laporan batch expired;
- filter periode;
- koreksi retur;
- agregasi omzet, HPP, diskon, dan laba.

Rule:

1. Laporan laba memakai `sale_batch_allocations`.
2. Retur memakai `sales_return_items`.
3. Jangan memakai harga produk terbaru untuk laporan historis.

---

## 18. Desain Alur Transaksi Utama

### 18.1 Alur Pembelian Supplier

```mermaid
sequenceDiagram
    actor Manager
    participant UI as React Frontend
    participant API as NestJS API
    participant Purchase as PurchaseService
    participant Stock as StockService
    participant DB as PostgreSQL

    Manager->>UI: Input pembelian
    UI->>API: POST /api/purchases
    API->>Purchase: createPurchase(data)
    Purchase->>DB: BEGIN TRANSACTION
    Purchase->>DB: Insert purchases
    Purchase->>DB: Insert purchase_items
    Purchase->>DB: Insert/update product_batches
    Purchase->>Stock: increaseStock()
    Stock->>DB: Insert stock_mutations
    Purchase->>DB: COMMIT
    API->>UI: Pembelian berhasil
```

### 18.2 Alur Penjualan Kasir

```mermaid
sequenceDiagram
    actor Kasir
    participant UI as React Cashier Page
    participant API as NestJS API
    participant Sales as SalesService
    participant FEFO as FefoService
    participant Discount as DiscountService
    participant Stock as StockService
    participant DB as PostgreSQL

    Kasir->>UI: Isi keranjang dan pembayaran
    UI->>API: POST /api/sales + Idempotency-Key
    API->>Sales: createSale(cart, payment)
    Sales->>DB: BEGIN TRANSACTION
    Sales->>Sales: Validasi cart
    Sales->>DB: SELECT batches FOR UPDATE
    Sales->>FEFO: Alokasi batch
    Sales->>Discount: Hitung dan alokasikan diskon
    Sales->>DB: Insert sales
    Sales->>DB: Insert sale_items
    Sales->>DB: Insert sale_batch_allocations
    Sales->>Stock: decreaseStock()
    Stock->>DB: Update current_stock_base
    Stock->>DB: Insert stock_mutations
    Sales->>DB: COMMIT
    API->>UI: Transaksi berhasil dengan data final
```

### 18.3 Alur Retur Penjualan

```mermaid
sequenceDiagram
    actor Kasir
    participant UI as React Frontend
    participant API as NestJS API
    participant Return as SalesReturnService
    participant Stock as StockService
    participant DB as PostgreSQL

    Kasir->>UI: Pilih transaksi dan item retur
    UI->>API: POST /api/sales-returns + Idempotency-Key
    API->>Return: createSalesReturn(data)
    Return->>DB: BEGIN TRANSACTION
    Return->>DB: Lock sale_batch_allocations
    Return->>DB: Insert sales_returns
    Return->>DB: Insert sales_return_items
    Return->>Stock: increaseStock()
    Stock->>DB: Update batch stock
    Stock->>DB: Insert stock_mutations
    Return->>DB: Update returned_qty_base
    Return->>DB: COMMIT
    API->>UI: Retur berhasil
```

---

## 19. Strategi FEFO dan Locking

### 19.1 Query Locking Batch Saat Penjualan

```sql
SELECT *
FROM product_batches
WHERE product_id = :product_id
  AND is_active = true
  AND deleted_at IS NULL
  AND expired_date >= CURRENT_DATE
  AND current_stock_base > 0
ORDER BY expired_date ASC, received_at ASC
FOR UPDATE;
```

Aturan:

1. Query harus dijalankan di dalam database transaction.
2. FEFO tidak boleh berjalan final di frontend.
3. Jika stok tidak cukup setelah lock, transaksi gagal dan rollback.
4. Batch expired, nonaktif, atau stok nol tidak boleh dipilih.
5. Split batch wajib disimpan pada `sale_batch_allocations`.

### 19.2 Query Locking Retur Penjualan

```sql
SELECT *
FROM sale_batch_allocations
WHERE id = :allocation_id
FOR UPDATE;
```

### 19.3 Query Locking Retur Pembelian

```sql
SELECT *
FROM product_batches
WHERE id = :batch_id
FOR UPDATE;
```

---

## 20. API Contract

### 20.1 Standar Response API

Success response:

```json
{
  "success": true,
  "message": "Data berhasil diproses",
  "data": {}
}
```

Error response:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input tidak valid",
    "details": []
  }
}
```

### 20.2 HTTP Status

| Status | Penggunaan |
|---|---|
| 200 | Request berhasil |
| 201 | Data berhasil dibuat |
| 400 | Validasi gagal |
| 401 | Belum login atau token tidak valid |
| 403 | Akses ditolak |
| 404 | Data tidak ditemukan |
| 409 | Konflik data, stok berubah, idempotency conflict |
| 422 | Business rule gagal |
| 500 | Kesalahan server |

### 20.3 Idempotency Header

Endpoint transaksi wajib menerima header:

```text
Idempotency-Key: uuid
```

Aturan:

1. Jika request dengan key yang sama dan payload sama sudah berhasil, backend mengembalikan response sukses yang sama.
2. Jika request dengan key yang sama tetapi payload berbeda, backend mengembalikan `IDEMPOTENCY_CONFLICT`.
3. Key dapat kedaluwarsa setelah periode tertentu, misalnya 24 jam.
4. Frontend wajib mengirim key yang sama ketika melakukan retry pada request checkout yang sama.
5. Frontend wajib membuat key baru ketika pengguna memperbaiki keranjang setelah validasi bisnis gagal.
6. Backend wajib menyimpan hash payload agar request dengan key sama tetapi payload berbeda dapat ditolak.

### 20.4 Mapping Error API ke UI

| Error Code | HTTP Status | Tampilan UI yang Disarankan | Area UI |
|---|---:|---|---|
| `VALIDATION_ERROR` | 400 | Periksa kembali input yang belum valid. | Field/Form |
| `UNAUTHORIZED` | 401 | Sesi tidak valid. Silakan login ulang. | Toast + Redirect |
| `SESSION_EXPIRED` | 401 | Sesi login berakhir. Silakan login ulang. | Toast + Redirect |
| `ACCESS_DENIED` | 403 | Anda tidak memiliki akses ke halaman ini. | Page Error 403 |
| `DATA_NOT_FOUND` | 404 | Data tidak ditemukan. | Empty/Error State |
| `DUPLICATE_DATA` | 409 | Data yang sama sudah tersedia. | Form Error |
| `IDEMPOTENCY_CONFLICT` | 409 | Request transaksi tidak valid karena terdeteksi berbeda dari proses sebelumnya. | Modal Checkout |
| `PRODUCT_INACTIVE` | 422 | Produk ini tidak dapat dijual karena sudah nonaktif. | Cart/Product Card |
| `UNIT_INVALID` | 422 | Satuan jual tidak valid untuk produk ini. | Cart/Product Detail |
| `VALID_BATCH_NOT_AVAILABLE` | 422 | Batch aktif dengan stok tersedia tidak ditemukan. | Checkout Error |
| `STOCK_NOT_ENOUGH` | 422 | Stok produk tidak mencukupi. Periksa qty atau pilih produk lain. | Cart/Checkout |
| `DISCOUNT_EXCEEDS_SUBTOTAL` | 422 | Diskon tidak boleh melebihi subtotal transaksi. | Payment Panel |
| `CASH_NOT_ENOUGH` | 422 | Nominal pembayaran belum mencukupi. | Payment Panel |
| `RETURN_QTY_EXCEEDS_AVAILABLE` | 422 | Qty retur melebihi jumlah yang dapat diretur. | Retur Form |
| `EXPORT_FAILED` | 500 | Ekspor laporan gagal. Silakan ulangi. | Export Action |
| `SERVER_ERROR` | 500 | Terjadi kesalahan sistem. Coba ulangi. | Global Error |

### 20.5 Mapping Route Frontend ke API Backend

| Route Frontend | API Backend Minimal | Catatan |
|---|---|---|
| `/login` | `POST /api/auth/login` | Public route |
| `/dashboard` | `GET /api/dashboard/summary` | Data laba disembunyikan untuk Kasir |
| `/kasir` | `GET /api/products/search`, `POST /api/sales` | Checkout wajib memakai idempotency key |
| `/riwayat-transaksi` | `GET /api/sales`, `GET /api/sales/:id` | Response disesuaikan role |
| `/retur-penjualan` | `GET /api/sales/:id/returnable-items`, `POST /api/sales-returns` | Retur mengacu alokasi batch |
| `/produk` | `/api/products` | Manager kelola, Kasir lihat terbatas jika disediakan |
| `/kategori` | `/api/categories` | Manager |
| `/supplier` | `/api/suppliers` | Manager |
| `/satuan` | `/api/units`, `/api/products/:productId/units` | Manager |
| `/batch` | `/api/batches` | HPP hanya Manager/Pemilik |
| `/pemesanan` | `/api/purchase-orders` | Apoteker/Manager |
| `/pemesanan/tambah` | `POST /api/purchase-orders` | Apoteker/Manager |
| `/pemesanan/:id` | `GET /api/purchase-orders/:id` | Apoteker/Manager |
| `/pemesanan/:id/cetak` | `POST /api/purchase-orders/:id/print-preview` | Cetak PO tanpa integrasi printer kompleks |
| `/pembelian` | `/api/purchases` | Manager |
| `/pembelian/dari-po/:poId` | `GET /api/purchases/create-from-po/:poId` | Draft pembelian dari PO |
| `/pelayanan/resep` | `/api/prescriptions` | Apoteker/Manager |
| `/pelayanan/resep/tambah` | `POST /api/prescriptions` | Apoteker/Manager |
| `/pelayanan/resep/:id` | `GET /api/prescriptions/:id` | Apoteker/Manager |
| `/pelayanan/konseling` | `/api/counseling-records` | Apoteker/Manager |
| `/pelayanan/riwayat` | `/api/prescriptions`, `/api/counseling-records` | Riwayat pelayanan |
| `/stok` | `/api/stock` | Kasir terbatas, Manager penuh |
| `/mutasi-stok` | `/api/stock/mutations` | Manager |
| `/koreksi-stok` | `POST /api/stock/adjustments` | Manager, wajib alasan |
| `/retur-pembelian` | `/api/purchase-returns` | Manager |
| `/laporan/penjualan` | `/api/reports/sales` | Manager/Pemilik |
| `/laporan/laba` | `/api/reports/profit` | Manager/Pemilik, Kasir ditolak |
| `/laporan/stok` | `/api/reports/stock` | Manager/Pemilik |
| `/laporan/expired` | `/api/reports/expired-batches` | Manager/Pemilik |
| `/export` | `/api/exports/*` | Manager/Pemilik |
| `/users` | `/api/users` | Manager |
| `/settings` | `/api/settings` | Manager |

---

## 21. API Endpoint Utama

### 21.1 Auth API

```text
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me
```

### 21.2 User API

```text
GET    /api/users
POST   /api/users
GET    /api/users/:id
PATCH  /api/users/:id
PATCH  /api/users/:id/deactivate
```

### 21.3 Product API

```text
GET    /api/products
POST   /api/products
GET    /api/products/:id
PATCH  /api/products/:id
PATCH  /api/products/:id/deactivate
GET    /api/products/search
```

### 21.4 Category API

```text
GET    /api/categories
POST   /api/categories
PATCH  /api/categories/:id
PATCH  /api/categories/:id/deactivate
```

### 21.5 Supplier API

```text
GET    /api/suppliers
POST   /api/suppliers
PATCH  /api/suppliers/:id
PATCH  /api/suppliers/:id/deactivate
```

### 21.6 Unit Conversion API

```text
GET    /api/units
POST   /api/units
GET    /api/products/:productId/units
POST   /api/products/:productId/units
PATCH  /api/product-units/:id
PATCH  /api/product-units/:id/deactivate
```

### 21.7 Batch API

```text
GET    /api/batches
POST   /api/batches
GET    /api/batches/:id
PATCH  /api/batches/:id
PATCH  /api/batches/:id/deactivate
GET    /api/batches/expired-alert
```

### 21.8 Purchase API

```text
GET    /api/purchases
GET    /api/purchases/create-from-po/:poId
POST   /api/purchases
GET    /api/purchases/:id
POST   /api/purchases/:id/finalize
```

### 21.9 Purchase Order API

```text
GET    /api/purchase-orders
POST   /api/purchase-orders
GET    /api/purchase-orders/:id
PATCH  /api/purchase-orders/:id
POST   /api/purchase-orders/:id/print-preview
POST   /api/purchase-orders/:id/convert-to-purchase
PATCH  /api/purchase-orders/:id/cancel
```

### 21.10 Prescription API

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

### 21.11 Counseling API

```text
GET    /api/counseling-records
POST   /api/counseling-records
GET    /api/counseling-records/:id
PATCH  /api/counseling-records/:id
```

### 21.12 Sales API

```text
GET    /api/sales
POST   /api/sales
GET    /api/sales/:id
GET    /api/sales/:id/returnable-items
POST   /api/sales/preview
```

### 21.13 Sales Return API

```text
GET    /api/sales-returns
POST   /api/sales-returns
GET    /api/sales-returns/:id
```

### 21.14 Purchase Return API

```text
GET    /api/purchase-returns
POST   /api/purchase-returns
GET    /api/purchase-returns/:id
```

### 21.12 Stock API

```text
GET    /api/stock
GET    /api/stock/:productId
GET    /api/stock/mutations
POST   /api/stock/adjustments
GET    /api/stock/low-stock
```

### 21.13 Dashboard API

```text
GET    /api/dashboard/summary
GET    /api/dashboard/low-stock
GET    /api/dashboard/expired-batches
GET    /api/dashboard/recent-transactions
```

### 21.14 Report API

```text
GET    /api/reports/sales
GET    /api/reports/profit
GET    /api/reports/stock
GET    /api/reports/expired-batches
```

### 21.15 Export API

```text
GET    /api/exports/reports/sales.xlsx
GET    /api/exports/reports/profit.xlsx
GET    /api/exports/reports/sales.pdf
GET    /api/exports/reports/profit.pdf
```

### 21.16 Settings API

```text
GET    /api/settings
PATCH  /api/settings
```

---

## 22. Payload API Penting

### 22.0 Payload Manajemen User

#### POST `/api/users`

Request:

```json
{
  "name": "Kasir 01",
  "username": "kasir01",
  "email": "kasir01@example.com",
  "password": "password-kuat",
  "roleId": "uuid-role-kasir",
  "isActive": true
}
```

Response:

```json
{
  "success": true,
  "message": "User berhasil dibuat",
  "data": {
    "id": "uuid",
    "name": "Kasir 01",
    "username": "kasir01",
    "email": "kasir01@example.com",
    "role": "KASIR",
    "isActive": true
  }
}
```

Aturan:

1. Hanya Manager yang dapat membuat, mengubah, dan menonaktifkan user.
2. Password tidak boleh pernah dikembalikan pada response API.
3. User nonaktif tidak dapat login.
4. Perubahan role berlaku setelah sesi diperbarui atau pengguna login ulang.
5. Audit log harus mencatat pembuatan, perubahan role, dan penonaktifan user.

### 22.1 POST `/api/auth/login`

Request:

```json
{
  "identifier": "kasir01",
  "password": "password"
}
```

Response:

```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Kasir 01",
      "role": "KASIR"
    },
    "accessToken": "jwt-token"
  }
}
```

Jika refresh token disimpan pada httpOnly cookie, jangan kirim refresh token dalam response body.

### 22.2 POST `/api/purchases`

Request:

```json
{
  "supplierId": "uuid",
  "purchaseDate": "2026-06-02T10:00:00+08:00",
  "invoiceNumber": "INV-001",
  "items": [
    {
      "productId": "uuid",
      "productUnitId": "uuid",
      "batchNumber": "BATCH-001",
      "expiredDate": "2027-06-02",
      "qtyPurchaseUnit": 10,
      "purchasePrice": 50000,
      "sellingPrices": [
        {
          "productUnitId": "uuid",
          "sellingPrice": 6000
        }
      ]
    }
  ]
}
```

### 22.3 POST `/api/sales`

Request:

```json
{
  "customerName": "Umum",
  "paymentMethod": "CASH",
  "paidAmount": 50000,
  "discountType": "NOMINAL",
  "discountValue": 5000,
  "items": [
    {
      "productId": "uuid",
      "productUnitId": "uuid",
      "qtySaleUnit": 2,
      "note": "opsional"
    }
  ],
  "note": "Transaksi kasir"
}
```

Header:

```text
Idempotency-Key: uuid
```

Response untuk kasir:

```json
{
  "success": true,
  "message": "Transaksi berhasil",
  "data": {
    "saleId": "uuid",
    "saleNumber": "TRX-20260602-0001",
    "subtotal": 30000,
    "discountAmount": 5000,
    "total": 25000,
    "paidAmount": 50000,
    "changeAmount": 25000,
    "items": [
      {
        "productName": "Paracetamol 500mg",
        "unitName": "strip",
        "qtySaleUnit": 2,
        "unitPrice": 10000,
        "subtotal": 20000
      }
    ]
  }
}
```

Response untuk Manager boleh memuat data batch, HPP, dan laba jika endpoint memang ditujukan untuk laporan atau detail manajerial.

### 22.4 POST `/api/sales-returns`

Request:

```json
{
  "saleId": "uuid",
  "reason": "Barang dikembalikan pelanggan",
  "items": [
    {
      "saleBatchAllocationId": "uuid",
      "qtyBaseReturned": 10
    }
  ]
}
```

Header:

```text
Idempotency-Key: uuid
```

---

## 23. Error Code Sistem

| Code | HTTP | Deskripsi |
|---|---:|---|
| VALIDATION_ERROR | 400 | Validasi input gagal |
| UNAUTHORIZED | 401 | Belum login atau token tidak valid |
| ACCESS_DENIED | 403 | Role tidak memiliki akses |
| SESSION_EXPIRED | 401 | Sesi berakhir |
| DATA_NOT_FOUND | 404 | Data tidak ditemukan |
| DUPLICATE_DATA | 409 | Data duplikat |
| DUPLICATE_CODE | 409 | Kode sudah digunakan |
| DUPLICATE_BARCODE | 409 | Barcode sudah digunakan |
| PRODUCT_INACTIVE | 422 | Produk tidak aktif |
| UNIT_INVALID | 422 | Satuan tidak valid |
| BATCH_EXPIRED | 422 | Batch sudah expired |
| VALID_BATCH_NOT_AVAILABLE | 422 | Batch aktif tidak tersedia |
| STOCK_NOT_ENOUGH | 422 | Stok tidak cukup |
| STOCK_NEGATIVE_NOT_ALLOWED | 422 | Operasi membuat stok negatif |
| CART_EMPTY | 422 | Keranjang kosong |
| DISCOUNT_EXCEEDS_SUBTOTAL | 422 | Diskon melebihi subtotal |
| CASH_NOT_ENOUGH | 422 | Pembayaran cash kurang |
| RETURN_QTY_EXCEEDS_AVAILABLE | 422 | Qty retur melebihi sisa retur |
| IDEMPOTENCY_CONFLICT | 409 | Idempotency key dipakai untuk payload berbeda |
| TRANSACTION_CONFLICT | 409 | Data berubah saat transaksi |
| EXPORT_FAILED | 500 | Ekspor gagal |
| SERVER_ERROR | 500 | Kesalahan server |

---

## 24. Frontend Integration Rules

### 24.1 Data yang Boleh Dihitung Frontend

Frontend boleh menghitung estimasi:

```text
estimatedSubtotal
estimatedDiscount
estimatedTotal
estimatedChange
estimatedStockAvailability
```

### 24.2 Data yang Tidak Boleh Dihitung Final oleh Frontend

Frontend tidak boleh menghitung final:

```text
batch final
FEFO final
HPP final
laba final
diskon alokasi final
mutasi stok final
stok akhir final
refund final
```

### 24.3 State Keranjang Kasir

State lokal kasir:

```ts
type CartItem = {
  productId: string;
  productCode: string;
  productName: string;
  selectedProductUnitId: string;
  selectedUnitName: string;
  conversionToBase: number;
  qtySaleUnit: number;
  estimatedUnitPrice: number;
  estimatedSubtotal: number;
  note?: string;
};
```

### 24.4 Query Invalidation Frontend

| Aksi | Query yang Harus Di-invalidate |
|---|---|
| Simpan transaksi | products, stock, dashboard, sales, reports |
| Pembelian supplier | batches, stock, purchases, dashboard |
| Retur penjualan | stock, sales, sales-returns, reports, dashboard |
| Retur pembelian | stock, purchase-returns, dashboard |
| Koreksi stok | stock, stock-mutations, dashboard |
| Update produk | products, cashier search |
| Update batch | batches, stock, cashier search |
| Create/update user | users, auth me jika role aktif berubah |
| Update settings | settings, dashboard, reports export metadata |

### 24.5 Sinkronisasi UI/UX Flow ke Frontend Integration

SDD ini menetapkan aturan integrasi UI/UX berikut agar implementasi tidak menyimpang dari flow yang sudah dirancang.

| Area UI/UX | Aturan Teknis di SDD | Dampak Implementasi |
|---|---|---|
| Login | Auth API + ProtectedRoute + RoleRoute | Redirect berdasarkan role |
| Dashboard | Query dashboard dari backend | Laba tidak dikirim ke Kasir |
| Kasir | Cart lokal + checkout backend | Transaksi normal selesai satu halaman |
| Pencarian produk | Debounce + query backend | Produk nonaktif tidak dapat dipilih |
| Keranjang | State lokal sementara | Tidak mengurangi stok sebelum submit |
| Pembayaran | Estimasi frontend, final backend | Cash wajib cukup, non-cash manual |
| Simpan transaksi | `POST /api/sales` + `Idempotency-Key` | Cegah transaksi ganda |
| Retur penjualan | Mengacu `saleBatchAllocationId` | Stok kembali ke batch asal |
| Laporan | Query backend berdasarkan filter | Laba dari transaksi historis |
| Export | API export mengikuti filter | File sesuai data laporan |
| Error state | Mapping error code ke pesan UI | Error tidak mentah/teknis |
| Empty state | Response kosong ditampilkan sebagai arahan | Pengguna tahu langkah berikutnya |
| Loading state | Semua mutation/query async punya indikator | Tombol submit disabled saat proses |
| Responsive | Desktop/tablet/mobile mengikuti UI/UX Flow | Tidak ada horizontal scroll tidak perlu |

### 24.6 Aturan Idempotency dari Sisi Frontend

Frontend wajib mengikuti aturan berikut pada transaksi penting:

1. Membuat `idempotencyKey` ketika user mulai menekan tombol `Simpan Transaksi`, `Proses Retur Penjualan`, atau `Proses Retur Pembelian`.
2. Menggunakan key yang sama selama request yang sama masih diproses atau diulang karena retry jaringan.
3. Menonaktifkan tombol submit selama request berjalan.
4. Menghapus key setelah response sukses dan state UI sudah direset.
5. Membuat key baru jika user mengubah payload setelah validasi bisnis gagal.
6. Menampilkan error `IDEMPOTENCY_CONFLICT` sebagai error transaksi, bukan sekadar toast ringan.

Contoh state frontend:

```ts
type CheckoutState = {
  isSubmitting: boolean;
  idempotencyKey: string | null;
  lastErrorCode?: string;
};
```

### 24.7 Aturan Timezone UI

1. Topbar menampilkan jam realtime `Asia/Makassar`.
2. Jam frontend hanya informasi visual.
3. Waktu final transaksi, pembelian, retur, mutasi stok, dan audit log berasal dari backend.
4. Database menyimpan timestamp dalam UTC.
5. Semua filter laporan harian, mingguan, bulanan, tahunan, dan export dihitung berdasarkan batas hari `Asia/Makassar`.
6. Frontend wajib menggunakan utilitas format tanggal yang konsisten, misalnya `formatDateTimeAsiaMakassar()`.

### 24.8 Data Sensitif yang Wajib Disanitasi untuk Kasir

Field berikut tidak boleh muncul di response API untuk role Kasir dan tidak boleh disimpan di state frontend Kasir:

```text
hpp
hppBase
totalHpp
hargaModal
purchasePrice
profit
totalProfit
margin
purchasePrice
purchaseSubtotal
supplierCost
profitCorrection
```

Jika endpoint yang sama dipakai oleh Manager dan Kasir, backend harus melakukan transformasi response berdasarkan role. Frontend tetap menyembunyikan UI sensitif, tetapi tidak boleh menjadi satu-satunya pagar keamanan.

---

## 25. Desain Dashboard dan Reporting

### 25.1 Dashboard Query Source

| Komponen | Sumber Data |
|---|---|
| Omzet hari ini | `sales.total` status FINAL dikurangi retur |
| Laba hari ini | `sale_batch_allocations.profit_allocated` dikurangi retur |
| Laba minggu ini | agregasi periode |
| Laba bulan ini | agregasi periode |
| Laba tahun ini | agregasi periode |
| Transaksi hari ini | count sales |
| Stok kritis | `v_product_stock_summary` |
| Batch mendekati expired | `product_batches` |
| Transaksi terbaru | `sales` |

### 25.2 Laporan Laba

Sumber utama:

```text
sale_batch_allocations
sales
sales_return_items
sales_returns
```

Query konseptual:

```text
gross_revenue = sum(subtotal_allocated)
total_hpp = sum(hpp_allocated)
total_discount = sum(discount_allocated)
gross_profit = sum(profit_allocated)

return_revenue = sum(refund_amount)
return_hpp = sum(hpp_reversed)
return_profit = sum(profit_reversed)

net_revenue = gross_revenue - return_revenue
net_hpp = total_hpp - return_hpp
net_profit = gross_profit - return_profit
```

Rule:

1. Retur tidak boleh menghapus transaksi asli.
2. Retur harus menjadi koreksi negatif pada laporan.
3. Laporan harus bisa menjelaskan angka, bukan hanya menampilkan angka.
4. Laporan laba tidak boleh tersedia untuk Kasir.

---

## 26. Security Design

### 26.1 Authentication

| Area | Desain |
|---|---|
| Login | Username/email + password |
| Password | Hash dengan bcrypt atau argon2 |
| Access token | JWT umur pendek |
| Refresh token | Disimpan sebagai hash di database |
| Logout | Revoke refresh token |
| User nonaktif | Tidak bisa login |
| Session expiry | Wajib ada |

### 26.2 Password Rule

1. Jangan menyimpan password plaintext.
2. Jangan mengembalikan password hash ke frontend.
3. Jangan menulis password dalam log.
4. Gunakan hashing aman.

### 26.3 Authorization

Backend harus memiliki:

```text
JwtAuthGuard
RolesGuard
PermissionGuard opsional
```

Endpoint sensitif wajib memeriksa role:

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

### 26.4 Data Protection

| Risiko | Mitigasi |
|---|---|
| Kasir melihat HPP/laba | API tidak mengirim field HPP/laba ke role kasir |
| Manipulasi harga dari frontend | Backend mengambil harga final dari batch |
| Manipulasi stok dari frontend | Backend validasi ulang stok |
| SQL injection | Gunakan ORM/query parameterized |
| Data hilang | Gunakan soft delete untuk data historis |
| Race condition stok | Gunakan transaksi database dan row lock |
| Error bocor ke user | Gunakan pesan error aman |
| Transaksi ganda | Gunakan idempotency key |

---

## 27. Concurrency dan Transaction Safety

### 27.1 Masalah yang Harus Dicegah

| Masalah | Contoh | Mitigasi |
|---|---|---|
| Overselling | Dua kasir menjual batch sama bersamaan | Row-level lock |
| Stock negative | Stok 5 dijual 10 | Constraint dan validasi |
| Partial transaction | Sale tersimpan tapi stok gagal berkurang | Database transaction |
| Duplicate sale number | Nomor transaksi sama | Unique constraint |
| Double submit | Kasir klik dua kali | Idempotency key |
| Retur ganda | Item sama diretur lebih dari qty | Lock alokasi dan validasi |

### 27.2 Nomor Dokumen

Nomor dibuat server-side.

```text
TRX-YYYYMMDD-0001
PUR-YYYYMMDD-0001
SR-YYYYMMDD-0001
PR-YYYYMMDD-0001
```

Rule:

1. Nomor harus unik.
2. Nomor dibuat backend.
3. Jika terjadi konflik, sistem menghasilkan nomor berikutnya.
4. Jangan membuat nomor hanya dari frontend.

---

## 28. Testing Strategy

### 28.1 Unit Test Backend

| Service | Test Wajib |
|---|---|
| FefoService | Memilih batch expired terdekat |
| FefoService | Mengabaikan batch expired |
| FefoService | Split batch jika stok batch pertama kurang |
| DiscountService | Diskon persen |
| DiscountService | Diskon nominal |
| DiscountService | Alokasi diskon proporsional |
| ProfitService | Menghitung HPP dan laba detail |
| SalesService | Menolak stok tidak cukup |
| SalesService | Menghitung total dan kembalian |
| StockService | Mencegah stok negatif |
| ReturnService | Menolak retur berlebih |
| ReportService | Menghitung laba dari detail transaksi |

### 28.2 Integration Test Backend

| Scenario | Ekspektasi |
|---|---|
| Pembelian supplier | Batch dibuat, stok bertambah, mutasi tercatat |
| Penjualan normal | Sale tersimpan, stok berkurang, mutasi tercatat |
| Penjualan multi-batch | Split allocation dibuat |
| Diskon transaksi | Diskon dialokasikan ke detail |
| Retur penjualan | Stok kembali ke batch asal |
| Retur pembelian | Stok batch berkurang |
| Koreksi stok | Mutasi koreksi tercatat |
| Laporan laba | Angka berasal dari detail transaksi |
| Double submit | Tidak membuat transaksi ganda |
| Concurrent sale | Tidak membuat stok negatif |

### 28.3 Frontend Test

| Area | Test |
|---|---|
| Login | Login dan redirect role |
| Permission | Kasir tidak melihat laporan laba |
| Cart store | Tambah, ubah qty, hapus item |
| Payment panel | Cash kurang ditolak |
| Submit sale | Payload benar dikirim |
| Error UI | Error stok ditampilkan jelas |
| Responsive | Tidak ada horizontal scroll tidak perlu |

### 28.4 E2E Test

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

---

## 29. Deployment Design

### 29.1 Environment

| Environment | Fungsi |
|---|---|
| Development | Pengembangan lokal |
| Staging | Uji sebelum produksi |
| Production | Sistem operasional |

### 29.2 Environment Variables Backend

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pos_apotek_risyah
JWT_ACCESS_SECRET=change_me
JWT_REFRESH_SECRET=change_me
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
APP_TIMEZONE=Asia/Makassar
EXPORT_DIR=storage/exports
```

### 29.3 Environment Variables Frontend

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_TIMEZONE=Asia/Makassar
```

### 29.4 Deployment V1

```text
Docker
PostgreSQL managed atau PostgreSQL di VPS
Nginx reverse proxy
HTTPS
Backup database harian
```

### 29.5 Migration Strategy

| Step | Aksi |
|---|---|
| 1 | Buat Prisma schema dan migration |
| 2 | Jalankan migration di development |
| 3 | Seed role awal |
| 4 | Seed user manager awal |
| 5 | Uji transaksi stok |
| 6 | Jalankan migration staging |
| 7 | Backup production sebelum migration |
| 8 | Jalankan migration production |
| 9 | Uji smoke test setelah migration |

### 29.6 Backup dan Recovery

| Data | Strategi |
|---|---|
| Database | Backup harian |
| File export | Bisa dibuat ulang dari database |
| Log | Simpan sesuai kebutuhan audit |
| Migration | Version control |

Recovery rule:

1. Database harus dapat dipulihkan dari backup terbaru.
2. Backup harus diuji restore secara berkala.
3. Backup sebelum migration besar wajib dilakukan.

Backup yang tidak pernah diuji restore sebenarnya bukan backup. Itu hanya ritual digital untuk menenangkan manusia yang terlalu percaya pada keberuntungan.

---

## 30. Performance Considerations

| Area | Strategi |
|---|---|
| Pencarian produk | Index pada name, code, barcode |
| FEFO | Index product_id, expired_date, current_stock |
| Dashboard | Query agregasi dengan index tanggal |
| Laporan | Filter tanggal dengan index |
| Mutasi stok | Index batch_id dan created_at |
| Export | Batasi rentang tanggal besar atau gunakan streaming |
| Kasir | Debounce pencarian produk |
| Riwayat transaksi | Pagination wajib |
| Concurrent transaction | Row lock dan idempotency |

Index wajib:

```sql
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category_id ON products(category_id);

CREATE INDEX idx_product_units_product_id ON product_units(product_id);

CREATE INDEX idx_batches_product_id ON product_batches(product_id);
CREATE INDEX idx_batches_expired_date ON product_batches(expired_date);
CREATE INDEX idx_batches_fefo ON product_batches(product_id, expired_date, received_at, current_stock_base);

CREATE INDEX idx_sales_sale_time ON sales(sale_time);
CREATE INDEX idx_sales_cashier_id ON sales(cashier_id);
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);

CREATE INDEX idx_sale_allocations_sale_item_id ON sale_batch_allocations(sale_item_id);
CREATE INDEX idx_sale_allocations_batch_id ON sale_batch_allocations(batch_id);

CREATE INDEX idx_stock_mutations_batch_id ON stock_mutations(batch_id);
CREATE INDEX idx_stock_mutations_product_id ON stock_mutations(product_id);
CREATE INDEX idx_stock_mutations_created_at ON stock_mutations(created_at);

CREATE INDEX idx_purchases_purchase_date ON purchases(purchase_date);
CREATE INDEX idx_sales_returns_return_time ON sales_returns(return_time);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

---

## 31. Data Seed Awal

### 31.1 Roles

```text
KASIR
MANAGER
```

Opsional:

```text
PEMILIK
```

### 31.2 Units

```text
tablet
kaplet
kapsul
strip
box
botol
tube
sachet
biji
pcs
```

### 31.3 Manager Awal

```text
username: admin
role: MANAGER
password: wajib diganti setelah login pertama
```

### 31.4 App Settings

```text
timezone: Asia/Makassar
currency: IDR
expired_alert_days: 30
```

---

## 32. Guardrail Implementasi Database

AI coding tidak boleh:

1. Menghapus tabel `sale_batch_allocations`.
2. Menghapus tabel `stock_mutations`.
3. Menghapus tabel `idempotency_keys` jika transaksi sudah memakai proteksi double submit.
4. Menghitung stok hanya dari `products`.
5. Mengabaikan `current_stock_base` pada batch.
6. Mengizinkan `current_stock_base` negatif.
7. Menghapus data historis dengan hard delete.
8. Menyimpan password plaintext.
9. Menyimpan refresh token plaintext.
10. Menghitung laba dari `products` atau `batch_unit_prices` terbaru.
11. Mengubah transaksi lama saat harga jual batch berubah.
12. Mengizinkan retur tanpa referensi alokasi batch.
13. Mengizinkan pembelian tanpa batch.
14. Menjalankan penjualan tanpa database transaction.
15. Menjalankan retur tanpa database transaction.
16. Menjalankan pembelian tanpa database transaction.
17. Membuat endpoint laporan laba untuk role Kasir.

---

## 33. Guardrail Implementasi API

AI coding tidak boleh:

1. Mengirim `hppBase`, `hppAllocated`, atau `profitAllocated` ke Kasir.
2. Menerima harga final dari frontend sebagai kebenaran tanpa validasi backend.
3. Menerima batch final dari frontend sebagai kebenaran transaksi.
4. Mengizinkan frontend mengurangi stok langsung.
5. Mengembalikan stack trace mentah ke pengguna.
6. Mengizinkan request tanpa role pada endpoint internal.
7. Mengizinkan double submit transaksi membuat dua transaksi identik.
8. Mengabaikan pagination pada endpoint list besar.
9. Mengabaikan filter tanggal pada laporan.
10. Mengabaikan timezone tampilan.
11. Menggunakan `Asia/Jakarta` jika sistem operasional sudah ditetapkan `Asia/Makassar`.
12. Mencampur `snake_case` dan `camelCase` dalam response API tanpa aturan mapping.

---

## 34. Guardrail Implementasi Frontend

AI coding tidak boleh:

1. Menampilkan HPP/laba pada role Kasir.
2. Membuat halaman kasir bergantung pada data batch final dari frontend.
3. Menganggap keranjang sebagai transaksi final.
4. Menghilangkan validasi backend karena sudah ada validasi frontend.
5. Membuat tombol simpan transaksi tetap aktif saat submit sedang berjalan.
6. Membuat layout kasir memunculkan horizontal scroll tidak perlu.
7. Menyembunyikan error validasi tanpa pesan jelas.
8. Menggunakan waktu browser sebagai waktu transaksi final.
9. Mengubah istilah `produk`, `batch`, `stok`, `HPP`, `laba` secara tidak konsisten.
10. Membuat fitur out of scope hanya karena terlihat mudah.
11. Menyimpan transaksi final di local storage.
12. Mengirim HPP, laba, batch final, atau diskon alokasi final dari frontend.

---

## 35. Traceability SDD ke Dokumen Turunan

| SDD Area | Dokumen Terkait | Keterangan |
|---|---|---|
| Stack Frontend | 06_FRONTEND_POS_APOTEK.md | React, Vite, TypeScript, Tailwind, shadcn/ui |
| Stack Backend | 07_BACKEND_POS_APOTEK.md | NestJS, TypeScript, PostgreSQL, Prisma |
| Auth Design | 07_BACKEND_POS_APOTEK.md | JWT, refresh token, RBAC |
| Frontend State | 06_FRONTEND_POS_APOTEK.md | TanStack Query dan Zustand |
| Product DB/API | SRS, Backend, Frontend | Produk dan pencarian |
| Unit Conversion | SRS, Backend, Frontend | Satuan dan konversi |
| Batch DB/API | SRS, Backend | Batch, expired, HPP |
| Purchase Service/API | SRS, Backend | Pembelian supplier |
| Sales Service/API | SRS, Backend, Frontend | Kasir dan transaksi |
| FEFO Service | SRS, Backend | FEFO server-side |
| Split Allocation | SRS, Backend | Split multi-batch |
| Discount Service | SRS, Backend | Diskon dan alokasi |
| Return Service | SRS, Backend, Frontend | Retur penjualan dan pembelian |
| Stock Service | SRS, Backend | Stok dan mutasi |
| Dashboard API | Frontend, Backend | Dashboard |
| Report API | Backend, Frontend | Laporan penjualan dan laba |
| Export API | Backend, Frontend | Ekspor laporan |
| Security Design | Backend | Keamanan akses |
| Transaction Safety | Backend | Konsistensi data |
| Audit Design | Backend | Audit log dan mutasi stok |

### 35.1 Traceability Sinkronisasi UI/UX Flow

| UI/UX Flow | SDD Revisi Sinkron | Status |
|---|---|---|
| Login Flow | Auth API, protected route, role redirect | Sinkron |
| Sidebar berdasarkan role | Role dan Permission, Frontend Integration Rules | Sinkron |
| Halaman Kasir | Sales Service, Cart State, Idempotency | Sinkron |
| Pencarian produk | Product API, cashier search, debounce frontend | Sinkron |
| Pembayaran | Payment method, cash validation, non-cash manual | Sinkron |
| Simpan transaksi | FEFO, split batch, idempotency, stock mutation | Sinkron |
| Riwayat transaksi | Sales API, sanitized response untuk Kasir | Sinkron |
| Retur penjualan | Sales Return Service, batch asal | Sinkron |
| Produk/Kategori/Supplier/Satuan | Master Data API dan role Manager | Sinkron |
| Batch | Product Batches, Batch Unit Prices, HPP role Manager | Sinkron |
| Pembelian | Purchase Service dan stock mutation masuk | Sinkron |
| Stok dan mutasi | Stock API, Stock Mutation Service | Sinkron |
| Koreksi stok | Stock Adjustment Service, Manager only | Sinkron |
| Laporan penjualan/laba/stok/expired | Report API dan Export API | Sinkron |
| Pengaturan | Settings API dan timezone display | Sinkron |
| Manajemen user | User API, Role Module, audit log | Ditambahkan pada SDD revisi |
| Empty/loading/error/success state | Error Code Mapping dan Frontend Integration Rules | Sinkron |
| Responsive behavior | Frontend route/layout dan UI/UX Flow | Sinkron |

---

## 36. Prioritas Implementasi V1

### 36.1 Prioritas Backend

| Urutan | Fitur |
|---:|---|
| 1 | Setup NestJS, PostgreSQL, Prisma, environment |
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

### 36.2 Prioritas Frontend

| Urutan | Fitur |
|---:|---|
| 1 | Setup React + Vite + TypeScript |
| 2 | Layout utama, sidebar, topbar |
| 3 | Login dan protected route |
| 4 | Role-based route dan menu |
| 5 | Halaman kasir |
| 6 | Keranjang kasir Zustand |
| 7 | Integrasi produk dan stok ke kasir |
| 8 | Submit transaksi ke backend |
| 9 | Riwayat transaksi dan detail |
| 10 | Produk, kategori, supplier, satuan |
| 11 | Batch dan pembelian |
| 12 | Retur penjualan |
| 13 | Stok dan mutasi stok |
| 14 | Dashboard dan laporan |
| 15 | Export jika diaktifkan |

---

## 37. Definition of Done SDD

SDD ini dianggap selesai jika:

- stack frontend dan backend sudah final;
- arsitektur modular monolith sudah jelas;
- layer frontend, backend, service, repository, dan database sudah terdefinisi;
- modul utama sudah dipisahkan;
- database utama sudah dirancang;
- relasi batch, stok, transaksi, retur, dan laporan sudah jelas;
- FEFO memiliki algoritma;
- split batch memiliki desain penyimpanan;
- diskon alokasi memiliki formula;
- retur sebagian memiliki formula koreksi;
- transaksi database atomic sudah dijelaskan;
- API utama sudah dirancang;
- API JSON menggunakan `camelCase`;
- database menggunakan `snake_case`;
- role dan permission sudah dijelaskan;
- error code sudah tersedia;
- timezone sudah konsisten pada `Asia/Makassar` untuk tampilan;
- testing strategy tersedia;
- deployment dasar tersedia;
- idempotency key tersedia untuk transaksi penting;
- guardrail untuk AI coding sudah jelas.

---

## 38. Prompt Eksekusi untuk AI Coding

Gunakan prompt berikut untuk implementasi sistem:

```text
Baca dan pahami dokumen berikut secara berurutan:
1. 01_PRD_POS_APOTEK.md
2. 02_SRS_POS_APOTEK.md
3. 03_SDD_SYSTEM_DESIGN_POS_APOTEK_REVISI_SINKRON.md
4. 06_FRONTEND_POS_APOTEK.md
5. 07_BACKEND_POS_APOTEK.md
6. 04_UI_UX_FLOW_POS_APOTEK.md jika tersedia
7. 05_TASK_BREAKDOWN_POS_APOTEK.md jika tersedia

Tugas:
Bangun sistem POS Apotek V1 dengan frontend React + Vite + TypeScript dan backend NestJS + TypeScript + PostgreSQL + Prisma.

Aturan utama:
- Backend adalah sumber kebenaran untuk stok, batch, FEFO, HPP, harga final transaksi, split batch, diskon alokasi, laba, retur, dan mutasi stok.
- Frontend hanya boleh menghitung estimasi subtotal, diskon, total, kembalian, dan ketersediaan stok.
- Semua proses penjualan, pembelian, retur, dan koreksi stok harus memakai database transaction.
- Stok wajib disimpan berdasarkan batch dalam satuan dasar.
- Penjualan wajib menerapkan FEFO server-side.
- Jika satu item penjualan memakai lebih dari satu batch, backend wajib membuat split batch allocation.
- Detail transaksi wajib menyimpan harga jual final, HPP final, diskon alokasi, dan laba.
- Retur penjualan wajib mengacu ke transaksi dan batch asal.
- Kasir tidak boleh mengakses HPP, laba, laporan laba, pengaturan harga, pembelian, dan koreksi stok.
- API JSON memakai camelCase, sedangkan database memakai snake_case.
- Timezone tampilan memakai Asia/Makassar, sedangkan database menyimpan timestamp dalam UTC.
- Endpoint transaksi penting wajib memakai idempotency key.
- Jangan menambahkan fitur out of scope V1 seperti BPJS, payment gateway otomatis, multi-cabang, loyalty program, atau akuntansi lengkap.

Mulai dari setup project backend, konfigurasi environment, Prisma, database module, auth module, user/role module, RBAC guard, dan struktur modul. Setelah itu lanjutkan ke master data produk, satuan, supplier, batch, pembelian, mutasi stok, lalu transaksi penjualan FEFO sebagai prioritas utama.

Untuk frontend, mulai dari setup React + Vite + TypeScript, Tailwind CSS, shadcn/ui, routing, protected route, role route, layout utama, halaman login, halaman kasir, cart store Zustand, dan integrasi API menggunakan TanStack Query.
```

---

## 39. Kesimpulan

SDD versi revisi sinkron ini telah disinkronkan dengan PRD, SRS, UI/UX Flow, Frontend Specification, dan Backend Specification terbaru. Sistem POS Apotek V1 menggunakan arsitektur modular monolith dengan frontend React + Vite + TypeScript dan backend NestJS + TypeScript + PostgreSQL + Prisma.

Keputusan sistem paling penting adalah menjadikan backend sebagai sumber kebenaran untuk seluruh data kritis. Frontend tetap penting untuk pengalaman pengguna, tetapi tidak boleh mengambil keputusan final terkait stok, batch, FEFO, HPP, laba, diskon alokasi, retur, dan mutasi stok.

Desain ini menempatkan batch sebagai pusat stok, FEFO sebagai strategi penjualan obat, split batch sebagai rekam historis transaksi, mutasi stok sebagai audit, dan laporan laba sebagai hasil dari detail transaksi historis. Dengan rancangan ini, aplikasi tidak hanya terlihat seperti POS, tetapi memiliki peluang masuk akal untuk bertahan ketika digunakan di dunia nyata, tempat klik ganda, stok menipis, batch kedaluwarsa, dan manusia terburu-buru hidup berdampingan secara tidak harmonis.
