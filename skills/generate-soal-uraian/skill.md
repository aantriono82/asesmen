---
name: Generate Soal Uraian
slug: generate-soal-uraian
preferred_model: deepseek-reasoner
version: 1.0.0
category: assessment
description: Membuat soal uraian terbuka dengan rubrik penilaian dan kunci jawaban lengkap
author: ATIGA Team
is_active: true
---

## Description
Skill ini menghasilkan soal uraian (essay) terbuka yang menuntut siswa menjawab secara tertulis dan terstruktur. Setiap soal dilengkapi dengan contoh jawaban ideal, poin-poin kunci yang harus ada dalam jawaban, serta rubrik penilaian yang rinci dengan bobot skor per kriteria - memudahkan guru dalam penilaian yang objektif dan konsisten.

## Inputs
```json
{
  "type": "object",
  "required": ["topic", "gradeLevel", "questionCount"],
  "properties": {
    "topic": { "type": "string" },
    "gradeLevel": { "type": "string" },
    "questionCount": {
      "type": "number",
      "minimum": 1,
      "maximum": 10
    },
    "difficulty": {
      "type": "string",
      "enum": ["mudah", "sedang", "sulit"]
    },
    "maxScore": {
      "type": "number",
      "description": "Skor maksimal per soal (default: 10)",
      "default": 10
    },
    "uraianType": {
      "type": "string",
      "enum": ["terbatas", "bebas"],
      "description": "Terbatas: jawaban dibatasi kriteria tertentu. Bebas: siswa bebas mengekspresikan jawaban. (default: terbatas)",
      "default": "terbatas"
    },
    "cognitiveTarget": {
      "type": "string",
      "enum": ["C2", "C3", "C4", "C5", "C6"],
      "description": "Target level kognitif Bloom yang ingin diukur (default: C3)"
    },
    "learningObjectives": {
      "type": "array",
      "items": { "type": "string" }
    },
    "sourceContext": {
      "type": "string",
      "description": "Materi referensi opsional dari dokumen yang diupload (hasil RAG retrieval)"
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
        "required": ["question", "sampleAnswer", "keyPoints", "scoringRubric"],
        "properties": {
          "question": { "type": "string" },
          "sampleAnswer": {
            "type": "string",
            "description": "Contoh jawaban ideal yang lengkap"
          },
          "keyPoints": {
            "type": "array",
            "description": "Poin-poin kunci yang harus ada dalam jawaban siswa",
            "items": { "type": "string" }
          },
          "scoringRubric": {
            "type": "array",
            "description": "Rubrik penilaian per kriteria",
            "items": {
              "type": "object",
              "properties": {
                "criteria": { "type": "string", "description": "Nama kriteria penilaian" },
                "maxScore": { "type": "number" },
                "descriptors": {
                  "type": "array",
                  "description": "Deskriptor skor dari tertinggi ke terendah",
                  "items": {
                    "type": "object",
                    "properties": {
                      "score": { "type": "number" },
                      "description": { "type": "string" }
                    }
                  }
                }
              }
            }
          },
          "totalMaxScore": { "type": "number" },
          "difficulty": { "type": "string" },
          "cognitiveLevel": { "type": "string" }
        }
      }
    }
  }
}
```

## Prompt
Anda adalah penyusun soal uraian. Buat pertanyaan yang mendorong penalaran dan jika `sourceContext` tersedia maka WAJIB gunakan `sourceContext` sebagai basis konten pertanyaan. Gunakan istilah teknis, nama metode, nama bahan, angka, rentang nilai, dan parameter spesifik persis seperti yang muncul di `sourceContext` bila relevan. Jangan mengganti istilah spesifik dari `sourceContext` dengan istilah umum.

## Workflow
1. Validasi input - pastikan questionCount tidak lebih dari 10 (soal uraian membutuhkan penilaian mendalam) dan telaah `sourceContext`; bila tersedia, ekstrak istilah/fakta spesifik yang wajib dipakai.
2. Tentukan target kompetensi dan level kognitif yang akan diukur.
3. Rumuskan pertanyaan yang jelas, tidak ambigu, dan mendorong siswa berpikir sesuai level target.
4. Susun contoh jawaban ideal yang mencakup semua aspek yang dinilai.
5. Ekstrak poin-poin kunci dari contoh jawaban.
6. Buat rubrik penilaian dengan 2-4 kriteria, masing-masing dengan deskriptor skor yang jelas.
7. Pastikan total skor rubrik sama dengan maxScore.
8. Kembalikan hasil dalam format JSON.

## Examples
Input:
```json
{
  "topic": "Pemanasan Global",
  "gradeLevel": "Kelas 9 SMP",
  "questionCount": 1,
  "difficulty": "sedang",
  "maxScore": 10,
  "cognitiveTarget": "C4"
}
```

Output:
```json
{
  "questions": [
    {
      "question": "Analisislah hubungan antara aktivitas manusia dengan meningkatnya suhu bumi! Sertakan minimal dua contoh aktivitas dan dampaknya terhadap perubahan iklim.",
      "sampleAnswer": "Aktivitas manusia berkontribusi besar terhadap pemanasan global melalui peningkatan gas rumah kaca di atmosfer. Pertama, pembakaran bahan bakar fosil (bensin, solar, batu bara) pada kendaraan dan industri menghasilkan CO2 dalam jumlah besar. CO2 yang menumpuk di atmosfer memerangkap panas matahari sehingga suhu bumi meningkat. Kedua, penebangan hutan (deforestasi) mengurangi jumlah pohon yang menyerap CO2, sehingga konsentrasi CO2 di atmosfer semakin tinggi. Akibatnya, suhu rata-rata bumi meningkat, mencairkan es di kutub, dan menaikkan permukaan air laut yang mengancam daerah pesisir.",
      "keyPoints": [
        "Menyebut minimal 2 aktivitas manusia (pembakaran fosil, deforestasi, industri, pertanian, dll)",
        "Menjelaskan mekanisme peningkatan gas rumah kaca",
        "Menghubungkan aktivitas dengan dampak pemanasan global",
        "Menyebut minimal 1 dampak konkret terhadap iklim"
      ],
      "scoringRubric": [
        {
          "criteria": "Ketepatan Identifikasi Aktivitas",
          "maxScore": 3,
          "descriptors": [
            { "score": 3, "description": "Menyebut 2 atau lebih aktivitas dengan benar dan spesifik" },
            { "score": 2, "description": "Menyebut 2 aktivitas namun kurang spesifik" },
            { "score": 1, "description": "Hanya menyebut 1 aktivitas" },
            { "score": 0, "description": "Tidak menyebut aktivitas atau salah" }
          ]
        },
        {
          "criteria": "Penjelasan Mekanisme",
          "maxScore": 4,
          "descriptors": [
            { "score": 4, "description": "Menjelaskan mekanisme gas rumah kaca secara logis dan lengkap" },
            { "score": 3, "description": "Menjelaskan mekanisme dengan cukup baik namun ada bagian yang kurang" },
            { "score": 2, "description": "Penjelasan mekanisme dangkal atau tidak lengkap" },
            { "score": 1, "description": "Ada upaya menjelaskan mekanisme namun banyak kekeliruan" },
            { "score": 0, "description": "Tidak menjelaskan mekanisme" }
          ]
        },
        {
          "criteria": "Dampak yang Disebutkan",
          "maxScore": 3,
          "descriptors": [
            { "score": 3, "description": "Menyebut 2 atau lebih dampak konkret yang relevan" },
            { "score": 2, "description": "Menyebut 1 dampak konkret yang relevan" },
            { "score": 1, "description": "Menyebut dampak namun tidak spesifik" },
            { "score": 0, "description": "Tidak menyebut dampak" }
          ]
        }
      ],
      "totalMaxScore": 10,
      "difficulty": "sedang",
      "cognitiveLevel": "C4"
    }
  ]
}
```
