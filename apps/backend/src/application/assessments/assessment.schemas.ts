import { z } from "zod";

export const assessmentSkillSlugSchema = z.enum([
  "generate-soal-pilihan-ganda",
  "generate-soal-pilihan-ganda-kompleks",
  "generate-soal-benar-salah",
  "generate-soal-menjodohkan",
  "generate-soal-isian-singkat",
  "generate-soal-uraian"
]);

export const difficultySchema = z.enum(["mudah", "sedang", "sulit"]);
export const assessmentStatusSchema = z.enum(["draft", "published", "archived", "failed"]);
export const questionTypeSchema = z.enum([
  "multiple_choice",
  "multiple_choice_complex",
  "essay",
  "true_false",
  "matching",
  "fill_blank"
]);

export const questionTypeConfigSchema = z.object({
  skill_slug: assessmentSkillSlugSchema,
  count: z.number().int().positive().max(100),
  score: z.number().int().positive().max(1000)
});

export const assessmentGenerationConfigSchema = z.object({
  total_questions: z.number().int().positive().max(200),
  question_types: z.array(questionTypeConfigSchema).min(1),
  difficulty_mix: z.object({
    mudah: z.number().int().min(0).max(100),
    sedang: z.number().int().min(0).max(100),
    sulit: z.number().int().min(0).max(100)
  }),
  cognitive_levels: z.array(z.enum(["C1", "C2", "C3", "C4", "C5", "C6"])).min(1)
});

export const generateAssessmentInputSchema = z.object({
  title: z.string().trim().min(3).max(255),
  subject: z.string().trim().min(2).max(120),
  grade_level: z.string().trim().min(1).max(120),
  assessment_type: z.enum(["ulangan_harian", "uts", "uas", "try_out", "latihan"]),
  duration_minutes: z.number().int().positive().max(600).optional(),
  instructions: z.string().trim().max(5000).optional(),
  config: assessmentGenerationConfigSchema,
  topic: z.string().trim().min(3).max(2000).optional(),
  knowledge_base_id: z.string().uuid().optional(),
  use_question_bank: z.boolean().optional()
}).superRefine((value, ctx) => {
  if (!value.knowledge_base_id && (!value.topic || value.topic.trim().length < 3)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["topic"],
      message: "topic wajib diisi jika knowledge_base_id tidak digunakan"
    });
  }
});

export const reorderQuestionsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    question_number: z.number().int().positive()
  })
);

export const questionPayloadSchema = z.object({
  type: questionTypeSchema,
  content: z.string().trim().min(3),
  options: z.record(z.unknown()).nullable().optional(),
  correct_answer: z.string().trim().optional(),
  explanation: z.string().trim().optional(),
  difficulty: difficultySchema.optional(),
  cognitive_level: z.enum(["C1", "C2", "C3", "C4", "C5", "C6"]).optional(),
  score: z.number().int().positive().max(1000).optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  source: z.enum(["ai_generated", "manual", "bank"]).optional(),
  generated_by_skill: z.string().trim().max(180).optional()
});

export const updateAssessmentSchema = z.object({
  title: z.string().trim().min(3).max(255).optional(),
  subject: z.string().trim().min(2).max(120).optional(),
  grade_level: z.string().trim().min(1).max(120).optional(),
  assessment_type: z.enum(["ulangan_harian", "uts", "uas", "try_out", "latihan"]).optional(),
  duration_minutes: z.number().int().positive().max(600).nullable().optional(),
  instructions: z.string().trim().max(5000).nullable().optional(),
  status: assessmentStatusSchema.optional(),
  config: z.record(z.unknown()).optional()
});

export type GenerateAssessmentInput = z.infer<typeof generateAssessmentInputSchema>;
export type AssessmentGenerationConfig = z.infer<typeof assessmentGenerationConfigSchema>;
export type QuestionPayload = z.infer<typeof questionPayloadSchema>;
