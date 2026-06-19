# ATIGA Assessment AI

ATIGA Assessment AI adalah monorepo fullstack untuk pembuatan assessment, kurikulum, RAG dokumen, chat AI, dan export dokumen produksi. Queue memakai `pg-boss` di atas PostgreSQL. 

## Stack

- Backend: Fastify, Drizzle ORM, PostgreSQL, pg-boss, Puppeteer, docx, exceljs
- Frontend: Next.js 14 App Router, React, Tailwind CSS
- Monitoring: Prometheus, Grafana, structured JSON logging, Sentry
- Reverse proxy: Nginx

## Production Setup

1. Siapkan `.env` dari `.env.example`.
2. Pastikan minimal variabel berikut terisi:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `JWT_ACCESS_EXPIRES_IN=15m`
   - `JWT_REFRESH_EXPIRES_IN=7d`
   - `JWT_DOWNLOAD_EXPIRES_IN=1h`
   - `FRONTEND_URL`
   - `EXPORT_STORAGE_PATH`
   - `PUPPETEER_EXECUTABLE_PATH`
   - minimal satu API key provider AI
3. Jalankan:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

4. Jalankan migrasi:

```bash
docker compose -f docker-compose.prod.yml exec backend npm run db:migrate
```

5. Verifikasi health:

```bash
curl http://localhost/api/health
```

## Docker Images

Image backend dan frontend otomatis di-build dan di-publish ke GitHub Container Registry setiap workflow `CI` lulus di branch `main`, serta saat push tag `v*.*.*`:

- Backend: `ghcr.io/aantriono82/asesmen/backend:latest`
- Frontend: `ghcr.io/aantriono82/asesmen/frontend:latest`

### Pull image untuk deployment

```bash
docker pull ghcr.io/aantriono82/asesmen/backend:latest
docker pull ghcr.io/aantriono82/asesmen/frontend:latest
```

### Build lokal tanpa GHCR

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.prod.local-build.yml up -d --build
```

### Membuat package GHCR public

Secara default, package GHCR mengikuti visibility repository. Jika repo public, image dapat dibuat public setelah publish pertama kali. Untuk mengatur manual: buka repository GitHub, pilih tab `Packages`, buka package yang diinginkan, lalu ubah visibility di `Package settings`.

## CI/CD Secrets

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PATH`
- `GRAFANA_USER`
- `GRAFANA_PASSWORD`
- provider AI keys bila deploy memakai GitHub Actions env injection

Workflow `CD` akan otomatis `skip` sampai `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, dan `DEPLOY_PATH` dikonfigurasi di repository secrets.

## Monitoring

- Prometheus scrape config: [monitoring/prometheus/prometheus.yml](/home/aantriono/Dev/soal/monitoring/prometheus/prometheus.yml)
- Grafana dashboard: [monitoring/grafana/dashboards/atiga-overview.json](/home/aantriono/Dev/soal/monitoring/grafana/dashboards/atiga-overview.json)
- Metrics endpoint: `GET /api/metrics` (`admin` only)

## Backup PostgreSQL

```bash
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > atiga-backup.sql
```

Restore:

```bash
cat atiga-backup.sql | docker compose -f docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

## Troubleshooting

- Puppeteer gagal start: cek `PUPPETEER_EXECUTABLE_PATH` dan paket Chromium di container backend.
- Export download 401: cek access token dan refresh rotation.
- Queue stuck: cek tabel `pgboss.job` dan endpoint `/api/health`.
- Metrics kosong: pastikan Prometheus mengakses endpoint `/api/metrics` dengan kredensial admin atau lewat internal gateway yang menyuntikkan auth.

## Dokumen Tambahan

- [docs/api-reference.md](/home/aantriono/Dev/soal/docs/api-reference.md)
- [docs/architecture.md](/home/aantriono/Dev/soal/docs/architecture.md)
- [docs/skill-development-guide.md](/home/aantriono/Dev/soal/docs/skill-development-guide.md)
- [docs/security-checklist.md](/home/aantriono/Dev/soal/docs/security-checklist.md)
