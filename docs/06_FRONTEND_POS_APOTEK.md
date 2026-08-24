---
document_name: "06_FRONTEND_ONLY_POS_APOTEK"
document_type: "Frontend Specification / Frontend Analysis"
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
  - "01_PRD_POS_APOTEK.md"
  - "02_SRS_POS_APOTEK.md"
  - "03_BACKEND_ANALYSIS_POS_APOTEK.md"
  - "04_UI_UX_FLOW_POS_APOTEK.md"
  - "05_TASK_BREAKDOWN_POS_APOTEK.md"
---

# FRONTEND ONLY - POS Apotek

## 0. Instruksi Pembacaan untuk AI Coding

Dokumen ini adalah file **khusus frontend** untuk sistem **POS Apotek**.

Dokumen ini hanya membahas:

- arsitektur frontend;
- stack frontend;
- struktur folder frontend;
- routing halaman;
- layout aplikasi;
- komponen UI;
- state management;
- validasi input di sisi frontend;
- role-based UI;
- integrasi API dari sudut pandang frontend;
- responsivitas tampilan;
- error handling UI;
- guardrail implementasi frontend.

Dokumen ini **tidak membahas backend secara mendalam**.  
Backend hanya disebut sebagai batas integrasi API karena frontend tetap harus berkomunikasi dengan backend.

AI coding wajib memahami batas berikut:

1. Frontend **bukan sumber kebenaran final** untuk stok, batch, FEFO, HPP, laba, diskon alokasi, retur, atau laporan.
2. Frontend hanya boleh menampilkan **estimasi sementara** untuk subtotal, diskon, total, kembalian, dan ketersediaan stok.
3. Backend tetap menjadi pihak yang menentukan hasil final transaksi.
4. Frontend harus mendukung alur kasir yang cepat, jelas, dan minim perpindahan halaman.
5. Frontend harus mematuhi role pengguna, terutama pembatasan akses kasir terhadap harga modal, HPP, margin, laba, pembelian, koreksi stok, dan laporan keuangan.
6. Harga jual yang tampil di kasir adalah harga jual final rupiah bulat dari backend, bukan hasil perhitungan frontend dari harga modal.
7. Frontend tidak boleh menjadikan PO sebagai penambah stok dan tidak boleh mengurangi stok saat resep dibuat.
8. Frontend harus menampilkan hanya satuan jual aktif kepada Kasir.
9. File ini harus dipisahkan dari file backend agar implementasi tidak bercampur seperti proyek yang sudah menyerah pada folder `misc`.

---

## 1. Tujuan Dokumen

Tujuan dokumen ini adalah memberikan rancangan frontend POS Apotek agar dapat digunakan sebagai dasar pengembangan antarmuka aplikasi.

Frontend harus mampu menyediakan pengalaman penggunaan yang:

- cepat untuk transaksi kasir;
- jelas untuk pengelolaan produk, batch, stok, pembelian, dan retur;
- aman dari sisi tampilan berdasarkan role;
- responsif pada desktop, laptop, tablet, dan mobile terbatas;
- konsisten dengan kebutuhan PRD dan SRS;
- mudah dikembangkan oleh AI coding atau developer manusia.

Frontend harus mendukung modul utama POS Apotek tanpa mengambil alih logika bisnis kritis milik backend.

---

## 2. Prinsip Utama Frontend

| ID | Prinsip | Penjelasan |
|---|---|---|
| FE-PRINCIPLE-001 | Cepat untuk kasir | Halaman kasir harus meminimalkan klik dan perpindahan halaman |
| FE-PRINCIPLE-002 | Backend sebagai sumber kebenaran | Frontend hanya menampilkan estimasi, backend menentukan hasil final |
| FE-PRINCIPLE-003 | Role-aware UI | Menu dan aksi harus mengikuti role pengguna |
| FE-PRINCIPLE-004 | Data historis tidak dimanipulasi dari UI | Transaksi final, retur, batch, dan mutasi stok tidak boleh dihapus sembarangan |
| FE-PRINCIPLE-005 | Responsif tanpa horizontal scroll | Layout harus menyesuaikan ukuran layar |
| FE-PRINCIPLE-006 | Error harus jelas | Pengguna harus tahu kesalahan terjadi pada input apa |
| FE-PRINCIPLE-007 | Komponen reusable | Tabel, form, modal, badge, button, dan input harus reusable |
| FE-PRINCIPLE-008 | Pisahkan server state dan local state | Data API dan state UI lokal tidak boleh dicampur sembarangan |
| FE-PRINCIPLE-009 | Validasi frontend bukan pengganti backend | Frontend memvalidasi awal, backend tetap validasi final |
| FE-PRINCIPLE-010 | UI tidak boleh menampilkan HPP/laba kepada kasir | Informasi sensitif hanya untuk Manager/Pemilik |
| FE-PRINCIPLE-011 | Harga kasir rupiah bulat | Kasir hanya melihat harga jual final yang ditetapkan Manager |
| FE-PRINCIPLE-012 | PO bukan stok | UI PO tidak boleh menampilkan stok bertambah sebelum pembelian final |
| FE-PRINCIPLE-013 | Resep bukan checkout | UI resep tidak boleh mengurangi stok sebelum checkout kasir berhasil |
| FE-PRINCIPLE-014 | Satuan jual aktif | Kasir hanya melihat satuan jual aktif dari backend |

---

## 3. Rekomendasi Stack Frontend

Stack frontend yang direkomendasikan:

```text
React + Vite + TypeScript
Tailwind CSS
shadcn/ui
TanStack Query
Zustand
React Hook Form
Zod
Recharts
Axios atau Fetch Wrapper
```

### 3.1 Rincian Stack

| Komponen | Rekomendasi | Fungsi |
|---|---|---|
| UI Library | React | Membangun UI berbasis komponen |
| Build Tool | Vite | Build dan development server yang cepat |
| Bahasa | TypeScript | Menjaga tipe data produk, batch, transaksi, dan laporan |
| Styling | Tailwind CSS | Membuat layout responsif dan konsisten |
| UI Component | shadcn/ui | Komponen modern yang mudah dikustomisasi |
| Server State | TanStack Query | Fetching, cache, refetch, mutation, dan invalidation data API |
| Local State | Zustand | Keranjang kasir, sidebar, modal, dan state UI ringan |
| Form | React Hook Form | Mengelola form produk, pembelian, batch, retur |
| Schema Validation | Zod | Validasi schema form di frontend |
| Chart | Recharts | Grafik dashboard dan laporan |
| HTTP Client | Axios atau fetch wrapper | Komunikasi dengan backend API |

### 3.2 Alasan Pemilihan Stack

React cocok karena POS Apotek membutuhkan UI interaktif berbasis komponen seperti keranjang, kartu produk, tabel laporan, modal retur, dan form pembelian.

TypeScript wajib digunakan agar struktur data transaksi, batch, satuan, harga, dan laporan tidak mudah salah. Sistem POS Apotek memiliki banyak data numerik dan relasional, sehingga penggunaan JavaScript murni terlalu berisiko.

TanStack Query dipilih karena data seperti produk, stok, transaksi, batch, laporan, dan dashboard berasal dari backend. Data tersebut harus di-cache, di-refresh, dan di-invalidate setelah mutation seperti simpan transaksi, pembelian, atau retur.

Zustand dipilih untuk state lokal yang ringan, terutama keranjang kasir, status sidebar, modal, dan filter sementara.

React Hook Form dan Zod dipilih agar validasi form tetap konsisten, mudah diuji, dan tidak membuat form besar menjadi lambat.

---

## 4. Ruang Lingkup Frontend V1

### 4.1 In Scope Frontend

| ID | Modul Frontend | Status |
|---|---|---|
| FE-SCOPE-001 | Login dan logout | Wajib |
| FE-SCOPE-002 | Protected route berdasarkan role | Wajib |
| FE-SCOPE-003 | Layout utama aplikasi | Wajib |
| FE-SCOPE-004 | Sidebar responsif | Wajib |
| FE-SCOPE-005 | Dashboard Manager | Wajib |
| FE-SCOPE-006 | Halaman kasir | Wajib |
| FE-SCOPE-007 | Keranjang transaksi | Wajib |
| FE-SCOPE-008 | Diskon transaksi | Wajib |
| FE-SCOPE-009 | Metode pembayaran dan kembalian | Wajib |
| FE-SCOPE-010 | Riwayat transaksi | Wajib |
| FE-SCOPE-011 | Retur penjualan | Wajib |
| FE-SCOPE-012 | Produk dan kategori | Wajib |
| FE-SCOPE-013 | Supplier | Wajib |
| FE-SCOPE-014 | Satuan dan konversi | Wajib |
| FE-SCOPE-014A | Pembatasan satuan jual aktif | Wajib |
| FE-SCOPE-015 | Batch obat | Wajib |
| FE-SCOPE-016 | Pembelian supplier | Wajib |
| FE-SCOPE-016A | Pemesanan / PO obat | Disarankan |
| FE-SCOPE-016B | Pembelian dari PO, faktur, diskon pembelian, dan PPN/non-PPN | Disarankan |
| FE-SCOPE-017 | Stok dan mutasi stok | Wajib |
| FE-SCOPE-017A | Pelayanan Resep Dasar | Disarankan |
| FE-SCOPE-017B | Konseling Dasar | Disarankan kuat |
| FE-SCOPE-018 | Retur pembelian | Disarankan |
| FE-SCOPE-019 | Laporan penjualan | Wajib |
| FE-SCOPE-020 | Laporan laba | Wajib untuk Manager |
| FE-SCOPE-021 | Ekspor laporan | Disarankan |
| FE-SCOPE-022 | Pengaturan profil apotek | Disarankan |
| FE-SCOPE-023 | Manajemen user | Disarankan untuk Manager |

### 4.2 Out of Scope Frontend V1

| ID | Fitur | Alasan |
|---|---|---|
| FE-OOS-001 | Landing page promosi | Sistem POS internal tidak membutuhkan halaman promosi |
| FE-OOS-002 | PWA offline penuh | Berisiko menimbulkan konflik stok |
| FE-OOS-003 | Integrasi payment gateway UI otomatis | V1 hanya mencatat pembayaran manual |
| FE-OOS-004 | Integrasi printer thermal khusus | Tidak wajib pada V1 |
| FE-OOS-005 | Desain animasi kompleks | Tidak mendukung fungsi inti POS |
| FE-OOS-006 | Multi-theme kompleks | Tidak diperlukan untuk V1 |
| FE-OOS-007 | Multi-cabang UI | V1 fokus satu apotek |
| FE-OOS-008 | Loyalty program UI | Di luar scope V1 |
| FE-OOS-009 | Integrasi BPJS/asuransi | Di luar scope V1 |
| FE-OOS-010 | Manajemen resep dokter lanjutan | Pelayanan Resep Dasar masuk scope; e-resep, clinical decision support, interaksi obat otomatis, dan integrasi eksternal tetap out of scope |
| FE-OOS-011 | Piutang pelanggan | Future enhancement, bukan fitur inti V1 |

---

## 5. Struktur Routing Frontend

Routing harus dipisahkan berdasarkan public route, protected route, dan role route.

```text
/
├── /login
├── /dashboard
├── /kasir
├── /riwayat-transaksi
├── /retur-penjualan
├── /produk
├── /kategori
├── /supplier
├── /satuan
├── /batch
├── /pemesanan
├── /pemesanan/tambah
├── /pemesanan/:id
├── /pemesanan/:id/cetak
├── /pembelian
├── /pembelian/tambah
├── /pembelian/dari-po/:poId
├── /pelayanan/resep
├── /pelayanan/resep/tambah
├── /pelayanan/resep/:id
├── /pelayanan/konseling
├── /pelayanan/riwayat
├── /stok
├── /mutasi-stok
├── /retur-pembelian
├── /laporan/penjualan
├── /laporan/laba
├── /export
├── /users
└── /settings
```

### 5.1 Route Berdasarkan Role

| Route | Kasir | Apoteker | Manager | Catatan |
|---|---:|---:|---:|---|
| `/login` | Ya | Ya | Ya | Public route |
| `/dashboard` | Terbatas/Opsional | Terbatas | Ya | Kasir/Apoteker tidak melihat laba/HPP |
| `/kasir` | Ya | Opsional | Ya | Halaman utama kasir |
| `/riwayat-transaksi` | Ya | Terbatas | Ya | Kasir hanya transaksi relevan |
| `/retur-penjualan` | Ya | Terbatas | Ya | Kasir boleh retur penjualan |
| `/produk` | Lihat terbatas | Lihat | Kelola | Kasir tidak mengubah data |
| `/kategori` | Tidak | Lihat | Ya | Manager |
| `/supplier` | Tidak | Lihat | Ya | Manager |
| `/satuan` | Tidak | Lihat | Ya | Manager |
| `/batch` | Lihat terbatas | Lihat | Kelola | Kasir/Apoteker tidak melihat HPP |
| `/pemesanan` | Tidak | Ya | Ya | PO tidak mengubah stok |
| `/pemesanan/tambah` | Tidak | Ya | Ya | Apoteker/Manager |
| `/pemesanan/:id/cetak` | Tidak | Ya | Ya | Print preview PO |
| `/pembelian` | Tidak | Lihat terbatas | Ya | Manager finalisasi pembelian |
| `/pembelian/dari-po/:poId` | Tidak | Tidak | Ya | Draft pembelian dari PO |
| `/pelayanan/resep` | Tarik siap bayar | Ya | Ya | Resep tidak mengurangi stok |
| `/pelayanan/resep/tambah` | Tidak | Ya | Ya | Apoteker/Manager |
| `/pelayanan/konseling` | Tidak | Ya | Ya | Tidak membuat tagihan/stok |
| `/pelayanan/riwayat` | Tidak | Ya | Ya | Riwayat pelayanan |
| `/stok` | Lihat terbatas | Lihat | Ya | Kasir tidak melihat HPP |
| `/mutasi-stok` | Tidak | Lihat | Ya | Manager |
| `/retur-pembelian` | Tidak | Tidak | Ya | Manager |
| `/laporan/penjualan` | Tidak | Tidak | Ya | Manager |
| `/laporan/laba` | Tidak | Tidak | Ya | Manager/Pemilik |
| `/export` | Tidak | Tidak | Ya | Manager |
| `/users` | Tidak | Tidak | Ya | Manager |
| `/settings` | Tidak | Tidak | Ya | Manager |

### 5.2 Protected Route Rules

```text
Jika user belum login:
-> redirect ke /login

Jika user login tetapi role tidak berhak:
-> tampilkan halaman 403 Akses Ditolak

Jika sesi habis:
-> hapus auth state
-> redirect ke /login

Jika token invalid:
-> tampilkan pesan sesi berakhir
-> redirect ke /login
```

---

## 6. Struktur Folder Frontend

Struktur folder yang direkomendasikan:

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
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── types.ts
│   │
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
│   ├── useDebounce.ts
│   ├── useMediaQuery.ts
│   ├── usePermission.ts
│   └── useCurrentTime.ts
│
├── lib/
│   ├── api.ts
│   ├── query-client.ts
│   ├── auth.ts
│   ├── permissions.ts
│   ├── format-currency.ts
│   ├── format-date.ts
│   ├── format-number.ts
│   ├── constants.ts
│   └── utils.ts
│
├── stores/
│   ├── auth-store.ts
│   ├── cashier-cart-store.ts
│   ├── ui-store.ts
│   └── filter-store.ts
│
├── types/
│   ├── api.ts
│   ├── auth.ts
│   ├── product.ts
│   ├── category.ts
│   ├── supplier.ts
│   ├── unit.ts
│   ├── batch.ts
│   ├── purchase.ts
│   ├── sale.ts
│   ├── return.ts
│   ├── stock.ts
│   ├── report.ts
│   └── common.ts
│
├── assets/
│   ├── images/
│   └── icons/
│
├── styles/
│   └── globals.css
│
└── main.tsx
```

### 6.1 Pola Isi Setiap Feature

Setiap feature sebaiknya memiliki struktur berikut:

```text
features/products/
├── pages/
│   ├── product-list-page.tsx
│   └── product-form-page.tsx
├── components/
│   ├── product-table.tsx
│   ├── product-form.tsx
│   ├── product-filter.tsx
│   └── product-status-badge.tsx
├── hooks/
│   ├── use-products.ts
│   ├── use-create-product.ts
│   └── use-update-product.ts
├── schemas/
│   └── product-schema.ts
├── services/
│   └── product-api.ts
└── types.ts
```

Pola ini harus diterapkan pada produk, supplier, batch, pembelian, stok, retur, dan laporan.

---

## 7. Layout Utama Aplikasi

### 7.1 App Layout

Layout utama terdiri dari:

```text
AppLayout
├── Sidebar
├── Topbar
├── MainContent
└── GlobalFeedback
```

### 7.2 Sidebar

Sidebar harus mendukung:

- collapse/expand;
- aktif menu berdasarkan route;
- menu berdasarkan role;
- icon menu;
- responsive drawer pada tablet/mobile;
- logout button;
- nama aplikasi atau logo apotek.

### 7.3 Topbar

Topbar harus menampilkan:

- nama halaman aktif;
- nama apotek;
- waktu real-time;
- nama user login;
- role user;
- tombol logout;
- indikator koneksi/API jika diperlukan.

### 7.4 Main Content

Main content harus:

- menggunakan lebar penuh sesuai viewport;
- tidak memunculkan horizontal scroll tidak perlu;
- mendukung table responsive;
- memiliki padding konsisten;
- menampilkan loading, empty, dan error state.

---

## 8. Halaman Login

### 8.1 Tujuan

Halaman login digunakan untuk autentikasi pengguna dan menentukan role akses.

### 8.2 Komponen

```text
LoginPage
├── LoginCard
├── UsernameOrEmailInput
├── PasswordInput
├── SubmitButton
└── ErrorMessage
```

### 8.3 Field

| Field | Tipe | Validasi |
|---|---|---|
| usernameOrEmail | string | wajib diisi |
| password | string | wajib diisi |

### 8.4 Perilaku

```text
User mengisi username/email dan password
-> klik login
-> frontend validasi field kosong
-> kirim request login
-> jika berhasil, simpan token/session dan data user
-> redirect berdasarkan role
-> jika gagal, tampilkan pesan error
```

### 8.5 Redirect Setelah Login

| Role | Redirect |
|---|---|
| Kasir | `/kasir` |
| Manager | `/dashboard` |
| Pemilik | `/dashboard` |

---

## 9. Dashboard Manager

### 9.1 Tujuan

Dashboard digunakan untuk memantau ringkasan kondisi apotek.

### 9.2 Komponen Dashboard

```text
DashboardPage
├── DashboardSummaryGrid
│   ├── OmzetTodayCard
│   ├── ProfitTodayCard
│   ├── ProfitWeekCard
│   ├── ProfitMonthCard
│   ├── ProfitYearCard
│   └── TransactionTodayCard
│
├── AlertSection
│   ├── LowStockWidget
│   └── ExpiredBatchWidget
│
├── ChartSection
│   ├── SalesTrendChart
│   └── ProfitTrendChart
│
└── RecentTransactionTable
```

### 9.3 Data Minimal

| Data | Keterangan |
|---|---|
| omzet hari ini | total penjualan hari ini |
| laba hari ini | laba berdasarkan detail transaksi |
| laba minggu ini | laba periode minggu berjalan |
| laba bulan ini | laba periode bulan berjalan |
| laba tahun ini | laba periode tahun berjalan |
| transaksi hari ini | jumlah transaksi |
| stok kritis | produk dengan stok <= stok minimum |
| batch mendekati expired | batch mendekati tanggal kedaluwarsa |
| transaksi terbaru | daftar transaksi terakhir |

### 9.4 Batasan Role

Kasir tidak boleh melihat:

- HPP;
- laba;
- margin;
- harga beli;
- laporan laba;
- dashboard keuangan penuh.

---

## 10. Halaman Kasir

Halaman kasir adalah pusat transaksi penjualan. Halaman ini harus menjadi prioritas tertinggi frontend.

### 10.1 Prinsip Halaman Kasir

| ID | Prinsip | Penjelasan |
|---|---|---|
| CASHIER-UI-001 | Satu halaman utama | Transaksi normal tidak membutuhkan pindah halaman |
| CASHIER-UI-002 | Pencarian cepat | Produk harus mudah ditemukan |
| CASHIER-UI-003 | Keranjang selalu terlihat pada desktop | Kasir harus melihat item dan total |
| CASHIER-UI-004 | Input qty cepat | Qty mudah diubah |
| CASHIER-UI-005 | Pembayaran jelas | Total, uang diterima, dan kembalian terlihat |
| CASHIER-UI-006 | Error langsung terlihat | Stok kurang, satuan salah, cash kurang harus jelas |
| CASHIER-UI-007 | Estimasi bukan final | Finalisasi tetap dari backend |

### 10.2 Layout Desktop

```text
┌──────────────────────────────────────────────────────────────┐
│ Topbar: Nama Apotek | Jam Real-time | User | Logout          │
├─────────────┬─────────────────────────────┬──────────────────┤
│ Sidebar     │ Area Produk                  │ Keranjang        │
│             │ Search + Filter              │ Item transaksi   │
│             │ List/Card Produk             │ Qty, satuan      │
│             │ Stok tersedia                │ Subtotal         │
│             │ Status stok/expired          │                  │
├─────────────┴─────────────────────────────┼──────────────────┤
│ Shortcut Info                             │ Panel Pembayaran │
│ F1 Search, F2 Bayar, Esc Reset            │ Diskon, Total,   │
│                                           │ Cash, Kembalian  │
└───────────────────────────────────────────┴──────────────────┘
```

### 10.3 Layout Tablet

```text
Topbar
Search Produk
Tabs:
- Produk
- Keranjang
- Pembayaran

Bottom Action:
- Total
- Tombol Bayar
```

### 10.4 Layout Mobile Terbatas

```text
Topbar ringkas
Search produk
List produk
Floating cart summary
Drawer keranjang
Drawer pembayaran
```

Mobile tidak perlu menampilkan semua elemen sekaligus. Memaksa semua panel desktop masuk layar ponsel adalah tindakan kejam terhadap mata manusia.

### 10.5 Komponen Halaman Kasir

```text
CashierPage
├── CashierHeader
├── ProductSearchBar
├── ProductCategoryFilter
├── ProductResultList
├── ProductCard
├── ProductStockBadge
├── ProductUnitSelector
├── QuantityInput
├── AddToCartButton
├── CartPanel
├── CartItemRow
├── CartItemEditControl
├── DiscountPanel
├── PaymentPanel
├── PaymentMethodSelector
├── CashReceivedInput
├── ChangeDisplay
├── CheckoutButton
├── ResetCartButton
├── CheckoutSuccessModal
└── CheckoutErrorModal
```

### 10.6 Data Produk di Halaman Kasir

Setiap item produk di halaman kasir minimal menampilkan:

| Data | Tampil untuk Kasir | Catatan |
|---|---:|---|
| nama produk | Ya | Wajib |
| kode produk | Ya | Wajib |
| kategori | Ya | Opsional dalam card |
| nama generik | Ya | Jika tersedia |
| satuan jual | Ya | Pilihan satuan |
| stok tersedia | Ya | Dalam satuan dasar atau satuan yang mudah dipahami |
| status stok habis | Ya | Badge |
| status mendekati expired | Ya | Tanpa HPP |
| harga jual | Ya | Sesuai satuan jual |
| HPP | Tidak | Data sensitif |
| laba/margin | Tidak | Data sensitif |
| harga modal | Tidak | Data sensitif |

### 10.7 Keranjang Kasir

Keranjang harus menyimpan state sementara:

```ts
type CartItem = {
  productId: string;
  productCode: string;
  productName: string;
  selectedUnitId: string;
  selectedUnitName: string;
  conversionFactor: number;
  qty: number;
  estimatedUnitPrice: number;
  estimatedSubtotal: number;
  note?: string;
};
```

### 10.8 State Keranjang

Keranjang dikelola oleh Zustand:

```ts
type CashierCartState = {
  items: CartItem[];
  discountType: "NONE" | "PERCENT" | "NOMINAL";
  discountValue: number;
  paymentMethod: "CASH" | "TRANSFER" | "QRIS" | "DEBIT" | null;
  cashReceived: number;

  addItem: (item: CartItem) => void;
  updateQty: (productId: string, unitId: string, qty: number) => void;
  removeItem: (productId: string, unitId: string) => void;
  clearCart: () => void;
  setDiscount: (type: DiscountType, value: number) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setCashReceived: (amount: number) => void;
};
```

### 10.9 Perhitungan Sementara Frontend

Frontend boleh menghitung:

```text
estimated_subtotal = sum(item.estimatedSubtotal)
estimated_discount = berdasarkan input diskon
estimated_total = estimated_subtotal - estimated_discount
estimated_change = cashReceived - estimated_total
```

Frontend tidak boleh menghitung final:

```text
batch final
FEFO final
HPP final
laba final
diskon alokasi final
mutasi stok final
```

### 10.10 Submit Transaksi

Saat klik `Simpan Transaksi`, frontend mengirim payload ringkas:

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

Frontend tidak boleh mengirim HPP, laba, batch final, atau diskon alokasi sebagai nilai final.

### 10.11 Response Sukses Transaksi

Backend mengembalikan data final:

```json
{
  "saleId": "uuid",
  "invoiceNumber": "INV-20260602-0001",
  "subtotal": 50000,
  "discountTotal": 5000,
  "grandTotal": 45000,
  "cashReceived": 50000,
  "change": 5000,
  "paymentMethod": "CASH",
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

### 10.12 Response Error Transaksi

Error harus ditampilkan jelas:

| Error Backend | Tampilan Frontend |
|---|---|
| Keranjang kosong | "Keranjang transaksi masih kosong." |
| Stok tidak cukup | "Stok produk tidak mencukupi. Periksa qty atau pilih produk lain." |
| Produk tidak aktif | "Produk ini tidak dapat dijual karena sudah nonaktif." |
| Satuan tidak valid | "Satuan jual tidak valid untuk produk ini." |
| Diskon melebihi subtotal | "Diskon tidak boleh melebihi subtotal transaksi." |
| Uang cash kurang | "Nominal pembayaran belum mencukupi." |
| Batch valid tidak tersedia | "Batch aktif dengan stok tersedia tidak ditemukan." |
| Sesi habis | "Sesi login berakhir. Silakan login ulang." |

---

## 11. Halaman Produk

### 11.1 Tujuan

Halaman produk digunakan Manager untuk mengelola data obat atau barang apotek.

### 11.2 Komponen

```text
ProductListPage
├── ProductToolbar
├── ProductSearchInput
├── ProductCategoryFilter
├── ProductStatusFilter
├── ProductTable
├── ProductFormModal
├── ProductDetailDrawer
└── ProductDeactivateDialog
```

### 11.3 Field Produk

| Field | Tampil | Edit Manager | Kasir |
|---|---:|---:|---:|
| kode produk | Ya | Ya | Ya |
| nama produk | Ya | Ya | Ya |
| kategori | Ya | Ya | Ya |
| nama generik | Ya | Ya | Ya |
| barcode | Ya | Ya | Ya |
| satuan dasar | Ya | Ya | Ya |
| stok minimum | Ya | Ya | Tidak |
| status aktif | Ya | Ya | Tidak |
| deskripsi | Ya | Ya | Terbatas |

### 11.4 Validasi Frontend

| Field | Validasi |
|---|---|
| kode produk | wajib diisi |
| nama produk | wajib diisi |
| kategori | wajib dipilih |
| satuan dasar | wajib dipilih |
| stok minimum | tidak boleh negatif |
| barcode | opsional |

---

## 12. Halaman Kategori

### 12.1 Tujuan

Mengelola kategori produk.

### 12.2 Komponen

```text
CategoryPage
├── CategoryTable
├── CategoryFormModal
├── CategorySearchInput
└── CategoryStatusBadge
```

### 12.3 Field

| Field | Validasi |
|---|---|
| nama kategori | wajib diisi |
| deskripsi | opsional |
| status aktif | wajib |

---

## 13. Halaman Supplier

### 13.1 Tujuan

Mengelola data supplier untuk pembelian.

### 13.2 Komponen

```text
SupplierPage
├── SupplierTable
├── SupplierFormModal
├── SupplierSearchInput
└── SupplierStatusBadge
```

### 13.3 Field

| Field | Validasi |
|---|---|
| nama supplier | wajib diisi |
| nomor telepon | opsional |
| alamat | opsional |
| kontak person | opsional |
| status aktif | wajib |

---

## 14. Halaman Satuan dan Konversi

### 14.1 Tujuan

Mengatur satuan jual dan faktor konversi terhadap satuan dasar.

### 14.2 Komponen

```text
UnitConversionPage
├── ProductSelector
├── BaseUnitDisplay
├── UnitConversionTable
├── UnitConversionFormModal
└── ConversionPreview
```

### 14.3 Field Konversi

| Field | Validasi |
|---|---|
| produk | wajib dipilih |
| nama satuan jual | wajib |
| faktor konversi | lebih besar dari 0 |
| status aktif | wajib |

### 14.4 Contoh Tampilan Konversi

```text
Produk: Paracetamol 500mg
Satuan dasar: tablet

Satuan jual:
- 1 tablet = 1 tablet
- 1 strip = 10 tablet
- 1 box = 100 tablet
```

Frontend harus membantu Manager memahami efek konversi, tetapi kalkulasi stok final tetap backend.

---

## 15. Halaman Batch

### 15.1 Tujuan

Mengelola batch obat berdasarkan nomor batch, expired date, stok, HPP, dan harga jual.

### 15.2 Komponen

```text
BatchPage
├── BatchToolbar
├── BatchSearchInput
├── BatchStatusFilter
├── ExpiredFilter
├── BatchTable
├── BatchFormModal
├── BatchDetailDrawer
└── BatchStatusBadge
```

### 15.3 Data Batch untuk Manager

| Data | Tampil Manager |
|---|---:|
| produk | Ya |
| nomor batch | Ya |
| supplier | Ya |
| expired date | Ya |
| stok satuan dasar | Ya |
| HPP satuan dasar | Ya |
| harga jual per satuan | Ya |
| status batch | Ya |

### 15.4 Data Batch untuk Kasir

| Data | Tampil Kasir |
|---|---:|
| produk | Ya |
| nomor batch | Terbatas/Opsional |
| expired date | Ya |
| stok tersedia | Ya |
| harga jual | Ya |
| HPP | Tidak |
| laba | Tidak |

### 15.5 Badge Status Batch

| Status | Tampilan |
|---|---|
| Aktif | Badge "Aktif" |
| Habis | Badge "Stok Habis" |
| Mendekati expired | Badge "Mendekati Expired" |
| Expired | Badge "Expired" |
| Nonaktif | Badge "Nonaktif" |

---

## 16. Halaman Pembelian Supplier

### 16.1 Tujuan

Mencatat pembelian dari supplier dan membuat/menambah batch. Pembelian dapat dibuat manual atau dari PO, dengan validasi faktur supplier, diskon pembelian, mode PPN/non-PPN, batch, expired date, dan harga jual final manual.

### 16.2 Komponen

```text
PurchasePage
├── PurchaseToolbar
├── PurchaseTable
├── PurchaseFormPage
├── SupplierSelector
├── PurchaseItemTable
├── PurchaseItemForm
├── BatchInputSection
├── UnitPurchaseSelector
├── HppPreview
└── SubmitPurchaseButton
```

### 16.3 Field Pembelian

| Field | Validasi |
|---|---|
| supplier | wajib dipilih |
| PO asal | opsional, hanya untuk draft dari PO |
| tanggal pembelian | wajib |
| nomor invoice/faktur | disarankan kuat |
| tanggal invoice | disarankan |
| mode PPN | `NON_PPN`, `PPN_INCLUDED`, `PPN_EXCLUDED` |
| total faktur input | wajib |
| produk | wajib |
| nomor batch | wajib |
| expired date | wajib |
| satuan pembelian | wajib |
| qty diterima | lebih besar dari 0 |
| harga beli/modal | tidak boleh negatif dan boleh presisi desimal |
| diskon pembelian | `NONE`, `NOMINAL`, `PERCENT`, tidak negatif |
| harga jual per satuan | rupiah bulat dan tidak boleh negatif |

### 16.4 HPP Preview

Frontend boleh menampilkan preview:

```text
hpp_preview = harga_beli / jumlah_satuan_dasar_dalam_satuan_pembelian
```

Preview ini hanya bantuan UI. Nilai final tetap dihitung backend.

Harga beli/harga modal pada UI Manager boleh menerima presisi desimal sesuai API backend. Harga jual per satuan yang diisi Manager tetap rupiah bulat karena akan tampil sebagai harga final ke pelanggan.

UI wajib menampilkan ringkasan pembelian:

```text
Subtotal barang
Total diskon
DPP
PPN
Total sistem
Total faktur input
Selisih
Catatan selisih
```

### 16.5 Pembelian dari PO

```text
Manager membuka Pembelian
-> pilih supplier
-> pilih No. PO
-> item PO ditarik sebagai draft
-> Manager menyesuaikan qty diterima, harga, diskon, PPN, batch, expired, dan harga jual
-> Manager mencocokkan total faktur
-> submit pembelian final ke backend
```

Frontend tidak boleh menambah stok saat PO dipilih. Stok hanya berubah setelah backend menyimpan pembelian final.

## 16A. Halaman Pemesanan / PO Obat

### 16A.1 Komponen

```text
PurchaseOrderPage
├── PurchaseOrderToolbar
├── PurchaseOrderTable
├── PurchaseOrderForm
├── PurchaseOrderItemTable
├── PrintPreviewButton
└── ConvertToPurchaseButton
```

### 16A.2 Field PO

| Field | Validasi |
|---|---|
| supplier | wajib |
| tanggal PO | wajib |
| pembuat | otomatis dari user login |
| item obat | minimal satu |
| satuan pemesanan | wajib |
| qty ordered | lebih besar dari 0 |
| estimasi harga beli | opsional, boleh presisi |
| catatan | opsional |

PO dapat dicetak dalam A4, A5, atau custom sederhana. PO tidak menambah stok dan tidak mengurangi stok.

## 16B. Halaman Pelayanan Resep dan Konseling

### 16B.1 Resep Dokter

```text
PrescriptionPage
├── PrescriptionTable
├── PrescriptionForm
├── PrescriptionItemEditor
├── MarkReadyForPaymentButton
└── PullToCashierAction
```

Resep memuat pasien, dokter, item obat, satuan jual aktif, qty, aturan pakai, catatan etiket, dan status. Resep tidak mengurangi stok sebelum checkout kasir berhasil.

### 16B.2 Konseling Dasar

```text
CounselingPage
├── CounselingTable
├── CounselingForm
├── RelatedPrescriptionSelect
└── RelatedSaleSelect
```

Konseling hanya dokumentasi edukasi obat. Konseling tidak membuat tagihan dan tidak mengubah stok.

---

## 17. Halaman Stok dan Mutasi Stok

### 17.1 Halaman Stok

```text
StockPage
├── StockSummaryCards
├── StockSearchInput
├── CategoryFilter
├── StockStatusFilter
├── StockTable
└── StockDetailDrawer
```

### 17.2 Data Stok

| Data | Kasir | Manager |
|---|---:|---:|
| nama produk | Ya | Ya |
| kategori | Ya | Ya |
| total stok tersedia | Ya | Ya |
| stok per batch | Terbatas | Ya |
| expired date | Ya | Ya |
| stok minimum | Tidak | Ya |
| HPP | Tidak | Ya |
| status batch | Ya | Ya |

### 17.3 Halaman Mutasi Stok

```text
StockMutationPage
├── MutationFilter
├── MutationTable
└── MutationDetailDrawer
```

### 17.4 Data Mutasi

| Data | Tampil Manager |
|---|---:|
| waktu mutasi | Ya |
| produk | Ya |
| batch | Ya |
| tipe mutasi | Ya |
| qty sebelum | Ya |
| qty perubahan | Ya |
| qty sesudah | Ya |
| referensi transaksi | Ya |
| user pelaku | Ya |
| alasan | Ya |

Kasir tidak perlu membuka mutasi stok penuh.

---

## 18. Halaman Retur Penjualan

### 18.1 Tujuan

Memproses retur berdasarkan transaksi asal.

### 18.2 Komponen

```text
SalesReturnPage
├── TransactionSearchInput
├── TransactionDetailCard
├── ReturnableItemTable
├── ReturnQtyInput
├── ReturnReasonInput
├── ReturnSummary
└── SubmitReturnButton
```

### 18.3 Alur UI Retur Penjualan

```text
Kasir mencari nomor transaksi
-> frontend mengambil detail transaksi
-> tampilkan item yang bisa diretur
-> kasir memilih item
-> kasir mengisi qty retur
-> kasir mengisi alasan retur
-> frontend validasi awal
-> kirim ke backend
-> backend memvalidasi final
-> tampilkan hasil retur
```

### 18.4 Validasi Frontend

| Field | Validasi |
|---|---|
| nomor transaksi | wajib |
| item retur | minimal satu item |
| qty retur | lebih besar dari 0 |
| alasan retur | wajib |
| qty retur | tidak boleh melebihi qty tersedia menurut data UI |

Validasi qty final tetap dilakukan backend.

---

## 19. Halaman Retur Pembelian

### 19.1 Tujuan

Memproses retur pembelian ke supplier.

### 19.2 Komponen

```text
PurchaseReturnPage
├── PurchaseOrBatchSearch
├── BatchDetailCard
├── ReturnPurchaseItemForm
├── ReturnReasonInput
└── SubmitPurchaseReturnButton
```

### 19.3 Role

Hanya Manager yang dapat membuka halaman ini.

---

## 20. Halaman Laporan

### 20.1 Laporan Penjualan

```text
SalesReportPage
├── ReportDateFilter
├── PaymentMethodFilter
├── CashierFilter
├── ProductFilter
├── SalesSummaryCards
├── SalesReportTable
├── TransactionDetailDrawer
└── ExportActions
```

### 20.2 Data Laporan Penjualan

| Data | Tampil |
|---|---:|
| nomor transaksi | Ya |
| tanggal transaksi | Ya |
| kasir | Ya |
| metode pembayaran | Ya |
| subtotal | Ya |
| diskon | Ya |
| total | Ya |
| retur terkait | Ya |

### 20.3 Laporan Laba

```text
ProfitReportPage
├── ReportDateFilter
├── ProfitSummaryCards
├── ProfitByProductTable
├── ProfitByBatchTable
├── ProfitDetailDrawer
└── ExportActions
```

### 20.4 Data Laporan Laba

| Data | Kasir | Manager |
|---|---:|---:|
| omzet | Tidak | Ya |
| HPP | Tidak | Ya |
| diskon | Tidak | Ya |
| laba kotor | Tidak | Ya |
| koreksi retur | Tidak | Ya |
| laba setelah retur | Tidak | Ya |
| rincian per produk | Tidak | Ya |
| rincian per batch | Tidak | Ya |

Kasir tidak boleh memiliki akses ke laporan laba.

---

## 21. Export Laporan

### 21.1 Komponen

```text
ExportActions
├── ExportExcelButton
├── ExportPdfButton
└── ExportLoadingState
```

### 21.2 Perilaku

```text
User memilih filter laporan
-> klik Export Excel/PDF
-> frontend mengirim query filter ke API export
-> file diunduh
-> tampilkan sukses atau error
```

### 21.3 Error

| Kondisi | Pesan UI |
|---|---|
| export gagal | "Ekspor laporan gagal. Silakan ulangi." |
| filter tidak valid | "Filter laporan belum valid." |
| akses ditolak | "Anda tidak memiliki akses untuk mengekspor laporan." |

---

## 22. State Management

### 22.1 Server State

Dikelola oleh TanStack Query.

| Data | Query Key |
|---|---|
| user aktif | `["auth", "me"]` |
| produk | `["products", filters]` |
| kategori | `["categories"]` |
| supplier | `["suppliers"]` |
| satuan | `["units"]` |
| batch | `["batches", filters]` |
| stok | `["stock", filters]` |
| transaksi | `["sales", filters]` |
| detail transaksi | `["sales", saleId]` |
| pembelian | `["purchases", filters]` |
| pemesanan/PO | `["purchase-orders", filters]` |
| resep | `["prescriptions", filters]` |
| konseling | `["counseling-records", filters]` |
| retur penjualan | `["sales-returns", filters]` |
| dashboard | `["dashboard", period]` |
| laporan penjualan | `["reports", "sales", filters]` |
| laporan laba | `["reports", "profit", filters]` |

### 22.2 Local State

Dikelola oleh Zustand atau local component state.

| State | Tool |
|---|---|
| keranjang kasir | Zustand |
| sidebar collapse | Zustand |
| modal terbuka | local state/Zustand |
| filter sementara | Zustand/local |
| tab aktif | local state |
| form input | React Hook Form |

### 22.3 Invalidation Setelah Mutation

| Aksi | Query yang Harus Di-invalidate |
|---|---|
| simpan transaksi | produk, stok, dashboard, sales, reports |
| pembelian supplier | batch, stok, purchases, dashboard |
| PO dibuat/diubah/dibatalkan | purchase-orders |
| pembelian dari PO | purchase-orders, purchases, batch, stok, dashboard |
| resep ditandai siap bayar | prescriptions |
| resep checkout | prescriptions, sales, stock, dashboard |
| konseling disimpan | counseling-records |
| retur penjualan | stock, sales, sales-returns, reports, dashboard |
| retur pembelian | stock, purchase-returns, dashboard |
| koreksi stok | stock, stock-mutations, dashboard |
| update produk | products, cashier search |
| update batch | batches, stock, cashier search |

---

## 23. Validasi Frontend

Validasi frontend harus dilakukan untuk mencegah input jelas salah sebelum dikirim ke backend.

### 23.1 Validasi Global

| ID | Aturan |
|---|---|
| FE-VAL-001 | Field wajib tidak boleh kosong |
| FE-VAL-002 | Qty harus lebih besar dari 0 |
| FE-VAL-003 | Nilai uang tidak boleh negatif |
| FE-VAL-004 | Diskon tidak boleh negatif |
| FE-VAL-005 | Diskon persen tidak boleh lebih dari 100 |
| FE-VAL-006 | Diskon nominal tidak boleh lebih besar dari subtotal estimasi |
| FE-VAL-007 | Cash harus minimal sebesar total estimasi |
| FE-VAL-008 | Expired date wajib valid |
| FE-VAL-009 | Alasan retur wajib diisi |
| FE-VAL-010 | Produk nonaktif tidak boleh dipilih pada transaksi baru |

### 23.2 Form Schema

Gunakan Zod untuk schema form:

```ts
const saleItemSchema = z.object({
  productId: z.string().min(1),
  unitId: z.string().min(1),
  qty: z.number().positive(),
  note: z.string().optional(),
});
```

```ts
const discountSchema = z.object({
  discountType: z.enum(["NONE", "PERCENT", "NOMINAL"]),
  discountValue: z.number().min(0),
});
```

---

## 24. Error Handling UI

### 24.1 Jenis Error UI

| Jenis Error | Tampilan |
|---|---|
| validasi field | pesan di bawah field |
| error transaksi | modal atau alert di panel pembayaran |
| error akses | halaman 403 |
| error sesi | toast + redirect login |
| data kosong | empty state |
| data gagal dimuat | retry state |
| server error | pesan umum yang jelas |
| konflik data | pesan reload data |

### 24.2 Empty State

Contoh empty state:

```text
Produk tidak ditemukan.
Coba gunakan kata kunci lain atau periksa kategori yang dipilih.
```

```text
Belum ada transaksi pada periode ini.
Ubah filter tanggal untuk melihat data lain.
```

### 24.3 Loading State

Gunakan:

- skeleton table;
- spinner kecil pada tombol submit;
- disabled state saat submit;
- loading state pada export;
- placeholder pada dashboard card.

---

## 25. Role-Based UI

Frontend harus memiliki helper permission:

```ts
export function canAccess(userRole: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) ?? false;
}
```

### 25.1 Permission Minimum

```ts
type Permission =
  | "VIEW_CASHIER"
  | "CREATE_SALE"
  | "CREATE_SALES_RETURN"
  | "VIEW_PRODUCTS_LIMITED"
  | "MANAGE_PRODUCTS"
  | "MANAGE_BATCHES"
  | "VIEW_STOCK_LIMITED"
  | "VIEW_STOCK_FULL"
  | "MANAGE_PURCHASE_ORDERS"
  | "VIEW_PURCHASE_ORDERS"
  | "MANAGE_PURCHASES"
  | "MANAGE_PURCHASE_RETURNS"
  | "MANAGE_PRESCRIPTIONS"
  | "PULL_PRESCRIPTION_TO_CASHIER"
  | "MANAGE_COUNSELING"
  | "VIEW_SALES_REPORT"
  | "VIEW_PROFIT_REPORT"
  | "EXPORT_REPORT"
  | "MANAGE_USERS"
  | "MANAGE_SETTINGS";
```

### 25.2 Permission Role

```ts
const ROLE_PERMISSIONS = {
  KASIR: [
    "VIEW_CASHIER",
    "CREATE_SALE",
    "CREATE_SALES_RETURN",
    "PULL_PRESCRIPTION_TO_CASHIER",
    "VIEW_PRODUCTS_LIMITED",
    "VIEW_STOCK_LIMITED"
  ],
  APOTEKER: [
    "VIEW_PRODUCTS_LIMITED",
    "VIEW_STOCK_LIMITED",
    "VIEW_PURCHASE_ORDERS",
    "MANAGE_PURCHASE_ORDERS",
    "MANAGE_PRESCRIPTIONS",
    "MANAGE_COUNSELING"
  ],
  MANAGER: [
    "VIEW_CASHIER",
    "CREATE_SALE",
    "CREATE_SALES_RETURN",
    "VIEW_PRODUCTS_LIMITED",
    "MANAGE_PRODUCTS",
    "MANAGE_BATCHES",
    "VIEW_STOCK_LIMITED",
    "VIEW_STOCK_FULL",
    "VIEW_PURCHASE_ORDERS",
    "MANAGE_PURCHASE_ORDERS",
    "MANAGE_PURCHASES",
    "MANAGE_PURCHASE_RETURNS",
    "MANAGE_PRESCRIPTIONS",
    "PULL_PRESCRIPTION_TO_CASHIER",
    "MANAGE_COUNSELING",
    "VIEW_SALES_REPORT",
    "VIEW_PROFIT_REPORT",
    "EXPORT_REPORT",
    "MANAGE_USERS",
    "MANAGE_SETTINGS"
  ]
};
```

Frontend permission hanya untuk tampilan. Backend tetap wajib memvalidasi akses final.

---

## 26. Responsivitas

### 26.1 Breakpoint

| Layar | Strategi |
|---|---|
| Desktop besar | Sidebar tetap, produk tengah, keranjang kanan |
| Laptop | Sidebar bisa collapse, keranjang tetap terlihat |
| Tablet | Produk dan keranjang memakai tab/drawer |
| Mobile | Keranjang memakai drawer dan floating summary |

### 26.2 Aturan Responsif

| ID | Aturan |
|---|---|
| FE-RESP-001 | Tidak boleh ada horizontal scroll tidak perlu |
| FE-RESP-002 | Sidebar berubah menjadi drawer pada layar kecil |
| FE-RESP-003 | Table harus dapat scroll horizontal dalam container, bukan seluruh halaman |
| FE-RESP-004 | Tombol utama harus mudah dijangkau |
| FE-RESP-005 | Panel pembayaran tetap jelas |
| FE-RESP-006 | Font tidak boleh terlalu kecil |
| FE-RESP-007 | Spacing harus konsisten |

---

## 27. Format Angka, Uang, dan Tanggal

### 27.1 Format Uang

Gunakan format Rupiah:

```text
Rp10.000
Rp250.000
Rp1.500.000
```

Harga jual pelanggan, subtotal, total, dan kembalian ditampilkan sebagai Rupiah bulat. HPP/laba pada halaman Manager atau laporan boleh berasal dari nilai internal presisi, tetapi `profit_display` dan angka laporan ditampilkan dalam format Rupiah yang dibulatkan.

### 27.2 Format Tanggal

Gunakan format Indonesia:

```text
02 Juni 2026
02/06/2026
```

### 27.3 Format Waktu

Gunakan waktu lokal:

```text
13:45
13:45:20
```

### 27.4 Catatan Penting

Frontend boleh menampilkan waktu lokal untuk UI, tetapi waktu transaksi final harus berasal dari backend/server.

---

## 28. Komponen Reusable

### 28.1 UI Components

```text
Button
Input
Select
Textarea
Dialog
Drawer
Table
Badge
Card
Tabs
Dropdown
DatePicker
Pagination
Toast
Skeleton
EmptyState
ConfirmDialog
```

### 28.2 Domain Components

```text
ProductSearchInput
ProductStatusBadge
BatchStatusBadge
StockBadge
MoneyDisplay
DateDisplay
RoleBadge
PaymentMethodBadge
DiscountInput
ReportDateFilter
ExportButton
```

Komponen domain harus dibuat reusable agar tidak setiap halaman menciptakan versi sendiri seperti manusia yang menganggap copy-paste sebagai arsitektur.

---

## 29. Integrasi API dari Sisi Frontend

Frontend harus membuat wrapper API:

```ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});
```

### 29.1 Interceptor

Frontend perlu interceptor untuk:

- menambahkan token jika memakai Bearer token;
- menangani 401 Unauthorized;
- menangani 403 Forbidden;
- redirect ke login saat sesi habis;
- menampilkan pesan error umum.

### 29.2 Service File

Contoh:

```ts
export const productApi = {
  getProducts: (filters) => api.get("/products", { params: filters }),
  createProduct: (payload) => api.post("/products", payload),
  updateProduct: (id, payload) => api.patch(`/products/${id}`, payload),
};
```

### 29.3 Query Hook

```ts
export function useProducts(filters: ProductFilter) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => productApi.getProducts(filters),
  });
}
```

### 29.4 Mutation Hook

```ts
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
```

---

## 30. Shortcut Keyboard Kasir

Shortcut disarankan untuk mempercepat transaksi.

| Shortcut | Fungsi |
|---|---|
| F1 | Fokus ke search produk |
| F2 | Fokus ke panel pembayaran |
| F3 | Pilih metode cash |
| F4 | Simpan transaksi |
| Esc | Reset/keluar modal |
| Delete | Hapus item terpilih |
| Ctrl + Enter | Submit transaksi |

Shortcut harus tidak mengganggu input form normal.

---

## 31. Testing Frontend

### 31.1 Unit Test

Unit test disarankan untuk:

- format uang;
- format tanggal;
- permission helper;
- kalkulasi estimasi subtotal;
- kalkulasi estimasi diskon;
- kalkulasi estimasi kembalian;
- cart store.

### 31.2 Component Test

Component test disarankan untuk:

- LoginForm;
- ProductForm;
- BatchForm;
- CashierCart;
- PaymentPanel;
- SalesReturnForm;
- ReportFilter.

### 31.3 Integration Test

Integration test disarankan untuk:

- login dan redirect role;
- tambah produk ke keranjang;
- ubah qty keranjang;
- validasi cash kurang;
- submit transaksi sukses;
- submit transaksi gagal karena stok tidak cukup;
- akses laporan laba ditolak untuk kasir.

---

## 32. Guardrail Implementasi Frontend

AI coding wajib mengikuti larangan berikut:

1. Jangan menghitung FEFO final di frontend.
2. Jangan menentukan batch final di frontend.
3. Jangan mengirim HPP final dari frontend saat transaksi.
4. Jangan menghitung laba final di frontend.
5. Jangan mengurangi stok final di frontend.
6. Jangan menampilkan HPP kepada kasir.
7. Jangan menampilkan laba kepada kasir.
8. Jangan menampilkan harga modal atau margin kepada kasir.
9. Jangan memberi menu laporan laba kepada kasir.
10. Jangan mengandalkan role UI sebagai keamanan tunggal.
11. Jangan menyimpan transaksi final di local storage.
12. Jangan membuat keranjang langsung mengubah stok.
13. Jangan membuat UI retur tanpa transaksi asal.
14. Jangan mengizinkan diskon melebihi subtotal estimasi.
15. Jangan membuat halaman kasir bergantung pada banyak perpindahan halaman.
16. Jangan mencampur semua komponen dalam satu file besar.
17. Jangan menampilkan error teknis mentah kepada user.
18. Jangan membuat horizontal scroll pada seluruh halaman.
19. Jangan membuat fitur di luar scope V1 tanpa label Future Enhancement.
20. Jangan membuat state global besar untuk semua data.
21. Jangan membuat desain yang menyembunyikan tombol simpan transaksi dari area kasir utama.
22. Jangan membuat PO menampilkan stok bertambah.
23. Jangan mengurangi stok saat resep dibuat atau ditandai siap bayar.
24. Jangan menampilkan satuan jual yang tidak aktif kepada kasir.
25. Jangan membuat piutang sebagai fitur inti V1.

---

## 33. Definition of Done Frontend

Frontend dianggap selesai untuk V1 jika memenuhi kriteria berikut:

| ID | Kriteria |
|---|---|
| FE-DOD-001 | Login dan logout berjalan |
| FE-DOD-002 | Protected route berjalan |
| FE-DOD-003 | Role-based menu berjalan |
| FE-DOD-004 | Kasir tidak dapat melihat HPP/laba |
| FE-DOD-005 | Halaman kasir dapat mencari produk |
| FE-DOD-006 | Kasir dapat memilih satuan jual |
| FE-DOD-007 | Kasir dapat menambah item ke keranjang |
| FE-DOD-008 | Kasir dapat mengubah qty dan menghapus item |
| FE-DOD-009 | Diskon persen dan nominal tersedia |
| FE-DOD-010 | Cash menghitung kembalian estimasi |
| FE-DOD-011 | Submit transaksi mengirim payload benar |
| FE-DOD-012 | Error transaksi ditampilkan jelas |
| FE-DOD-013 | Keranjang kosong setelah transaksi sukses |
| FE-DOD-014 | Produk dapat dikelola Manager |
| FE-DOD-015 | Batch dapat dikelola Manager |
| FE-DOD-016 | Pembelian supplier dapat diinput |
| FE-DOD-016A | PO dapat dibuat, dicetak, dan ditarik menjadi draft pembelian |
| FE-DOD-016B | Pembelian dari PO mendukung faktur, diskon pembelian, PPN/non-PPN, batch, dan expired date |
| FE-DOD-017 | Retur penjualan dapat dibuat |
| FE-DOD-018 | Stok dan mutasi stok dapat dilihat Manager |
| FE-DOD-019 | Dashboard Manager tampil |
| FE-DOD-020 | Laporan penjualan tampil |
| FE-DOD-021 | Laporan laba hanya tampil untuk Manager |
| FE-DOD-022 | Export laporan tersedia jika fitur diaktifkan |
| FE-DOD-023 | Layout responsif tanpa horizontal scroll tidak perlu |
| FE-DOD-024 | Loading, empty, dan error state tersedia |
| FE-DOD-025 | Struktur folder berbasis feature diterapkan |
| FE-DOD-026 | Query invalidation berjalan setelah mutation penting |
| FE-DOD-027 | Kasir hanya melihat satuan jual aktif |
| FE-DOD-028 | Resep dasar dapat dibuat dan ditarik ke kasir tanpa mengurangi stok sebelum checkout |
| FE-DOD-029 | Konseling dasar dapat dicatat tanpa tagihan dan tanpa perubahan stok |

---

## 34. Prompt Eksekusi untuk Codex / AI Coding

Gunakan prompt berikut untuk mengimplementasikan frontend:

```text
Baca dan pahami file 06_FRONTEND_ONLY_POS_APOTEK.md sebagai dokumen utama frontend POS Apotek.

Tugas:
Bangun frontend POS Apotek menggunakan React + Vite + TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zustand, React Hook Form, dan Zod.

Ikuti aturan berikut:
1. Terapkan struktur folder berbasis feature sesuai dokumen.
2. Buat routing public dan protected route.
3. Buat role-based route dan role-based sidebar.
4. Buat layout utama dengan sidebar responsif dan topbar.
5. Buat halaman login.
6. Buat halaman dashboard Manager.
7. Buat halaman kasir sebagai prioritas utama.
8. Buat keranjang kasir dengan Zustand.
9. Buat pencarian produk dengan TanStack Query.
10. Buat form produk, kategori, supplier, satuan, batch, pembelian, retur, stok, dan laporan.
11. Frontend hanya boleh menghitung estimasi subtotal, diskon, total, dan kembalian.
12. Jangan menghitung FEFO final, HPP final, laba final, diskon alokasi final, atau pengurangan stok final di frontend.
13. Jangan menampilkan HPP dan laba kepada kasir.
14. Semua submit transaksi harus dikirim ke backend API.
15. Tampilkan loading, empty, success, dan error state yang jelas.
16. Buat tampilan responsif tanpa horizontal scroll tidak perlu.
17. Jangan membuat fitur di luar scope V1.
18. Jangan mengubah aturan bisnis yang sudah ditentukan PRD, SRS, dan dokumen frontend ini.

Output yang diharapkan:
- Struktur folder frontend rapi.
- Komponen reusable tersedia.
- Halaman kasir dapat digunakan.
- Role-based UI berjalan.
- Integrasi API dibuat melalui service dan hook.
- Validasi form memakai React Hook Form dan Zod.
- State server memakai TanStack Query.
- State keranjang memakai Zustand.
```

---

## 35. Catatan Akhir

Dokumen ini adalah batas kerja frontend.  
Jika ada kebutuhan terkait database, transaksi atomic, FEFO final, split batch final, HPP final, laba final, dan mutasi stok final, rujuk ke dokumen backend atau SDD.

Frontend harus menjadi antarmuka yang cepat, jelas, dan aman dari sisi pengalaman pengguna. Backend tetap menjadi pusat keputusan bisnis. Pembagian ini penting agar sistem tidak berubah menjadi aplikasi yang terlihat rapi tetapi diam-diam menghancurkan stok, laporan, dan kepercayaan pemilik apotek.
