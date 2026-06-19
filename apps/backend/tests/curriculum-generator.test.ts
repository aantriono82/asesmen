import { describe, expect, it, vi } from "vitest";

const generateStructuredJsonMock = vi.fn();

vi.mock("../src/application/curricula/structured-generation", () => ({
  generateStructuredJson: generateStructuredJsonMock
}));

describe("curriculum generator", () => {
  it("generates silabus, rpp, prota/prosem, and kisi-kisi payloads", async () => {
    generateStructuredJsonMock
      .mockResolvedValueOnce({ overview: "Silabus", items: [{ kompetensi_dasar: "KD 1", indikator: ["Ind 1"], materi_pokok: "Materi", kegiatan_pembelajaran: ["Kegiatan"], penilaian: ["Tes"], alokasi_waktu: "2 JP" }] })
      .mockResolvedValueOnce({ tujuan_pembelajaran: ["Tujuan"], langkah_pembelajaran: { pendahuluan: ["A"], inti: ["B"], penutup: ["C"] }, asesmen: ["Tes"], media: ["Slide"], sumber_belajar: ["Buku"] })
      .mockResolvedValueOnce({ annual_plan: [{ bulan: "Juli", kd: "KD 1", target: "Target", alokasi_waktu: "4 JP" }], semester_plan: [{ semester: "1", kd: "KD 1", pekan: "1", target: "Target" }] })
      .mockResolvedValueOnce({ overview: "Kisi", items: [{ kd: "3.5", indikator: "Menjelaskan", materi: "Fotosintesis", level_kognitif: "C2", bentuk_soal: "essay", nomor_soal: [1] }] });

    const { GenerateSilabusUseCase } = await import("../src/application/curricula/generate-silabus.use-case");
    const { GenerateRppUseCase } = await import("../src/application/curricula/generate-rpp.use-case");
    const { GenerateProtaProsemUseCase } = await import("../src/application/curricula/generate-prota-prosem.use-case");
    const { GenerateKisiKisiUseCase } = await import("../src/application/curricula/generate-kisi-kisi.use-case");

    const silabus = await new GenerateSilabusUseCase().execute({
      subject: "IPA",
      gradeLevel: "VIII",
      config: { semester: "1", kompetensi_dasar: ["3.5"], alokasi_waktu: "2 x 40 menit" }
    });
    const rpp = await new GenerateRppUseCase().execute({
      subject: "IPA",
      gradeLevel: "VIII",
      config: { kd: "3.5", materi: "Fotosintesis", alokasi_waktu: "2 x 40 menit", metode_pembelajaran: "Diskusi" }
    });
    const prota = await new GenerateProtaProsemUseCase().execute({
      subject: "IPA",
      gradeLevel: "VIII",
      config: { academic_year: "2026/2027", kd_list: ["3.5"] }
    });
    const kisi = await new GenerateKisiKisiUseCase({ getAssessment: vi.fn().mockResolvedValue(null) } as never).execute({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      subject: "IPA",
      gradeLevel: "VIII",
      config: { kd: ["3.5"], indikator: ["Menjelaskan fotosintesis"] }
    });

    expect(silabus).toHaveProperty("items");
    expect(rpp).toHaveProperty("langkah_pembelajaran");
    expect(prota).toHaveProperty("annual_plan");
    expect(kisi).toHaveProperty("items");
  });
});
