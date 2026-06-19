import { z } from "zod";
import { rppInputSchema } from "./curriculum.schemas";
import { generateStructuredJson } from "./structured-generation";
import { buildRppFallback } from "./curriculum-fallbacks";

const rppOutputSchema = z.object({
  tujuan_pembelajaran: z.array(z.string()).min(1),
  langkah_pembelajaran: z.object({
    pendahuluan: z.array(z.string()).min(1),
    inti: z.array(z.string()).min(1),
    penutup: z.array(z.string()).min(1)
  }),
  asesmen: z.array(z.string()).min(1),
  media: z.array(z.string()).min(1),
  sumber_belajar: z.array(z.string()).min(1)
});

export class GenerateRppUseCase {
  public async execute(input: { subject: string; gradeLevel: string; config: Record<string, unknown> }) {
    const config = rppInputSchema.parse(input.config);
    return generateStructuredJson({
      systemPrompt:
        "Anda adalah perancang RPP yang ringkas, terstruktur, dan siap digunakan guru. Hasil harus berupa JSON valid dengan bahasa Indonesia yang natural dan spesifik.",
      userPrompt: [
        `Buat RPP mata pelajaran ${input.subject} kelas ${input.gradeLevel}.`,
        `KD: ${config.kd}.`,
        `Materi: ${config.materi}.`,
        `Alokasi waktu: ${config.alokasi_waktu}.`,
        `Metode pembelajaran: ${config.metode_pembelajaran}.`,
        "Susun tujuan pembelajaran, langkah pembelajaran, asesmen, media, dan sumber belajar yang saling selaras dengan materi."
      ].join("\n"),
      schema: rppOutputSchema,
      fallback: () =>
        buildRppFallback({
          subject: input.subject,
          gradeLevel: input.gradeLevel,
          config
        })
    });
  }
}
