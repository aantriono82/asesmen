# Architecture

```text
Nginx
  |- / -> Next.js frontend
  |- /api -> Fastify backend

Fastify backend
  |- Auth + role guard (admin, teacher)
  |- AI/chat engine
  |- Assessment/curriculum/document modules
  |- Export engine (DOCX/PDF/Excel)
  |- Metrics + logging + Sentry
  |- pg-boss workers

PostgreSQL + pgvector
  |- application data
  |- vector embeddings
  |- pg-boss queues
  |- PostgreSQL-backed rate limits
```

Boundary utama:

- `apps/backend/src/domain`: entity dan kontrak
- `apps/backend/src/application`: use case
- `apps/backend/src/infrastructure`: DB, queue, export, monitoring, storage
- `apps/backend/src/api`: HTTP routes dan middleware
- `apps/frontend/src/app`: routes App Router
- `apps/frontend/src/components`: UI feature modules

## Delivery Pipeline

- Workflow `CI` menjalankan lint, typecheck, test, dan validasi Docker build untuk backend dan frontend.
- Workflow `Build and Push Docker Images` dipicu setelah `CI` sukses di branch `main`, atau saat push tag rilis `v*.*.*`.
- Image production dipublish ke GHCR:
  - `ghcr.io/aantriono82/asesmen/backend:latest`
  - `ghcr.io/aantriono82/asesmen/frontend:latest`
- Workflow `CD` menunggu workflow publish image selesai lalu menjalankan deployment remote dengan `docker compose -f docker-compose.prod.yml pull` dan `up -d`.
