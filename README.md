# POS Apotek Risyah

POS Apotek Risyah adalah aplikasi point of sale internal untuk operasional apotek. Target deployment utama V1 saat ini adalah **Local Network Server / LAN Deployment**: satu laptop/PC menjadi server lokal, lalu perangkat kasir/manager lain mengakses aplikasi melalui browser pada jaringan Wi-Fi/LAN yang sama.

Cloud deployment seperti Vercel/Railway tidak menjadi target utama V1. Konfigurasi cloud yang masih ada diperlakukan sebagai `future-cloud-deployment` dan tidak boleh menjadi default aktif.

Mode operasional utama adalah **Docker Full Local Mode**. PC server tidak wajib menginstal Node.js, npm, atau PostgreSQL langsung di host; runtime tersebut berjalan di container Docker.

## Arsitektur LAN

```text
Laptop/PC Server Lokal
+-- PostgreSQL database pusat
+-- Backend NestJS API
+-- Frontend React build
+-- Nginx static server + proxy /api

Client Kasir / Manager
+-- Browser membuka http://IP_SERVER
```

Contoh:

```text
Server lokal:
IP: 192.168.1.10

Client kasir membuka:
http://192.168.1.10

Backend API:
http://192.168.1.10/api
```

Backend tetap menjadi sumber kebenaran final untuk stok, batch, FEFO, HPP, laba, diskon alokasi, retur, dan mutasi stok. Frontend hanya menghitung estimasi tampilan dan tidak menyimpan transaksi final di localStorage.

## Status Fitur V1

Fokus pengembangan saat ini adalah menyelesaikan sistem POS Apotek V1 sebelum kembali memperluas pekerjaan deployment.

Fitur utama yang tersedia:

- Auth JWT, refresh token, role, dan proteksi route.
- Manajemen user dan pengaturan profil apotek.
- Master data kategori, supplier, satuan, produk, satuan jual aktif, dan minimum qty jual.
- Batch produk, harga jual per batch/satuan jual, stok batch, dan mutasi stok.
- Pemesanan/PO obat dan pembelian supplier, termasuk pembelian dari PO.
- Presisi Harga Modal dan HPP: harga modal/HPP/laba internal memakai presisi tinggi, harga jual pelanggan tetap rupiah bulat manual.
- Kasir, keranjang, pembayaran, diskon, checkout, FEFO backend, split batch, dan idempotency checkout.
- Pelayanan resep dasar: resep tidak mengurangi stok sebelum ditarik kasir dan checkout berhasil.
- Konseling dasar: catatan konseling tidak membuat tagihan dan tidak mengubah stok.
- Riwayat transaksi, retur penjualan, retur pembelian, dashboard, laporan penjualan, laporan laba, dan export XLSX/PDF.
- Indikator koneksi local server dan blokir submit final saat server tidak terhubung.

Guardrail V1:

- Backend tetap sumber kebenaran final untuk stok, batch, FEFO, HPP, laba, retur, diskon alokasi, dan mutasi stok.
- Jangan menyimpan transaksi final di localStorage.
- Jangan membuat PWA offline penuh, database per client, atau sinkronisasi peer-to-peer.
- Kasir tidak boleh menerima HPP, laba, margin, harga beli, laporan laba, pembelian supplier, koreksi stok, atau price setting.
- Jangan menambah BPJS, payment gateway otomatis, multi-cabang, loyalty program, atau akuntansi penuh pada V1.

## Codex Project Skills

Repo ini memiliki skill lokal di `.codex/skills` untuk menjaga workflow Codex tetap konsisten dengan aturan POS Apotek:

- `pos-apotek-v1-implementation`: gunakan saat mengimplementasikan fitur V1 agar aturan stok batch, FEFO, HPP, laba, role, dan transaksi tetap aman.
- `pos-apotek-testing-safety`: gunakan saat sesi testing/smoke agar regression backend, Docker check, dan backup/restore tidak tercampur ke sesi implementasi harian.

Analisis pemilihan skill berdasarkan katalog `openai/skills` dicatat di `docs/09_CODEX_SKILLS_POS_APOTEK.md`.

## Panduan Operasional dan Testing

- Panduan pengguna internal role Manager, Apoteker, dan Kasir tersedia di `docs/10_PANDUAN_PENGGUNA_INTERNAL_POS_APOTEK.md`.
- Checklist sesi testing khusus tersedia di `docs/11_CHECKLIST_SESI_TESTING_POS_APOTEK.md`.
- Referensi ringkas deployment lokal, pola frontend, aturan bisnis, dan test matrix tersedia di `docs/local-deployment.md`, `docs/frontend-patterns.md`, `docs/business-rules.md`, dan `docs/test-matrix.md`.

## Struktur Folder

```text
pos_apotek_risyah/
+-- backend/
+-- database/
+-- docs/
+-- frontend/
+-- tests/
+-- docker-compose.local.yml
+-- scripts/
```

## Environment

Salin file contoh environment. Untuk local production, frontend memakai same-origin `/api` melalui Nginx sehingga `VITE_API_BASE_URL` tidak perlu diubah ketika IP server berubah.

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Backend penting:

```env
APP_HOST=0.0.0.0
APP_PORT=3000
APP_TIMEZONE=Asia/Makassar
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/pos_apotek?schema=public
CORS_ORIGIN=http://localhost,http://127.0.0.1,http://localhost:5173,http://192.168.1.10,http://192.168.1.10:5173
```

Jika memakai ZeroTier dan backend diakses langsung dari browser saat development, tambahkan origin ZeroTier tanpa menghapus origin lokal yang sudah ada:

```env
APP_URL=http://ZERO_TIER_IP_SERVER
FRONTEND_URL=http://ZERO_TIER_IP_SERVER
CORS_ORIGIN=http://localhost,http://127.0.0.1,http://localhost:5173,http://127.0.0.1:5173,http://192.168.1.10,http://192.168.1.10:5173,http://ZERO_TIER_IP_SERVER
```

Untuk local production Docker lewat Nginx, CORS ZeroTier biasanya tidak diperlukan karena browser membuka `http://ZERO_TIER_IP_SERVER` dan API tetap dipanggil same-origin melalui `/api`.

Frontend penting:

```env
VITE_API_BASE_URL=/api
VITE_APP_TIMEZONE=Asia/Makassar
```

Untuk local production melalui Nginx, gunakan `VITE_API_BASE_URL=/api`. Untuk development langsung ke backend, gunakan `http://localhost:3000/api`. Untuk akses langsung backend dari LAN tanpa Nginx, gunakan `http://IP_SERVER:3000/api`. `192.168.1.10` hanya contoh dokumentasi, bukan nilai source code.

## Mengetahui IP Server Lokal

Di Windows server lokal, jalankan:

```powershell
ipconfig
```

Cari bagian Wi-Fi atau Ethernet:

```text
IPv4 Address . . . . . . . . . . : 192.168.1.10
```

Untuk operasional harian, gunakan DHCP reservation di router atau IP statis yang stabil. Jika IP berubah, client hanya perlu membuka URL server yang baru, misalnya `http://IP_SERVER`. Local production tetap memakai `VITE_API_BASE_URL=/api` karena request API diproxy oleh Nginx pada origin yang sama.

## Akses Privat via ZeroTier

ZeroTier dipakai sebagai jaringan privat antar perangkat. Aplikasi tidak perlu dependency ZeroTier dan tidak perlu membuka backend atau database ke internet publik.

Langkah setup:

1. Buat private network di ZeroTier Central.
2. Install ZeroTier di PC server POS dan join ke Network ID tersebut.
3. Authorize perangkat server di ZeroTier Central, lalu catat managed IP server.
4. Install ZeroTier di perangkat kasir/manager yang boleh akses, join network yang sama, lalu authorize perangkat tersebut.
5. Client authorized membuka aplikasi melalui:

```text
http://ZERO_TIER_IP_SERVER
```

Untuk local production Docker, biarkan frontend memakai:

```env
VITE_API_BASE_URL=/api
```

Frontend Nginx tetap menjadi satu pintu akses pada port `80`, lalu proxy `/api` ke backend internal. Jangan menyimpan Network ID, token ZeroTier, IP asli, atau detail akun ZeroTier ke repository.

Checklist firewall Windows server:

```powershell
Get-NetConnectionProfile | Where-Object "InterfaceAlias" -like "Zero*"
Get-NetConnectionProfile | Where-Object "InterfaceAlias" -like "Zero*" | Set-NetConnectionProfile -NetworkCategory Private
New-NetFirewallRule -DisplayName "POS Apotek ZeroTier HTTP" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 80 -Profile Private
```

Tetap jangan expose port `3000` backend atau `5432` PostgreSQL ke perangkat client. Akses user dicabut dengan deauthorize device dari ZeroTier Central.

## Local Production Dengan Docker Compose

Prasyarat host:

- Docker Desktop aktif.
- WSL 2 aktif jika memakai Windows.
- Browser untuk membuka aplikasi.
- Node.js tidak wajib untuk menjalankan local production.

Dari root repository:

```powershell
docker compose up -d --build
```

Perintah setara:

```powershell
docker compose -f docker-compose.local.yml up -d --build
```

Atau gunakan script Windows:

```powershell
scripts\start-local.bat
```

Saat pertama kali dijalankan, container backend akan menjalankan Prisma migration dan seed otomatis. Tunggu sampai backend selesai startup sebelum mengecek health endpoint. Selama beberapa detik awal, Nginx dapat menampilkan `502 Bad Gateway` karena backend masih melakukan migration/seed.

Service yang berjalan:

- Frontend Nginx + proxy `/api`: `http://localhost`
- Backend API internal: `backend:3000`
- PostgreSQL internal: `postgres:5432`
- Redis cache internal: `redis:6379`

Backend, PostgreSQL, dan Redis tidak diekspos langsung ke LAN pada local production. Client kasir/manager cukup mengakses frontend pada port `80`, lalu frontend memanggil API melalui `/api`.

Client dalam LAN membuka:

```text
http://IP_SERVER
```

Client melalui ZeroTier membuka:

```text
http://ZERO_TIER_IP_SERVER
```

Cek health API:

```powershell
Invoke-RestMethod http://localhost/api/health
```

Jika hasilnya `status: ok` dan `database: connected`, backend dan database sudah siap.

Akun seed awal:

```text
username: manager
password: ChangeMe123!
role: MANAGER
```

Melihat log:

```powershell
docker compose -f docker-compose.local.yml logs -f
```

Log backend saja:

```powershell
docker compose -f docker-compose.local.yml logs -f backend
```

Atau:

```powershell
scripts\logs-backend.bat
```

Mematikan service:

```powershell
docker compose -f docker-compose.local.yml down
```

Atau:

```powershell
scripts\stop-local.bat
```

Menjalankan ulang setelah perubahan kode:

```powershell
docker compose -f docker-compose.local.yml up -d --build
```

Jika hanya backend berubah:

```powershell
docker compose -f docker-compose.local.yml build backend
docker compose -f docker-compose.local.yml up -d backend frontend
```

Jika hanya frontend berubah:

```powershell
docker compose -f docker-compose.local.yml build frontend
docker compose -f docker-compose.local.yml up -d frontend
```

Catatan port:

- Local production memakai port host `80`.
- Jika port `80` sudah dipakai aplikasi lain, hentikan aplikasi tersebut atau ubah mapping `frontend.ports` di `docker-compose.local.yml`, misalnya `"8080:80"`, lalu buka `http://localhost:8080`.
- Jangan expose backend `3000` atau PostgreSQL `5432` ke LAN untuk operasional kasir.

Migration dan seed dari container backend:

```powershell
docker compose -f docker-compose.local.yml exec backend npx prisma migrate deploy
docker compose -f docker-compose.local.yml exec backend npx prisma db seed
```

Catatan: container backend juga menjalankan migration deploy dan seed saat start. Perintah manual di atas berguna untuk verifikasi atau maintenance.

PgAdmin opsional:

```powershell
docker compose -f docker-compose.local.yml --profile tools up -d pgadmin
```

Akses dari server:

```text
http://localhost:5050
```

## Menjalankan Manual Saat Development

Database saja:

```powershell
docker compose -f database/docker-compose.yml up -d
```

Backend:

```powershell
cd backend
npm.cmd install
npm.cmd run db:validate
npm.cmd run db:deploy
npm.cmd run db:generate
npm.cmd run db:seed
npm.cmd run start:dev
```

Frontend:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev:lan
```

Development mode boleh memakai Vite dev server dan hot reload. Local production untuk operasional kasir memakai Docker Compose, frontend static build, dan Nginx reverse proxy.

Mode preview build:

```powershell
cd frontend
npm.cmd run build
npm.cmd run preview:lan
```

Catatan: jika `npm.cmd` tidak dikenali di PowerShell, install Node.js untuk mode development manual, atau gunakan Docker Full Local Mode di atas yang tidak membutuhkan Node.js di host.

## Validasi Setelah Menjalankan Project

Jalankan dari root repository:

```powershell
docker compose -f docker-compose.local.yml ps
Invoke-RestMethod http://localhost/api/health
Invoke-WebRequest http://localhost/login -UseBasicParsing
```

Status yang diharapkan:

- `pos_apotek_postgres` running dan `healthy`.
- `pos_apotek_backend` running.
- `pos_apotek_frontend` running dan publish `0.0.0.0:80->80/tcp`.
- Health API mengembalikan `status: ok`, `timezone: Asia/Makassar`, dan `database: connected`.
- `/login` mengembalikan HTTP `200`.

Backend regression test dapat dijalankan pada sesi testing khusus. Gunakan database test terpisah agar data operasional tidak tercampur data test.

## Workflow Pengembangan Saat Ini

Untuk sementara, pekerjaan utama adalah menyelesaikan sistem aplikasi, bukan Docker. Docker Full Local Mode sudah menjadi baseline yang cukup stabil dan hanya disentuh lagi jika ada perubahan deployment atau ada bug runtime.

Kebijakan test per sesi:

- Sesi implementasi harian: jalankan validasi ringan saja, terutama `npm.cmd --prefix frontend run build` setelah perubahan frontend besar dan `git diff --check` sebelum commit.
- Sesi testing khusus: jalankan backend regression, E2E/manual smoke, Docker check, backup/restore, dan audit role/security.
- Jangan menjalankan Docker build/check atau backend regression penuh di sesi implementasi biasa kecuali memang sedang menyentuh area tersebut.

Workflow git:

- Gunakan commit bertahap per kelompok fitur yang stabil.
- Push/PR ke GitHub dilakukan setelah satu kelompok fitur siap direview, bukan setiap perubahan kecil.
- Backup database tidak boleh masuk git; folder `backups/` diabaikan oleh `.gitignore`.

## Firewall Windows

Izinkan port berikut pada PC server lokal:

| Port | Fungsi |
| ---: | --- |
| 80 | Aplikasi web via Nginx local production |
| 3000 | Backend API jika tanpa reverse proxy |
| 5173 | Frontend Vite dev LAN, hanya development |
| 4173 | Frontend preview build LAN |
| 5432 | PostgreSQL, hanya untuk server/admin dan tidak perlu dibuka ke client kasir |

Client kasir/manager cukup mengakses port 80 pada local production. Jangan beri akses langsung PostgreSQL ke perangkat kasir.

## Backup Database

Buat folder backup:

```powershell
New-Item -ItemType Directory -Force backups
New-Item -ItemType Directory -Force backups\daily
New-Item -ItemType Directory -Force backups\weekly
New-Item -ItemType Directory -Force backups\monthly
```

Backup PostgreSQL dari Docker:

```powershell
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
docker exec -t pos_apotek_postgres pg_dump -U postgres pos_apotek > "backups/pos_apotek_$timestamp.sql"
```

Atau gunakan script:

```powershell
scripts\backup-db.bat
```

Restore ke database Docker:

```powershell
Get-Content backups/pos_apotek_YYYYMMDD_HHMMSS.sql | docker exec -i pos_apotek_postgres psql -U postgres -d pos_apotek
```

Atau gunakan script:

```powershell
scripts\restore-db.bat backups\pos_apotek_YYYYMMDD_HHMMSS.sql
```

Backup minimal harian, mingguan, bulanan, sebelum update aplikasi, dan simpan salinan di media eksternal atau cloud storage. Volume Docker bukan backup. Jangan hanya menyimpan satu backup di laptop server yang sama.

## Checklist Manual LAN

- Server dapat membuka `http://localhost`.
- Client dapat membuka `http://IP_SERVER`.
- Client ZeroTier authorized dapat membuka `http://ZERO_TIER_IP_SERVER`.
- Client dapat login.
- Client dapat memanggil `http://IP_SERVER/api/health`.
- Client ZeroTier authorized dapat memanggil `http://ZERO_TIER_IP_SERVER/api/health`.
- Device ZeroTier yang belum authorized tidak dapat mengakses aplikasi.
- Client tidak memakai akses langsung ke port `3000` atau `5432`.
- Indikator koneksi menampilkan server terhubung.
- Jika backend dimatikan, frontend menampilkan pesan server lokal tidak terhubung.
- Dua client kasir tidak dapat membuat stok batch negatif.
- Retry checkout/pembelian/retur/koreksi stok memakai idempotency key.

## Checklist Manual Fitur V1

Checklist ini dijalankan pada sesi testing khusus, bukan setiap sesi implementasi.

- Manager dapat membuat kategori, supplier, satuan, produk, satuan jual, batch, PO, dan pembelian.
- PO tidak menambah atau mengurangi stok sebelum pembelian final.
- Pembelian menambah stok batch dan mencatat mutasi stok masuk.
- Apoteker/Manager dapat membuat resep dan menandai resep siap bayar.
- Resep tidak mengurangi stok sebelum checkout kasir berhasil.
- Kasir dapat checkout produk reguler dan resep siap bayar.
- Checkout menjalankan FEFO backend, split batch jika perlu, idempotency, dan mutasi stok keluar.
- Retur penjualan mengembalikan stok ke batch asal dan mengoreksi laporan laba.
- Retur pembelian mengurangi stok batch dan mencatat mutasi stok keluar.
- Dashboard, laporan penjualan, laporan laba, dan export XLSX/PDF dapat dibuka Manager.
- Kasir ditolak dari endpoint dan UI sensitif seperti laporan laba, pembelian, HPP, laba, margin, dan koreksi stok.

## Future Cloud Deployment

Vercel/Railway dapat dipertimbangkan sebagai opsi masa depan, tetapi bukan target utama V1. Jangan memakai URL Vercel/Railway sebagai default environment dan jangan mengunci source code ke provider cloud tertentu.
