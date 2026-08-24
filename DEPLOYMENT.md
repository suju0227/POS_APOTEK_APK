# Deployment POS Apotek

Status: `future-cloud-deployment`.

Target utama V1 adalah **Local Network Server / LAN Deployment** menggunakan `docker-compose.yml` di root repository. Panduan operasional utama ada di [README.md](README.md).

Dokumen ini hanya penanda bahwa deployment cloud seperti Vercel, Railway, atau provider lain dapat dipertimbangkan di masa depan. Cloud deployment tidak menjadi default aktif V1, tidak boleh memakai URL cloud sebagai default environment, dan tidak boleh mengubah prinsip backend sebagai sumber kebenaran.

## Prinsip Jika Cloud Dibuka Lagi

- Frontend tetap memakai `VITE_API_BASE_URL`.
- Backend tetap membaca `CORS_ORIGIN`, `APP_HOST`, `APP_PORT`, `APP_TIMEZONE`, dan `DATABASE_URL` dari environment.
- PostgreSQL tetap menjadi database pusat untuk satu deployment aktif.
- Transaksi final, stok, batch, FEFO, HPP, laba, retur, diskon alokasi, dan mutasi stok tetap diproses backend.
- Role `KASIR` tetap tidak boleh menerima HPP, laba, margin, harga beli, pembelian, koreksi stok, atau laporan laba.
- Idempotency key tetap wajib untuk checkout, pembelian, retur, dan koreksi stok.

## Status V1

Gunakan deployment LAN:

```powershell
docker compose -f docker-compose.local.yml up -d --build
```

Client dalam jaringan lokal membuka:

```text
http://IP_SERVER
```

Server lokal dapat membuka:

```text
http://localhost
```

Cek backend melalui Nginx proxy:

```powershell
Invoke-RestMethod http://localhost/api/health
```

Hasil sehat harus memuat `status: ok`, `timezone: Asia/Makassar`, dan `database: connected`.

Catatan:

- Port host yang dibuka untuk local production hanya `80`.
- Backend `3000` dan PostgreSQL `5432` tetap internal di Docker network.
- Port `5173` hanya untuk mode development Vite, bukan deployment LAN V1.
