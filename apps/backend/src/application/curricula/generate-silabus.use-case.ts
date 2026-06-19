import { z } from "zod";
import { silabusInputSchema } from "./curriculum.schemas";
import { generateStructuredJson } from "./structured-generation";
import { buildSilabusFallback } from "./curriculum-fallbacks";

const silabusOutputSchema = z.object({
  overview: z.string(),
  items: z.array(
    z.object({
      kompetensi_dasar: z.string(),
      indikator: z.array(z.string()).min(1),
      materi_pokok: z.string(),
      kegiatan_pembelajaran: z.array(z.string()).min(1),
      penilaian: z.array(z.string()).min(1),
      alokasi_waktu: z.string()
    })
  ).min(1)
});

export class GenerateSilabusUseCase {
  public async execute(input: { subject: string; gradeLevel: string; config: Record<string, unknown> }) {
    const config = silabusInputSchema.parse(input.config);
    return generateStructuredJson({
      systemPrompt:
        "Anda adalah perancang kurikulum sekolah Indonesia. Kembalikan hanya JSON valid dan gunakan bahasa yang jelas untuk guru.",
      userPrompt: [
        `Buat silabus ${input.subject} untuk kelas ${input.gradeLevel}.`,
        `Semester: ${config.semester}.`,
        `Kompetensi dasar: ${config.kompetensi_dasar.join(", ")}.`,
        `Alokasi waktu: ${config.alokasi_waktu}.`,
        "Berikan overview singkat dan daftar item silabus yang realistis, operasional, dan selaras dengan KD."
      ].join("\n"),
      schema: silabusOutputSchema,
      fallback: () =>
        buildSilabusFallback({
          subject: input.subject,
          gradeLevel: input.gradeLevel,
          config
        })
    });
  }
}
