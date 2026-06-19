import { z } from "zod";
import { protaProsemInputSchema } from "./curriculum.schemas";
import { generateStructuredJson } from "./structured-generation";
import { buildProtaProsemFallback } from "./curriculum-fallbacks";

const protaProsemOutputSchema = z.object({
  annual_plan: z.array(
    z.object({
      bulan: z.string(),
      kd: z.string(),
      target: z.string(),
      alokasi_waktu: z.string()
    })
  ).min(1),
  semester_plan: z.array(
    z.object({
      semester: z.string(),
      kd: z.string(),
      pekan: z.string(),
      target: z.string()
    })
  ).min(1)
});

export class GenerateProtaProsemUseCase {
  public async execute(input: { subject: string; gradeLevel: string; config: Record<string, unknown> }) {
    const config = protaProsemInputSchema.parse(input.config);
    return generateStructuredJson({
      systemPrompt:
        "Anda adalah perancang program tahunan dan program semester. Hasil harus natural, realistis, dan berupa JSON valid.",
      userPrompt: [
        `Buat Prota dan Prosem ${input.subject} kelas ${input.gradeLevel}.`,
        `Tahun akademik: ${config.academic_year}.`,
        `Daftar KD: ${config.kd_list.join(", ")}.`,
        "Susun target dan alokasi yang masuk akal untuk guru."
      ].join("\n"),
      schema: protaProsemOutputSchema,
      fallback: () =>
        buildProtaProsemFallback({
          subject: input.subject,
          gradeLevel: input.gradeLevel,
          config
        })
    });
  }
}
