import { z } from "zod";

export const assessmentWizardSchema = z.object({
  title: z.string().trim().min(3),
  subject: z.string().trim().min(2),
  grade_level: z.string().trim().min(1),
  assessment_type: z.enum(["ulangan_harian", "uts", "uas", "try_out", "latihan"]),
  duration_minutes: z.number().int().positive().max(600),
  instructions: z.string().trim().optional(),
  content_source: z.enum(["topic", "knowledge_base"]),
  topic: z.string().trim().optional(),
  knowledge_base_id: z.string().uuid().optional(),
  use_question_bank: z.boolean(),
  cognitive_levels: z.array(z.enum(["C1", "C2", "C3", "C4", "C5", "C6"])).min(1),
  difficulty_mix: z.object({
    mudah: z.number().int().min(0).max(100),
    sedang: z.number().int().min(0).max(100),
    sulit: z.number().int().min(0).max(100)
  }),
  question_types: z.array(
    z.object({
      skill_slug: z.string().min(1),
      count: z.number().int().min(0).max(100),
      score: z.number().int().positive().max(100)
    })
  ).min(1)
}).superRefine((value, ctx) => {
  if (value.content_source === "topic" && (!value.topic || value.topic.trim().length < 3)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["topic"],
      message: "Topik wajib diisi"
    });
  }

  if (value.content_source === "knowledge_base" && !value.knowledge_base_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["knowledge_base_id"],
      message: "Knowledge Base wajib dipilih"
    });
  }
});

export type AssessmentWizardValues = z.infer<typeof assessmentWizardSchema>;
