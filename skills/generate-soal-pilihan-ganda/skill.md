---
name: Generate Soal Pilihan Ganda
slug: generate-soal-pilihan-ganda
preferred_model: deepseek-chat
version: 1.1.0
category: assessment
description: Membuat soal pilihan ganda berdasarkan topik, jenjang kelas, tingkat kesulitan, dan jumlah soal
author: ATIGA Team
tags: assessment, pilihan-ganda, soal, objektif
is_active: true
---

## Description
Skill ini menghasilkan paket soal pilihan ganda yang siap ditinjau guru. Soal disusun dengan empat opsi jawaban, satu kunci benar, dan penjelasan singkat untuk setiap butir.

## Inputs
```json
{
  "type": "object",
  "required": ["topic", "subject", "grade_level", "difficulty", "count", "language"],
  "properties": {
    "topic": { "type": "string", "minLength": 3 },
    "subject": { "type": "string", "minLength": 2 },
    "grade_level": { "type": "string", "minLength": 2 },
    "sourceContext": {
      "type": "string",
      "description": "Materi referensi opsional dari dokumen yang diupload (hasil RAG retrieval)"
    },
    "difficulty": {
      "type": "string",
      "enum": ["easy", "medium", "hard"]
    },
    "count": { "type": "integer", "minimum": 1, "maximum": 50 },
    "language": { "type": "string", "minLength": 2 }
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
        "required": ["question", "options", "correct_answer", "explanation"],
        "properties": {
          "question": { "type": "string" },
          "options": {
            "type": "object",
            "required": ["A", "B", "C", "D"],
            "properties": {
              "A": { "type": "string" },
              "B": { "type": "string" },
              "C": { "type": "string" },
              "D": { "type": "string" }
            }
          },
          "correct_answer": {
            "type": "string",
            "enum": ["A", "B", "C", "D"]
          },
          "explanation": { "type": "string" }
        }
      }
    }
  }
}
```

## Prompt
Anda adalah penyusun soal profesional untuk guru. Buat soal pilihan ganda yang akurat, relevan dengan jenjang kelas, dan tidak ambigu. Gunakan bahasa sesuai `language`. Jika `sourceContext` tersedia, WAJIB gunakan materi tersebut sebagai sumber fakta utama. Gunakan istilah, nama metode, nama bahan, angka, rentang nilai, dan parameter spesifik persis seperti yang muncul di `sourceContext` bila relevan. Jangan mengganti istilah spesifik dari `sourceContext` menjadi istilah umum. Pastikan hanya ada satu jawaban benar dan distraktor masuk akal.

## Workflow
1. Pahami topik, mata pelajaran, jenjang kelas, dan `sourceContext`; bila `sourceContext` tersedia, jadikan itu dasar wajib isi soal.
2. Sesuaikan tingkat kesulitan dengan `difficulty`.
3. Buat `count` soal dengan empat opsi jawaban.
4. Tandai satu jawaban benar pada setiap soal.
5. Berikan penjelasan singkat yang jelas dan tetap memakai istilah/fakta spesifik dari `sourceContext` bila tersedia.
6. Kembalikan hasil sebagai JSON terstruktur.

## Examples
```json
{
  "topic": "Fotosintesis",
  "subject": "IPA",
  "grade_level": "SMP",
  "difficulty": "medium",
  "count": 2,
  "language": "id"
}
```

```json
{
  "questions": [
    {
      "question": "Organel tempat fotosintesis berlangsung adalah ...",
      "options": {
        "A": "Mitokondria",
        "B": "Kloroplas",
        "C": "Ribosom",
        "D": "Nukleus"
      },
      "correct_answer": "B",
      "explanation": "Fotosintesis terjadi di kloroplas yang mengandung klorofil."
    }
  ]
}
```
