# Skill Development Guide

1. Tambahkan definisi skill di direktori skill project.
2. Pastikan metadata memuat `name`, `slug`, `version`, `category`, `input_schema`, `output_schema`.
3. Jalankan sinkronisasi:

```bash
POST /api/admin/skills/sync
```

4. Bila skill dipakai generator assessment, gunakan `skill_slug` pada konfigurasi assessment.
5. Pantau eksekusi di `skill_executions` dan metrik `skill_executions_total`.
