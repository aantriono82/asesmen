import { z } from "zod";
import { AppError } from "@lib/errors";
import { DrizzleAssessmentRepository } from "@infra/repositories/drizzle-assessment.repository";

const questionBankCreateSchema = z.object({
  question_id: z.string().uuid()
});

const questionBankUpdateSchema = z.object({
  subject: z.string().trim().min(2).max(120).optional(),
  grade_level: z.string().trim().min(1).max(120).optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).optional()
});

const questionBankSearchSchema = z.object({
  query: z.string().trim().min(1),
  subject: z.string().trim().min(1).optional(),
  type: z.string().trim().min(1).optional()
});

export class ListQuestionBankUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public execute(input: {
    userId: string;
    page?: number;
    limit?: number;
    subject?: string;
    gradeLevel?: string;
    type?: string;
    difficulty?: string;
    tags?: string[];
  }) {
    return this.repository.listQuestionBank(input);
  }
}

export class CreateQuestionBankUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public async execute(input: { userId: string; payload: Record<string, unknown> }) {
    const payload = questionBankCreateSchema.parse(input.payload);
    const question = await this.repository.getQuestionForUser(payload.question_id, input.userId);
    if (!question) {
      throw new AppError("Soal tidak ditemukan", "QUESTION_NOT_FOUND", 404);
    }

    const item = await this.repository.createQuestionBankItem({
      userId: input.userId,
      questionId: payload.question_id,
      subject: question.assessment?.subject ?? null,
      gradeLevel: question.assessment?.gradeLevel ?? null,
      tags: question.tags ?? []
    });

    return item;
  }
}

export class GetQuestionBankUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public async execute(input: { id: string; userId: string }) {
    const item = await this.repository.getQuestionBankItem(input.id, input.userId);
    if (!item) {
      throw new AppError("Soal bank tidak ditemukan", "QUESTION_BANK_NOT_FOUND", 404);
    }

    return item;
  }
}

export class UpdateQuestionBankUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public async execute(input: { id: string; userId: string; payload: Record<string, unknown> }) {
    const payload = questionBankUpdateSchema.parse(input.payload);
    const item = await this.repository.updateQuestionBankItem(input.id, input.userId, {
      ...(payload.subject ? { subject: payload.subject } : {}),
      ...(payload.grade_level ? { gradeLevel: payload.grade_level } : {}),
      ...(payload.tags ? { tags: payload.tags } : {})
    });
    if (!item) {
      throw new AppError("Soal bank tidak ditemukan", "QUESTION_BANK_NOT_FOUND", 404);
    }

    return item;
  }
}

export class DeleteQuestionBankUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public async execute(input: { id: string; userId: string }) {
    const deleted = await this.repository.softDeleteQuestionBankItem(input.id, input.userId);
    if (!deleted) {
      throw new AppError("Soal bank tidak ditemukan", "QUESTION_BANK_NOT_FOUND", 404);
    }

    return { deleted: true };
  }
}

export class SearchQuestionBankUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public execute(input: { userId: string; payload: Record<string, unknown> }) {
    const payload = questionBankSearchSchema.parse(input.payload);
    return this.repository.searchQuestionBank({
      userId: input.userId,
      query: payload.query,
      ...(payload.subject ? { subject: payload.subject } : {}),
      ...(payload.type ? { type: payload.type } : {})
    });
  }
}
