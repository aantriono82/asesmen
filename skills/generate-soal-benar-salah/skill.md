---
name: Generate Soal Benar Salah
slug: generate-soal-benar-salah
preferred_model: deepseek-chat
version: 1.1.0
category: assessment
description: Membuat soal pernyataan benar-salah dengan penjelasan yang akurat
author: ATIGA Team
tags: assessment, benar-salah, soal, objektif
is_active: true
---

## Description
Skill ini menghasilkan pernyataan yang harus dinilai benar atau salah. Pernyataan dibuat faktual, relevan dengan jenjang kelas, dan bisa dipakai langsung sebagai bahan asesmen.

## Inputs
```json
{
  "type": "object",
  "required": ["topic", "subject", "grade_level", "count"],
  "properties": {
    "topic": { "type": "string", "minLength": 3 },
    "subject": { "type": "string", "minLength": 2 },
    "grade_level": { "type": "string", "minLength": 2 },
    "sourceContext": {
      "type": "string",
      "description": "Materi referensi opsional dari dokumen yang diupload (hasil RAG retrieval)"
    },
    "count": { "type": "integer", "minimum": 1, "maximum": 50 }
  }
}
```

## Outputs
```json
{
  "type": "object",
  "required": ["questions"],
  "properties": {
    "questions": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["statement", "is_true", "explanation"],
        "properties": {
          "statement": { "type": "string" },
          "is_true": { "type": "boolean" },
          "explanation": { "type": "string" }
        }
      }
    }
  }
}
```

## Prompt
Anda adalah penyusun soal pendidikan. Tulis pernyataan benar-salah yang singkat, jelas, dan tidak menimbulkan penafsiran ganda. Jika `sourceContext` tersedia, WAJIB jadikan itu dasar utama fakta. Gunakan istilah, nama metode, nama bahan, angka, rentang nilai, dan parameter spesifik persis seperti yang muncul di `sourceContext` bila relevan. Jangan mengganti istilah spesifik dari `sourceContext` menjadi istilah umum. Jaga konsistensi fakta dan berikan penjelasan yang lugas.

## Workflow
1. Pahami topik, mata pelajaran, jenjang kelas, dan `sourceContext`; bila tersedia, gunakan fakta/istilah spesifiknya sebagai dasar wajib.
2. Susun `count` pernyataan dengan campuran benar dan salah.
3. Pastikan pernyataan salah masih terdengar masuk akal.
4. Jelaskan alasan mengapa pernyataan benar atau salah.
5. Kembalikan hasil sebagai JSON.

## Examples
```json
{
  "topic": "Fotosintesis",
  "subject": "IPA",
  "grade_level": "SMP",
  "count": 2
}
```

```json
{
  "questions": [
    {
      "statement": "Fotosintesis menghasilkan oksigen sebagai salah satu produk sampingan.",
      "is_true": true,
      "explanation": "Benar, karena pada reaksi terang terjadi pemecahan air yang menghasilkan oksigen."
    }
  ]
}
```
