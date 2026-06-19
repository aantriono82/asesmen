import type { SkillRepository } from "@domain/repositories/skill-repository";
import { AppError } from "@lib/errors";
import { generateAssessmentInputSchema, type GenerateAssessmentInput } from "./assessment.schemas";
import { DrizzleAssessmentRepository } from "@infra/repositories/drizzle-assessment.repository";

export interface AssessmentQueue {
  send(jobName: string, payload: Record<string, unknown>): Promise<unknown>;
}

export class GenerateAssessmentUseCase {
  public constructor(
    private readonly skillRepository: SkillRepository,
    private readonly assessments: DrizzleAssessmentRepository,
    private readonly queue: AssessmentQueue
  ) {}

  public async execute(input: { userId: string; payload: GenerateAssessmentInput }): Promise<{ assessmentId: string; status: "draft" }> {
    const payload = generateAssessmentInputSchema.parse(input.payload);
    const totalRequested = payload.config.question_types.reduce((sum, item) => sum + item.count, 0);
    const totalMix = payload.config.difficulty_mix.mudah + payload.config.difficulty_mix.sedang + payload.config.difficulty_mix.sulit;

    if (totalRequested !== payload.config.total_questions) {
      throw new AppError("total_questions harus sama dengan total count question_types", "ASSESSMENT_CONFIG_INVALID", 400);
    }

    if (totalMix !== 100) {
      throw new AppError("difficulty_mix harus berjumlah 100", "ASSESSMENT_CONFIG_INVALID", 400);
    }

    for (const item of payload.config.question_types) {
      const skill = await this.skillRepository.findActiveBySlug(item.skill_slug);
      if (!skill) {
        throw new AppError(`Skill ${item.skill_slug} tidak ditemukan atau tidak aktif`, "ASSESSMENT_SKILL_NOT_FOUND", 404);
      }
    }

    const assessment = await this.assessments.createAssessment({
      userId: input.userId,
      title: payload.title,
      subject: payload.subject,
      gradeLevel: payload.grade_level,
      assessmentType: payload.assessment_type,
      knowledgeBaseId: payload.knowledge_base_id ?? null,
      durationMinutes: payload.duration_minutes ?? null,
      instructions: payload.instructions ?? null,
      config: {
        ...payload.config,
        topic: payload.topic ?? null,
        knowledge_base_id: payload.knowledge_base_id ?? null,
        use_question_bank: payload.use_question_bank ?? false,
        generation_status: "queued"
      },
      status: "draft"
    });

    await this.queue.send("assessment-generation", {
      assessmentId: assessment.id,
      userId: input.userId
    });

    return {
      assessmentId: assessment.id,
      status: "draft"
    };
  }
}
