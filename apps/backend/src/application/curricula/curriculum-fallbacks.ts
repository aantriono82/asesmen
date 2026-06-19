function normalizeSubject(subject: string) {
  const value = subject.trim();
  const lower = value.toLowerCase();
  const compact = lower.replace(/\s+/g, "");

  const aliases: Record<string, string> = {
    mtk: "Matematika",
    matematika: "Matematika",
    ipa: "IPA",
    ips: "IPS",
    pai: "PAI",
    pkn: "PPKn",
    ppkn: "PPKn",
    bahasaindonesia: "Bahasa Indonesia",
    "bahasa indonesia": "Bahasa Indonesia",
    bahasainggris: "Bahasa Inggris",
    "bahasa inggris": "Bahasa Inggris"
  };

  return aliases[compact] ?? aliases[lower] ?? value;
}

function normalizeGradeLevel(gradeLevel: string) {
  return gradeLevel.replace(/^kelas\s+/i, "").trim();
}

function normalizeTopic(topic: string) {
  const value = topic.trim();
  const lower = value.toLowerCase();
  const compact = lower.replace(/\s+/g, "");

  const aliases: Record<string, string> = {
    bilbul: "bilangan bulat",
    bilanganbulat: "bilangan bulat",
    pecahan: "pecahan",
    kpk: "kelipatan persekutuan terkecil",
    fpb: "faktor persekutuan terbesar",
    persegipanjang: "persegi panjang",
    fotosintesis: "fotosintesis"
  };

  return aliases[compact] ?? aliases[lower] ?? lower;
}

function classroomPhrase(gradeLevel: string) {
  return `kelas ${normalizeGradeLevel(gradeLevel)}`;
}

export function buildRppFallback(input: {
  subject: string;
  gradeLevel: string;
  config: {
    kd: string;
    materi: string;
    alokasi_waktu: string;
    metode_pembelajaran: string;
  };
}) {
  const subject = normalizeSubject(input.subject);
  const gradeLevel = normalizeGradeLevel(input.gradeLevel);
  const topic = normalizeTopic(input.config.materi || input.subject);
  const kd = input.config.kd;
  const classroom = classroomPhrase(gradeLevel);

  return {
    tujuan_pembelajaran: [
      `Siswa dapat menjelaskan konsep ${topic} dengan bahasa sendiri.`,
      `Siswa dapat mengidentifikasi hubungan antara KD ${kd} dan kehidupan sehari-hari.`,
      `Siswa dapat menyusun ringkasan sederhana tentang pembelajaran ${subject} untuk ${classroom}.`
    ],
    langkah_pembelajaran: {
      pendahuluan: [
        `Guru membuka pembelajaran dengan salam, presensi, dan apersepsi tentang ${topic}.`,
        `Guru mengaitkan materi ${topic} dengan pengalaman siswa di ${classroom}.`
      ],
      inti: [
        `Siswa membaca dan mendiskusikan pokok materi ${topic} berdasarkan KD ${kd}.`,
        `Siswa mengerjakan latihan berpasangan untuk menerapkan konsep utama ${topic}.`,
        `Guru memfasilitasi tanya jawab dan klarifikasi terhadap kesalahan umum yang muncul.`
      ],
      penutup: [
        `Siswa menyimpulkan kembali poin penting pembelajaran hari ini.`,
        `Guru memberikan umpan balik, refleksi singkat, dan tindak lanjut sesuai ${input.config.alokasi_waktu}.`
      ]
    },
    asesmen: [
      `Observasi partisipasi siswa saat diskusi tentang ${topic}.`,
      `Penilaian lembar kerja yang memuat indikator KD ${kd}.`,
      `Kuis singkat untuk memeriksa pemahaman konsep utama.`
    ],
    media: [
      "Papan tulis",
      "Slide presentasi",
      `Ilustrasi atau diagram tentang ${topic}`
    ],
    sumber_belajar: [
      `Buku teks ${subject} ${classroom}`,
      `Catatan guru dan materi ringkas tentang ${topic}`,
      `Lembar kerja siswa yang disiapkan untuk KD ${kd}`
    ]
  };
}

export function buildSilabusFallback(input: {
  subject: string;
  gradeLevel: string;
  config: {
    semester: string;
    kompetensi_dasar: string[];
    alokasi_waktu: string;
  };
}) {
  const subject = normalizeSubject(input.subject);
  const items = (input.config.kompetensi_dasar.length > 0 ? input.config.kompetensi_dasar : ["3.1"]).map((kd, index) => ({
    kompetensi_dasar: kd,
    indikator: [
      `Menjelaskan konsep dasar pada KD ${kd}.`,
      `Memberi contoh penerapan KD ${kd} dalam konteks ${subject.toLowerCase()}.`
    ],
    materi_pokok: `Materi pokok ${index + 1} untuk KD ${kd}`,
    kegiatan_pembelajaran: [
      "Mengamati dan membaca ringkasan materi.",
      "Diskusi kelompok kecil dan presentasi hasil.",
      "Latihan singkat untuk memperkuat pemahaman."
    ],
    penilaian: [
      "Observasi partisipasi diskusi",
      "Tugas individu",
      "Kuis formatif"
    ],
    alokasi_waktu: input.config.alokasi_waktu
  }));

  return {
    overview: `Silabus ${subject} ${classroomPhrase(input.gradeLevel)} semester ${input.config.semester} disusun untuk memetakan KD, indikator, materi, kegiatan, dan penilaian.`,
    items
  };
}

export function buildProtaProsemFallback(input: {
  subject: string;
  gradeLevel: string;
  config: {
    academic_year: string;
    kd_list: string[];
  };
}) {
  const subject = normalizeSubject(input.subject);
  const kdList = input.config.kd_list.length > 0 ? input.config.kd_list : ["3.1"];
  const months = ["Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  return {
    annual_plan: kdList.map((kd, index) => ({
      bulan: months[index % months.length]!,
      kd,
      target: `Siswa mencapai pemahaman dasar pada KD ${kd} dalam mata pelajaran ${subject}.`,
      alokasi_waktu: "4 JP"
    })),
    semester_plan: kdList.map((kd, index) => ({
      semester: index % 2 === 0 ? "1" : "2",
      kd,
      pekan: `${index + 1}`,
      target: `Siswa menuntaskan target pembelajaran KD ${kd} untuk mata pelajaran ${subject} ${classroomPhrase(input.gradeLevel)}.`
    }))
  };
}

export function buildKisiKisiFallback(input: {
  subject: string;
  gradeLevel: string;
  assessmentTitle: string | undefined;
  assessmentQuestions: Array<{
    questionNumber: number;
    type: string;
    content: string;
    cognitiveLevel?: string | null;
  }> | undefined;
    config: {
      kd: string[] | undefined;
      indikator: string[] | undefined;
    };
}) {
  const subject = normalizeSubject(input.subject);
  const sourceItems =
    input.assessmentQuestions && input.assessmentQuestions.length > 0
      ? input.assessmentQuestions.map((question) => ({
          kd: input.config.kd?.[0] ?? `KD terkait soal ${question.questionNumber}`,
          indikator: question.content,
          materi: input.assessmentTitle ?? `Materi ${subject}`,
          level_kognitif: question.cognitiveLevel ?? "C2",
          bentuk_soal: question.type,
          nomor_soal: [question.questionNumber]
        }))
      : (input.config.kd ?? ["3.5"]).map((kd, index) => ({
          kd,
          indikator: input.config.indikator?.[index] ?? `Menjelaskan indikator KD ${kd}.`,
          materi: `Materi ${subject} untuk ${classroomPhrase(input.gradeLevel)}`,
          level_kognitif: "C2",
          bentuk_soal: "uraian",
          nomor_soal: [index + 1]
        }));

  return {
    overview: `Kisi-kisi ${subject} ${classroomPhrase(input.gradeLevel)} memetakan KD, indikator, materi, level kognitif, dan nomor soal secara ringkas.`,
    items: sourceItems
  };
}
