# Local Deployment - POS Apotek V2

## Target Utama V1

Target deployment utama POS Apotek V2 untuk V1 adalah **Docker Full Local Mode / LAN Deployment**. Satu PC atau laptop menjadi server lokal, lalu perangkat kasir, apoteker, dan manager mengakses aplikasi melalui browser pada jaringan yang sama.

Cloud deployment seperti Vercel/Railway hanya `future-cloud-deployment` dan tidak menjadi default aktif V1.

## Arsitektur Local Production

```text
Client LAN
  -> http://IP_SERVER
  -> Frontend Nginx container
  -> /api reverse proxy
  -> Backend NestJS container
  -> PostgreSQL container
```

Aturan:

- Frontend expose port `80`.
- Backend dan PostgreSQL tetap internal Docker network.
- Client cukup membuka `http://IP_SERVER`.
- Frontend local production memakai same-origin `/api`.
- Backend healthcheck publik melalui proxy: `http://IP_SERVER/api/health`.

## Environment

Frontend local production:

```env
VITE_API_BASE_URL=/api
```

Backend container:

```env
APP_HOST=0.0.0.0
APP_PORT=3000
APP_TIMEZONE=Asia/Makassar
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/pos_apotek?schema=public
```

Jangan hardcode IP lokal atau URL cloud di source code. IP server hanya dipakai user untuk membuka aplikasi dari browser.

## Operasional

Command utama:

```powershell
docker compose -f docker-compose.local.yml up -d --build
Invoke-RestMethod http://localhost/api/health
docker compose -f docker-compose.local.yml ps
```

Backup dan restore:

```powershell
scripts\backup-db.bat
scripts\restore-db.bat backups\NAMA_FILE.sql
```

Restore wajib diuji ke database atau volume test bersih, bukan menimpa data aktif.

## Guardrail

- Jangan expose PostgreSQL ke client kasir.
- Jangan hapus volume database kecuali reset data diminta eksplisit.
- Jangan membuat PWA offline penuh, database per client, sinkronisasi peer-to-peer, atau transaksi final di localStorage.
- Backend tetap sumber kebenaran final untuk stok, batch, FEFO, HPP, laba, retur, diskon alokasi, dan mutasi stok.
