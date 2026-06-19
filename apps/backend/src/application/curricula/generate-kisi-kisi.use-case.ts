import { z } from "zod";
import { AppError } from "@lib/errors";
import { DrizzleAssessmentRepository } from "@infra/repositories/drizzle-assessment.repository";
import { kisiKisiInputSchema } from "./curriculum.schemas";
import { generateStructuredJson } from "./structured-generation";
import { buildKisiKisiFallback } from "./curriculum-fallbacks";

const kisiKisiOutputSchema = z.object({
  overview: z.string(),
  items: z.array(
    z.object({
      kd: z.string(),
      indikator: z.string(),
      materi: z.string(),
      level_kognitif: z.string(),
      bentuk_soal: z.string(),
      nomor_soal: z.array(z.number()).min(1)
    })
  ).min(1)
});

export class GenerateKisiKisiUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public async execute(input: { userId: string; subject: string; gradeLevel: string; config: Record<string, unknown> }) {
    const config = kisiKisiInputSchema.parse(input.config);
    let assessment:
      | {
          title: string;
          questions: Array<{ questionNumber: number; type: string; content: string; cognitiveLevel?: string | null }>;
        }
      | null = null;

    const lines: string[] = [
      `Buat kisi-kisi ${input.subject} kelas ${input.gradeLevel}.`
    ];

    if (config.assessment_id) {
      const foundAssessment = await this.repository.getAssessment(config.assessment_id, input.userId);
      if (!foundAssessment) {
        throw new AppError("Assessment untuk kisi-kisi tidak ditemukan", "ASSESSMENT_NOT_FOUND", 404);
      }
      assessment = {
        title: foundAssessment.title,
        questions: foundAssessment.questions.map((question) => ({
          questionNumber: question.questionNumber,
          type: question.type,
          content: question.content,
          cognitiveLevel: question.cognitiveLevel
        }))
      };
      lines.push(`Gunakan assessment: ${foundAssessment.title}.`);
      lines.push(
        `Data soal: ${foundAssessment.questions
          .map((question) => `No ${question.questionNumber} [${question.type}] ${question.content} (${question.cognitiveLevel ?? "tanpa level"})`)
          .join("\n")}`
      );
    } else {
      lines.push(`KD: ${(config.kd ?? []).join(", ")}.`);
      lines.push(`Indikator: ${(config.indikator ?? []).join(", ")}.`);
    }

    return generateStructuredJson({
      systemPrompt:
        "Anda adalah perancang kisi-kisi ujian sekolah. Kembalikan hanya JSON valid dan gunakan bahasa Indonesia yang operasional.",
      userPrompt: lines.join("\n"),
      schema: kisiKisiOutputSchema,
      fallback: () =>
        buildKisiKisiFallback({
          subject: input.subject,
          gradeLevel: input.gradeLevel,
          assessmentTitle: assessment?.title ?? undefined,
          assessmentQuestions: assessment?.questions ?? undefined,
          config: {
            kd: config.kd,
            indikator: config.indikator
          }
        })
    });
  }
}
