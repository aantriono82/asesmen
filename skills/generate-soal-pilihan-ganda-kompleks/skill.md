---
name: Generate Soal Pilihan Ganda Kompleks
slug: generate-soal-pilihan-ganda-kompleks
preferred_model: deepseek-reasoner
version: 1.0.0
category: assessment
description: Membuat soal pilihan ganda kompleks (HOTS) dengan lebih dari satu jawaban benar
author: ATIGA Team
is_active: true
---

## Description
Skill ini menghasilkan soal pilihan ganda kompleks untuk mengukur kemampuan berpikir tingkat tinggi (HOTS - Higher Order Thinking Skills). Berbeda dengan pilihan ganda biasa, soal ini memiliki 4-5 opsi jawaban dengan lebih dari satu jawaban yang benar. Siswa harus memilih semua jawaban yang benar untuk mendapat nilai penuh.

## Inputs
```json
{
  "type": "object",
  "required": ["topic", "gradeLevel", "difficulty", "questionCount"],
  "properties": {
    "topic": {
      "type": "string",
      "description": "Topik pembelajaran yang akan diujikan"
    },
    "gradeLevel": {
      "type": "string",
      "description": "Tingkat kelas atau jenjang peserta didik"
    },
    "difficulty": {
      "type": "string",
      "enum": ["sedang", "sulit"],
      "description": "Soal kompleks minimal sedang, cocok untuk HOTS"
    },
    "questionCount": {
      "type": "number",
      "minimum": 1,
      "maximum": 30
    },
    "optionCount": {
      "type": "number",
      "minimum": 4,
      "maximum": 5,
      "description": "Jumlah opsi per soal (default: 5)"
    },
    "minCorrect": {
      "type": "number",
      "minimum": 2,
      "description": "Minimal jawaban benar per soal (default: 2)"
    },
    "maxCorrect": {
      "type": "number",
      "maximum": 4,
      "description": "Maksimal jawaban benar per soal (default: 3)"
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
        "required": ["question", "options", "correctAnswers", "explanation"],
        "properties": {
          "question": { "type": "string" },
          "options": {
            "type": "array",
            "minItems": 4,
            "maxItems": 5,
            "items": {
              "type": "object",
              "properties": {
                "key": { "type": "string", "enum": ["A", "B", "C", "D", "E"] },
                "text": { "type": "string" }
              }
            }
          },
          "correctAnswers": {
            "type": "array",
            "description": "Array kunci jawaban yang benar, misal: ['A', 'C', 'D']",
            "items": { "type": "string", "enum": ["A", "B", "C", "D", "E"] },
            "minItems": 2
          },
          "explanation": { "type": "string" },
          "difficulty": { "type": "string" },
          "cognitiveLevel": {
            "type": "string",
            "description": "Level Bloom: C4 (Analisis), C5 (Evaluasi), C6 (Mencipta)"
          }
        }
      }
    }
  }
}
```

## Prompt
Anda adalah perancang soal pilihan ganda kompleks. Susun soal HOTS yang analitis, tetap sesuai jenjang kelas, dan jika `sourceContext` tersedia maka WAJIB gunakan `sourceContext` sebagai rujukan utama. Gunakan istilah teknis, nama metode, nama bahan, angka, rentang nilai, dan parameter spesifik persis seperti yang muncul di `sourceContext` bila relevan. Jangan mengganti istilah spesifik dari `sourceContext` dengan istilah umum.

## Workflow
1. Validasi input - pastikan difficulty minimal "sedang" dan telaah `sourceContext`; bila tersedia, ekstrak istilah/fakta spesifik yang wajib muncul dalam stimulus atau opsi.
2. Tentukan kompetensi HOTS yang akan diukur (analisis, evaluasi, atau sintesis).
3. Buat soal dengan skenario atau stimulus yang membutuhkan pemikiran kritis.
4. Buat 4-5 opsi jawaban dimana 2-3 di antaranya benar.
5. Pastikan opsi yang salah (distraktor) masuk akal dan tidak mudah ditebak.
6. Tulis penjelasan yang mencakup mengapa setiap jawaban benar atau salah.
7. Kembalikan hasil dalam format JSON terstruktur.

## Examples
Input:
```json
{
  "topic": "Ekosistem dan Rantai Makanan",
  "gradeLevel": "Kelas 10 SMA",
  "difficulty": "sulit",
  "questionCount": 1,
  "optionCount": 5,
  "minCorrect": 2,
  "maxCorrect": 3
}
```

Output:
```json
{
  "questions": [
    {
      "question": "Perhatikan rantai makanan berikut: Rumput -> Belalang -> Katak -> Ular -> Elang. Pernyataan yang BENAR mengenai ekosistem ini adalah ...",
      "options": [
        { "key": "A", "text": "Jika populasi katak menurun drastis, populasi belalang akan meningkat" },
        { "key": "B", "text": "Elang merupakan konsumen tingkat pertama" },
        { "key": "C", "text": "Energi yang berpindah dari satu tingkat trofik ke tingkat berikutnya tidak pernah 100%" },
        { "key": "D", "text": "Rumput mendapatkan energi dari belalang" },
        { "key": "E", "text": "Ular berperan sebagai konsumen tingkat ketiga dalam rantai ini" }
      ],
      "correctAnswers": ["A", "C", "E"],
      "explanation": "A benar: predator katak (belalang) akan meningkat jika katak berkurang. C benar: hanya sebagian kecil energi berpindah antar tingkat trofik. E benar: ular memakan katak (konsumen 2) sehingga ular adalah konsumen tingkat 3. B salah: elang adalah konsumen tingkat 4. D salah: rumput adalah produsen yang mendapat energi dari matahari.",
      "difficulty": "sulit",
      "cognitiveLevel": "C4"
    }
  ]
}
```
