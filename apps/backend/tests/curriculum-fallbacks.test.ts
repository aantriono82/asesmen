import { describe, expect, it, vi } from "vitest";

const generateStructuredJsonMock = vi.fn(async (input: { fallback?: () => unknown }) => {
  if (input.fallback) {
    return input.fallback();
  }

  return {};
});

vi.mock("../src/application/curricula/structured-generation", () => ({
  generateStructuredJson: generateStructuredJsonMock
}));

describe("curriculum fallbacks", () => {
  it("returns meaningful local content when AI structured generation falls back", async () => {
    const { GenerateSilabusUseCase } = await import("../src/application/curricula/generate-silabus.use-case");
    const { GenerateRppUseCase } = await import("../src/application/curricula/generate-rpp.use-case");
    const { GenerateProtaProsemUseCase } = await import("../src/application/curricula/generate-prota-prosem.use-case");
    const { GenerateKisiKisiUseCase } = await import("../src/application/curricula/generate-kisi-kisi.use-case");

    const silabus = await new GenerateSilabusUseCase().execute({
      subject: "IPA",
      gradeLevel: "Kelas 8 SMP",
      config: { semester: "1", kompetensi_dasar: ["3.5"], alokasi_waktu: "2 x 40 menit" }
    });
    const rpp = await new GenerateRppUseCase().execute({
      subject: "IPA",
      gradeLevel: "Kelas 8 SMP",
      config: { kd: "3.5", materi: "Fotosintesis", alokasi_waktu: "2 x 40 menit", metode_pembelajaran: "Diskusi" }
    });
    const prota = await new GenerateProtaProsemUseCase().execute({
      subject: "IPA",
      gradeLevel: "Kelas 8 SMP",
      config: { academic_year: "2026/2027", kd_list: ["3.5"] }
    });
    const kisi = await new GenerateKisiKisiUseCase({ getAssessment: vi.fn().mockResolvedValue(null) } as never).execute({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      subject: "IPA",
      gradeLevel: "Kelas 8 SMP",
      config: { kd: ["3.5"], indikator: ["Menjelaskan fotosintesis"] }
    });

    expect(JSON.stringify(silabus)).not.toContain("Contoh");
    expect(JSON.stringify(rpp)).not.toContain("Contoh");
    expect(JSON.stringify(prota)).not.toContain("Contoh");
    expect(JSON.stringify(kisi)).not.toContain("Contoh");
    expect(rpp.tujuan_pembelajaran[0].toLowerCase()).toContain("fotosintesis");
    expect(silabus.overview).toContain("IPA");
    expect(prota.annual_plan[0].target).toContain("IPA");
    expect(kisi.items[0].indikator).toContain("fotosintesis");
  });
});
