---
name: Generate Kisi Kisi
slug: generate-kisi-kisi
preferred_model: deepseek-chat
version: 1.0.0
category: assessment
description: Membuat kisi-kisi asesmen dalam format tabel berdasarkan kompetensi
author: ATIGA Team
tags: assessment, kisi-kisi, blueprint
is_active: true
---

## Description
Skill ini menghasilkan kisi-kisi asesmen yang memetakan kompetensi, indikator, materi, dan bentuk soal ke dalam tabel yang mudah ditelaah.

## Inputs
```json
{
  "type": "object",
  "required": ["subject", "grade_level", "curriculum_standard", "competencies"],
  "properties": {
    "subject": { "type": "string", "minLength": 2 },
    "grade_level": { "type": "string", "minLength": 2 },
    "curriculum_standard": { "type": "string", "minLength": 2 },
    "competencies": {
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
  "required": ["table"],
  "properties": {
    "table": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["competency", "indicator", "material", "question_form", "difficulty"],
        "properties": {
          "competency": { "type": "string" },
          "indicator": { "type": "string" },
          "material": { "type": "string" },
          "question_form": { "type": "string" },
          "difficulty": { "type": "string" }
        }
      }
    }
  }
}
```

## Prompt
Anda adalah perancang kisi-kisi asesmen. Peta setiap kompetensi ke indikator yang terukur dan pilih bentuk soal yang sesuai. Susun hasil dalam tabel yang ringkas, rapi, dan mudah digunakan guru.

## Workflow
1. Baca standar kurikulum dan daftar kompetensi.
2. Turunkan indikator yang terukur.
3. Tentukan materi yang diuji.
4. Pilih bentuk soal dan tingkat kesulitan yang sesuai.
5. Kembalikan kisi-kisi dalam format tabel JSON.
