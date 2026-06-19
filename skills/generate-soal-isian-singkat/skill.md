---
name: Generate Soal Isian Singkat
slug: generate-soal-isian-singkat
preferred_model: deepseek-chat
version: 1.0.0
category: assessment
description: Membuat soal isian singkat berupa kalimat rumpang yang harus dilengkapi siswa
author: ATIGA Team
is_active: true
---

## Description
Skill ini menghasilkan soal isian singkat berupa kalimat rumpang (cloze test) yang harus diisi siswa dengan satu kata, frasa pendek, atau angka. Setiap soal dilengkapi dengan kunci jawaban utama dan variasi jawaban lain yang dapat diterima, sehingga memudahkan guru dalam koreksi.

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
      "maximum": 50
    },
    "blankPosition": {
      "type": "string",
      "enum": ["awal", "tengah", "akhir", "acak"],
      "description": "Posisi rumpang dalam kalimat (default: acak)",
      "default": "acak"
    },
    "answerType": {
      "type": "string",
      "enum": ["kata", "frasa", "angka", "campuran"],
      "description": "Tipe jawaban yang diharapkan (default: campuran)"
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
        "required": ["statement", "correctAnswer", "acceptedAnswers", "explanation"],
        "properties": {
          "statement": {
            "type": "string",
            "description": "Kalimat rumpang dengan ___ sebagai penanda titik isian"
          },
          "correctAnswer": {
            "type": "string",
            "description": "Jawaban utama yang paling tepat"
          },
          "acceptedAnswers": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Variasi jawaban lain yang dapat diterima (sinonim, ejaan lain, dll)"
          },
          "explanation": { "type": "string" },
          "difficulty": { "type": "string" },
          "cognitiveLevel": { "type": "string" }
        }
      }
    }
  }
}
```

## Prompt
Anda adalah penyusun soal isian singkat. Buat pertanyaan yang spesifik, dapat dijawab singkat, dan jika `sourceContext` tersedia maka WAJIB gunakan materi tersebut sebagai dasar utama. Gunakan istilah, nama metode, nama bahan, angka, rentang nilai, dan parameter spesifik persis seperti yang muncul di `sourceContext` bila relevan. Jangan mengganti istilah spesifik dari `sourceContext` dengan istilah umum.

## Workflow
1. Validasi input dan telaah `sourceContext`; bila tersedia, ekstrak istilah dan fakta spesifik yang wajib muncul di soal.
2. Identifikasi konsep kunci dari topik yang akan diujikan, dengan mendahulukan konsep yang eksplisit muncul di `sourceContext`.
3. Buat kalimat pernyataan yang bermakna dan gramatikal.
4. Tentukan posisi rumpang (___) sesuai blankPosition.
5. Tentukan jawaban utama yang paling tepat.
6. Identifikasi variasi jawaban lain yang bisa diterima.
7. Tulis penjelasan singkat mengapa jawaban tersebut benar dengan tetap grounded pada istilah/fakta spesifik dari `sourceContext`.
8. Kembalikan hasil dalam format JSON.

## Examples
Input:
```json
{
  "topic": "Sistem Tata Surya",
  "gradeLevel": "Kelas 6 SD",
  "questionCount": 2,
  "blankPosition": "akhir"
}
```

Output:
```json
{
  "questions": [
    {
      "statement": "Planet yang letaknya paling dekat dengan Matahari adalah ___.",
      "correctAnswer": "Merkurius",
      "acceptedAnswers": ["merkurius", "Merkurius", "planet merkurius"],
      "explanation": "Merkurius adalah planet pertama dalam urutan tata surya, paling dekat dengan Matahari.",
      "difficulty": "mudah",
      "cognitiveLevel": "C1"
    },
    {
      "statement": "Benda langit yang mengorbit planet dan bukan buatan manusia disebut ___.",
      "correctAnswer": "satelit alami",
      "acceptedAnswers": ["satelit", "satelit alam", "bulan"],
      "explanation": "Satelit alami adalah benda langit yang secara alami mengorbit sebuah planet, seperti Bulan yang mengorbit Bumi.",
      "difficulty": "sedang",
      "cognitiveLevel": "C1"
    }
  ]
}
```
