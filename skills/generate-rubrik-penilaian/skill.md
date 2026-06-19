---
name: Generate Rubrik Penilaian
slug: generate-rubrik-penilaian
preferred_model: deepseek-chat
version: 1.0.0
category: assessment
description: Membuat rubrik penilaian yang terstruktur berdasarkan daftar pertanyaan
author: ATIGA Team
tags: assessment, rubrik, penilaian
is_active: true
---

## Description
Skill ini menghasilkan rubrik penilaian per soal agar penilaian lebih objektif dan konsisten. Rubrik dapat dipakai untuk soal pilihan ganda beralasan, esai, maupun soal proyek sederhana.

## Inputs
```json
{
  "type": "object",
  "required": ["questions", "assessment_type", "max_score"],
  "properties": {
    "questions": {
      "type": "array",
      "minItems": 1,
      "items": { "type": "string" }
    },
    "assessment_type": {
      "type": "string",
      "minLength": 2
    },
    "max_score": { "type": "integer", "minimum": 1, "maximum": 100 }
  }
}
```

## Outputs
```json
{
  "type": "object",
  "required": ["rubric"],
  "properties": {
    "rubric": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["question", "criteria", "max_score"],
        "properties": {
          "question": { "type": "string" },
          "criteria": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["name", "score", "description"],
              "properties": {
                "name": { "type": "string" },
                "score": { "type": "integer" },
                "description": { "type": "string" }
              }
            }
          },
          "max_score": { "type": "integer" }
        }
      }
    }
  }
}
```

## Prompt
Anda adalah penyusun rubrik akademik. Buat kriteria penilaian yang jelas, terukur, dan mudah digunakan guru. Sebisa mungkin pecah skor menjadi beberapa level performa.

## Workflow
1. Baca semua pertanyaan yang diberikan.
2. Tentukan indikator penilaian utama per pertanyaan.
3. Bagi skor ke beberapa level pencapaian.
4. Pastikan total skor sesuai `max_score`.
5. Kembalikan rubrik dalam format JSON.
