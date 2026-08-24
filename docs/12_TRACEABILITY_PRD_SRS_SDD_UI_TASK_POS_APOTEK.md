# Traceability PRD-SRS-SDD-UI-Task - POS Apotek

## 1. Ringkasan

Dokumen ini menutup `TASK-DOC-001` dengan peta ringkas dari kebutuhan V1 ke implementasi dan bukti validasi lokal. Status kesiapan saat ini: fitur inti V1 sudah tervalidasi lokal; sisa pekerjaan adalah checklist produksi saat rilis operasional, bukan penambahan fitur.

## 2. Traceability Utama

| Area kebutuhan | Rujukan utama | Implementasi | Bukti validasi |
|---|---|---|---|
| Auth, refresh token, role, dan RBAC | `PRD-AUTH-001`, SRS auth/RBAC, Backend auth/authorization, Task Phase 2 | Backend auth/users/roles, protected frontend routes, role-based navigation | Auth/RBAC integration tests; smoke role `MANAGER`, `APOTEKER`, `KASIR`; kasir ditolak dari laporan laba/pembelian/users/settings/audit |
| Master data produk, kategori, supplier, satuan, dan satuan jual aktif | `PRD-PROD-001`, `PRD-CAT-001`, `PRD-SUP-001`, `PRD-UNIT-001`, `PRD-UNIT-002`, Task Phase 3 | API master data dan UI `/produk`, `/kategori`, `/supplier`, `/satuan` | Master Data API tests; sales unit restriction tests; frontend build |
| Batch, harga batch, pembelian, PO, dan faktur | `PRD-BATCH-001`, `PRD-PUR-001`, `PRD-PUR-002`, `PRD-PO-001`, Backend purchase/PO, Task Phase 4/4D | Batch, purchase, purchase order, convert PO ke pembelian, diskon/PPN/faktur | Batch/Purchase/PO integration tests; smoke PO tidak mengubah stok; pembelian dari PO membuat `PURCHASE_IN` |
| Stok batch dan mutasi stok | `GOAL-002`, `PRD-STOCK-001`, SDD stock mutation, Backend stock, Task Phase 5 | Stock summary, stock mutation, stock adjustment, batch-level stock in base unit | Stock API tests; smoke mutasi stok; concurrent sale memastikan stok batch tidak negatif |
| Kasir, FEFO, split batch, idempotency checkout | `PRD-SALE-001`, `PRD-FEFO-001`, `PRD-SPLIT-001`, SRS sales, Backend sales/FEFO, Task Phase 6 | Checkout backend, FEFO server-side, split allocation, sale detail historical snapshot, idempotency key | FEFO unit tests; sales integration tests; idempotency tests; concurrent checkout test; UI click-through kasir |
| Diskon, HPP presisi, laba historis | `PRD-DISC-001`, `PRD-REPORT-001`, Backend discount/profit, Task Phase 4C/7/9 | Discount service, allocation to sale detail, Decimal HPP/profit, profit report from historical details | Discount unit tests; precision sales tests; reports tests; smoke manager profit report |
| Pelayanan resep dan konseling | `PRD-PRESC-001`, `PRD-COUNS-001`, Backend prescription/counseling, Task Phase 6C | UI `/pelayanan/resep`, `/pelayanan/konseling`, checkout resep dari kasir | Prescription/counseling tests; smoke resep tidak mengurangi stok sebelum checkout; checkout resep mengurangi stok setelah sukses |
| Retur penjualan dan pembelian | `PRD-RETSALE-001`, `PRD-RETPUR-001`, Backend return rules, Task Phase 8 | Sales return and purchase return APIs/UI with idempotency keys and batch stock mutation | Sales/Purchase Returns tests; smoke retur penjualan membuat `SALES_RETURN_IN`; retur pembelian mengurangi stok batch |
| Dashboard, laporan, dan export | `PRD-DASH-001`, `PRD-REPORT-001`, `PRD-EXPORT-001`, Frontend reports/dashboard, Backend reports/export, Task Phase 9/10 | Dashboard polling, sales/profit reports, charts, export XLSX/PDF | Dashboard integration spec; reports API tests; exports API tests; export XLSX UI smoke |
| User, settings, audit log, UX polish | `PRD-USER-001`, `PRD-SET-001`, SDD audit/settings, Task Phase 11 | UI `/users`, `/settings`, `/audit-log`, backend settings/audit logs | Frontend build; browser smoke membuka users/settings/audit; event audit penuh menjadi observability follow-up |
| Deployment lokal, backup, restore, dan readiness | Deployment docs, Task Phase 13/14 | Docker Full Local Mode, internal backend/PostgreSQL, frontend port 80, backup/restore scripts | `/api/health` ok; Docker local build/check; only frontend exposes host port; backup restore test bersih |

## 3. Interface Publik yang Sudah Dicakup

| Lapisan | Interface |
|---|---|
| Frontend route | `/login`, `/dashboard`, `/kasir`, `/riwayat-transaksi`, `/retur-penjualan`, `/produk`, `/kategori`, `/supplier`, `/satuan`, `/batch`, `/pemesanan`, `/pembelian`, `/pembelian/dari-po/:poId`, `/pelayanan/resep`, `/pelayanan/konseling`, `/stok`, `/mutasi-stok`, `/laporan/penjualan`, `/laporan/laba`, `/export`, `/users`, `/settings`, `/audit-log` |
| Backend endpoint | `/api/auth/*`, `/api/products`, `/api/categories`, `/api/suppliers`, `/api/units`, `/api/batches`, `/api/purchases`, `/api/purchase-orders`, `/api/prescriptions`, `/api/counseling-records`, `/api/sales`, `/api/sales-returns`, `/api/purchase-returns`, `/api/stock`, `/api/dashboard/*`, `/api/reports/*`, `/api/exports/*`, `/api/users`, `/api/settings`, `/api/audit-logs`, `/api/health` |
| Data contract | API JSON camelCase, database snake_case, money/HPP/profit memakai Decimal/Numeric, timestamp disimpan UTC dan ditampilkan operasional dengan Asia/Makassar |

## 4. Checklist Produksi Tersisa

Ini bukan gap fitur V1. Jalankan saat rilis operasional atau sesi testing/deployment eksplisit.

| Item | Status saat ini | Aksi saat rilis |
|---|---|---|
| Smoke operasional role penuh pada stack final | Sudah lulus pada validasi lokal sebelumnya; tidak diulang pada validasi Docker 2026-06-29 | Ulang checklist `docs/11_CHECKLIST_SESI_TESTING_POS_APOTEK.md` dengan data operasional/test final |
| Audit log event coverage | Endpoint/UI tersedia; event penting sudah bisa dilihat | Verifikasi event user, produk, batch, harga, pembelian, transaksi, retur, dan koreksi stok |
| Backup dan restore formal | Restore test bersih sudah terbukti | Jalankan backup sebelum go-live dan uji restore pada database test, bukan volume aktif |
| Secret dan environment production | `.env.example` dan Docker local mode tersedia | Isi secret production lokal, cek CORS/LAN, jangan commit `.env` |
| Data awal operasional | Seed role/user tersedia | Ganti password default, buat user kasir/apoteker/manager final, nonaktifkan user smoke |

## 5. Keputusan Scope

- Tidak ada fitur baru yang ditambahkan dari traceability ini.
- Out-of-scope V1 tetap ditunda: BPJS, payment gateway otomatis, multi-branch, loyalty, full accounting, dan advanced prescription.
- Backend tetap sumber kebenaran untuk stok, batch, FEFO, split batch, HPP, profit, returns, discount allocation, dan stock mutation.
