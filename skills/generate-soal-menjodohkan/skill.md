---
name: Generate Soal Menjodohkan
slug: generate-soal-menjodohkan
preferred_model: deepseek-chat
version: 1.0.0
category: assessment
description: Membuat soal menjodohkan dengan dua kolom premis dan respons
author: ATIGA Team
is_active: true
---

## Description
Skill ini menghasilkan soal menjodohkan dengan dua kolom: kolom kiri berisi premis (pertanyaan/pernyataan) dan kolom kanan berisi respons (jawaban). Kolom kanan dapat memiliki lebih banyak item dari kolom kiri sebagai pengecoh, sehingga siswa tidak bisa menjawab hanya dengan proses eliminasi.

## Inputs
```json
{
  "type": "object",
  "required": ["topic", "gradeLevel", "pairCount"],
  "properties": {
    "topic": { "type": "string" },
    "gradeLevel": { "type": "string" },
    "pairCount": {
      "type": "number",
      "minimum": 3,
      "maximum": 15,
      "description": "Jumlah pasangan yang benar"
    },
    "distractorCount": {
      "type": "number",
      "minimum": 0,
      "maximum": 5,
      "description": "Jumlah respons pengecoh di kolom kanan (default: 2)",
      "default": 2
    },
    "matchingType": {
      "type": "string",
      "enum": ["term-definition", "cause-effect", "concept-example", "question-answer"],
      "description": "Tipe hubungan yang diujikan (default: term-definition)"
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
  "required": ["premises", "responses", "answerPairs"],
  "properties": {
    "instruction": {
      "type": "string",
      "description": "Petunjuk pengerjaan soal"
    },
    "premises": {
      "type": "array",
      "description": "Kolom kiri - item yang harus dijodohkan",
      "items": {
        "type": "object",
        "properties": {
          "number": { "type": "number" },
          "text": { "type": "string" }
        }
      }
    },
    "responses": {
      "type": "array",
      "description": "Kolom kanan - pilihan jawaban (termasuk pengecoh, diacak)",
      "items": {
        "type": "object",
        "properties": {
          "letter": { "type": "string" },
          "text": { "type": "string" }
        }
      }
    },
    "answerPairs": {
      "type": "array",
      "description": "Pasangan jawaban yang benar",
      "items": {
        "type": "object",
        "properties": {
          "premiseNumber": { "type": "number" },
          "responseLetter": { "type": "string" },
          "explanation": { "type": "string" }
        }
      }
    }
  }
}
```

## Prompt
Anda adalah penyusun soal menjodohkan. Buat pasangan item yang jelas, setara tingkat kesulitannya, dan jika `sourceContext` tersedia maka WAJIB gunakan `sourceContext` sebagai sumber istilah serta definisi utama. Gunakan istilah teknis, nama metode, nama bahan, angka, rentang nilai, dan parameter spesifik persis seperti yang muncul di `sourceContext` bila relevan. Jangan mengganti istilah spesifik dari `sourceContext` dengan istilah umum.

## Workflow
1. Validasi input dan telaah `sourceContext`; bila tersedia, ekstrak istilah dan definisi spesifik yang wajib dipakai.
2. Tentukan tipe hubungan (definisi, sebab-akibat, konsep-contoh, dll).
3. Buat pasangan premis-respons yang benar sejumlah pairCount dengan memakai istilah/fakta spesifik dari `sourceContext` bila tersedia.
4. Buat respons pengecoh yang plausibel sejumlah distractorCount.
5. Acak urutan item di kolom kanan.
6. Buat pasangan jawaban benar (answerPairs).
7. Kembalikan hasil dalam format JSON.

## Examples
Input:
```json
{
  "topic": "Organel Sel",
  "gradeLevel": "Kelas 11 SMA",
  "pairCount": 3,
  "distractorCount": 2,
  "matchingType": "term-definition"
}
```

Output:
```json
{
  "instruction": "Jodohkan istilah di kolom kiri dengan definisi yang tepat di kolom kanan!",
  "premises": [
    { "number": 1, "text": "Mitokondria" },
    { "number": 2, "text": "Ribosom" },
    { "number": 3, "text": "Vakuola" }
  ],
  "responses": [
    { "letter": "A", "text": "Organel tempat sintesis protein" },
    { "letter": "B", "text": "Organel penghasil energi (ATP) melalui respirasi seluler" },
    { "letter": "C", "text": "Organel yang mengandung enzim pencernaan sel" },
    { "letter": "D", "text": "Ruang penyimpanan air, mineral, dan zat sisa metabolisme" },
    { "letter": "E", "text": "Organel yang mensintesis lipid dan detoksifikasi" }
  ],
  "answerPairs": [
    { "premiseNumber": 1, "responseLetter": "B", "explanation": "Mitokondria adalah tempat respirasi seluler yang menghasilkan ATP." },
    { "premiseNumber": 2, "responseLetter": "A", "explanation": "Ribosom adalah tempat berlangsungnya sintesis protein." },
    { "premiseNumber": 3, "responseLetter": "D", "explanation": "Vakuola berfungsi sebagai tempat penyimpanan berbagai zat dalam sel." }
  ]
}
```
