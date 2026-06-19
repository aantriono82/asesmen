---
name: Generate Soal Esai
slug: generate-soal-esai
version: 1.0.0
category: assessment
description: Membuat soal esai dengan kunci jawaban, poin penting, dan skor maksimal
author: ATIGA Team
tags: assessment, esai, uraian, soal
is_active: true
---

## Description
Skill ini menghasilkan soal esai yang menuntut jawaban terbuka. Setiap soal dilengkapi poin penting, contoh jawaban, dan batas skor agar mudah dinilai guru.

## Inputs
```json
{
  "type": "object",
  "required": ["topic", "subject", "grade_level", "difficulty", "count", "scoring_criteria"],
  "properties": {
    "topic": { "type": "string", "minLength": 3 },
    "subject": { "type": "string", "minLength": 2 },
    "grade_level": { "type": "string", "minLength": 2 },
    "difficulty": {
      "type": "string",
      "enum": ["easy", "medium", "hard"]
    },
    "count": { "type": "integer", "minimum": 1, "maximum": 20 },
    "scoring_criteria": {
      "type": "array",
      "minItems": 1,
      "items": { "type": "string" }
    }
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
      "items": {
        "type": "object",
        "required": ["question", "key_points", "max_score", "sample_answer"],
        "properties": {
          "question": { "type": "string" },
          "key_points": {
            "type": "array",
            "items": { "type": "string" }
          },
          "max_score": { "type": "integer" },
          "sample_answer": { "type": "string" }
        }
      }
    }
  }
}
```

## Prompt
Anda adalah guru penyusun asesmen. Buat soal esai yang sesuai jenjang kelas, menuntut penalaran yang jelas, dan selaras dengan kriteria penilaian yang diberikan. Pastikan jawaban contoh tidak terlalu singkat dan benar secara konsep.

## Workflow
1. Pahami topik, mapel, dan tingkat kelas.
2. Susun pertanyaan esai yang jelas.
3. Turunkan poin kunci dari konsep utama.
4. Tulis contoh jawaban yang ideal.
5. Tetapkan skor maksimal per soal.
6. Kembalikan hasil dalam JSON.
