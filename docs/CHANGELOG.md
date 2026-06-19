# Changelog

## v1.0 - Siap untuk Development/Testing Penuh

ATIGA Assessment AI telah melewati seluruh phase 1-6 dengan verifikasi end-to-end, perapihan backend test suite, dan perbaikan bug fungsional yang signifikan. Status akhir backend saat rilis ini adalah `38/38` file test lulus dan `49/49` test lulus.

### Ringkasan Phase

#### Phase 1 - Foundation

- Monorepo backend/frontend dibangun di atas Fastify, Next.js, PostgreSQL, Drizzle ORM, dan `pg-boss`.
- Sistem skill awal berbasis file Markdown dengan YAML frontmatter.
- Fondasi deployment, queue, dan boundary arsitektur utama disiapkan.

#### Phase 2 - Skill Runtime dan Eksekusi Dasar

- Loader skill, validasi schema input/output, dan runtime eksekusi skill diperkenalkan.
- Endpoint skill execution dan worker queue dasar tersedia.
- Fallback placeholder untuk lingkungan tanpa provider AI tetap dipertahankan agar pengembangan lokal tidak buntu.

#### Phase 3 - Chat, Tool Routing, dan Orkestrasi AI

- Layer chat session, message history, tool routing, dan pemanggilan skill dari jalur percakapan ditambahkan.
- Integrasi provider AI diperluas untuk mendukung eksekusi terstruktur, termasuk pemetaan model per skill.
- Streaming dan observabilitas dasar untuk jalur AI ditambahkan.

#### Phase 4 - RAG Dokumen dan Knowledge Base

- Upload dokumen, parsing, chunking, embedding, retrieval, reranking, dan context building diintegrasikan.
- Knowledge base berbasis dokumen mulai dipakai sebagai sumber grounding untuk chat dan generation.
- Jalur retrieval dipasang ke assessment generation dan skill execution yang memerlukan konteks dokumen.

#### Phase 5 - Assessment, Kurikulum, dan Export Produksi

- Assessment generation multi-skill, question bank, curriculum generation, dan document export diselesaikan.
- Export DOCX/PDF/Excel disiapkan untuk workflow guru yang utuh.
- Mapping output skill ke format soal final diperketat agar lebih konsisten di backend.

#### Phase 6 - Auth, Rate Limit, Monitoring, dan Hardening

- Session auth, JWT rotation, PostgreSQL-backed rate limit, audit log, metrics, dan Sentry diaktifkan.
- Jalur admin/teacher diperketat.
- Verifikasi end-to-end difokuskan pada readiness sistem untuk development dan testing penuh.

### Bug Signifikan yang Ditemukan dan Diperbaiki

#### 1. Assessment generation kekurangan jumlah soal

- Gejala: assessment yang digenerate dapat menghasilkan jumlah soal lebih sedikit dari `count` yang diminta.
- Akar masalah: placeholder/runtime path di `skill-runtime.ts` tidak selalu menghormati panjang array `questions` yang diminta.
- Perbaikan: builder output placeholder dan jalur generation diselaraskan agar jumlah butir mengikuti permintaan skill secara konsisten.

#### 2. RAG grounding lemah walau `sourceContext` tersedia

- Gejala: skill menerima `sourceContext`, tetapi model masih bisa menghasilkan istilah generik dan tidak memakai istilah spesifik dokumen.
- Akar masalah: `sourceContext` diteruskan, tetapi belum dipaksa kuat di prompt sistem maupun prompt skill.
- Perbaikan:
  - system prompt runtime diperketat di [apps/backend/src/application/skills/skill-ai-runtime.ts](/home/aantriono/Dev/soal/apps/backend/src/application/skills/skill-ai-runtime.ts:19)
  - blok `Aturan Grounding SourceContext` diperketat di [apps/backend/src/application/skills/skill-runtime.ts](/home/aantriono/Dev/soal/apps/backend/src/application/skills/skill-runtime.ts:23)
  - `skill.md` untuk skill assessment utama diselaraskan agar eksplisit mewajibkan istilah/fakta spesifik dari `sourceContext`
- Hasil verifikasi: grounding terbukti merata, bukan hanya pada `generate-soal-isian-singkat`, tetapi juga pada pilihan ganda, pilihan ganda kompleks, benar-salah, menjodohkan, dan uraian.

#### 3. Export download gagal karena batas `maxParamLength` Fastify

- Gejala: download export dapat gagal pada route dengan parameter panjang.
- Akar masalah: konfigurasi routing/default parser Fastify tidak cocok dengan payload/parameter jalur download tertentu.
- Perbaikan: jalur export/download dan konfigurasi terkait disesuaikan agar request tidak gagal hanya karena batas panjang parameter.

#### 4. Migration `rate_limits` dan `sessions` tertinggal

- Gejala: sebagian fitur auth/rate limit gagal atau tidak konsisten antar environment.
- Akar masalah: migration untuk tabel pendukung auth dan throttling belum terpasang lengkap di seluruh environment.
- Perbaikan: migration backlog dibereskan sehingga schema database konsisten dengan kode runtime.

#### 5. Fixture PDF test tidak valid

- Gejala: `document-upload.test.ts` gagal dengan error `Signature file tidak valid`.
- Akar masalah: test memakai buffer dummy `"pdf"` yang tidak memiliki magic bytes PDF yang sah.
- Perbaikan:
  - fixture diganti ke buffer PDF valid
  - mock storage test dibuat benar-benar mengonsumsi stream agar `ByteCounterTransform` menangkap signature bytes seperti jalur produksi
- Catatan: `sanitizer.ts` tidak diubah karena logic validasinya memang sudah benar.

#### 6. Test `skill-execution` memanggil AI provider asli tanpa mock

- Gejala: `skill-execution.test.ts` timeout karena unit test menyentuh provider AI sungguhan.
- Akar masalah: test worker memanggil `processSkillExecutionJob()` tanpa memutus jalur `AIProviderRegistry`/`executeSkillWithAI`.
- Perbaikan:
  - provider registry dimock
  - `executeSkillWithAI()` dimock dengan output yang valid terhadap schema skill
  - test kembali menjadi unit test yang cepat, deterministik, dan tidak bergantung pada API key atau network eksternal

### Known Issues yang Ditunda

Known issue yang sengaja belum ditangani pada rilis ini didokumentasikan di [docs/known-issues.md](/home/aantriono/Dev/soal/docs/known-issues.md).

Fokus utama yang masih ditunda:

- dependency vulnerability yang penyelesaiannya membutuhkan major upgrade dan perlu window refactor tersendiri

### Status Final

- Release status: `v1.0`
- Backend test suite: `38/38` file test lulus
- Backend test count: `49/49` test lulus
- RAG grounding: sudah diverifikasi end-to-end pada beberapa skill assessment
- Readiness: siap untuk development dan testing penuh
