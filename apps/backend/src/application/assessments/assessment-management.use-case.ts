import { AppError } from "@lib/errors";
import { DrizzleAssessmentRepository } from "@infra/repositories/drizzle-assessment.repository";
import { questionPayloadSchema, reorderQuestionsSchema, updateAssessmentSchema } from "./assessment.schemas";

export class ListAssessmentsUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public execute(input: { userId: string; page?: number; limit?: number; subject?: string; status?: string }) {
    return this.repository.listAssessments(input);
  }
}

export class GetAssessmentUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public async execute(input: { assessmentId: string; userId: string }) {
    const record = await this.repository.getAssessment(input.assessmentId, input.userId);
    if (!record) {
      throw new AppError("Assessment tidak ditemukan", "ASSESSMENT_NOT_FOUND", 404);
    }

    return record;
  }
}

export class GetAssessmentStatusUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public async execute(input: { assessmentId: string; userId: string }) {
    const record = await this.repository.getAssessment(input.assessmentId, input.userId);
    if (!record) {
      throw new AppError("Assessment tidak ditemukan", "ASSESSMENT_NOT_FOUND", 404);
    }

    return {
      id: record.id,
      status: record.status,
      config: record.config
    };
  }
}

export class UpdateAssessmentUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public async execute(input: { assessmentId: string; userId: string; payload: Record<string, unknown> }) {
    const patch = updateAssessmentSchema.parse(input.payload);
    const updated = await this.repository.updateAssessment(input.assessmentId, input.userId, {
      ...(patch.title ? { title: patch.title } : {}),
      ...(patch.subject ? { subject: patch.subject } : {}),
      ...(patch.grade_level ? { gradeLevel: patch.grade_level } : {}),
      ...(patch.assessment_type ? { assessmentType: patch.assessment_type } : {}),
      ...(patch.duration_minutes !== undefined ? { durationMinutes: patch.duration_minutes } : {}),
      ...(patch.instructions !== undefined ? { instructions: patch.instructions } : {}),
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.config ? { config: patch.config } : {})
    });
    if (!updated) {
      throw new AppError("Assessment tidak ditemukan", "ASSESSMENT_NOT_FOUND", 404);
    }

    return updated;
  }
}

export class DeleteAssessmentUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public async execute(input: { assessmentId: string; userId: string }) {
    const deleted = await this.repository.softDeleteAssessment(input.assessmentId, input.userId);
    if (!deleted) {
      throw new AppError("Assessment tidak ditemukan", "ASSESSMENT_NOT_FOUND", 404);
    }

    return { deleted: true };
  }
}

export class AddQuestionUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public async execute(input: { assessmentId: string; userId: string; payload: Record<string, unknown> }) {
    const assessment = await this.repository.getAssessment(input.assessmentId, input.userId);
    if (!assessment) {
      throw new AppError("Assessment tidak ditemukan", "ASSESSMENT_NOT_FOUND", 404);
    }
    const payload = questionPayloadSchema.parse(input.payload);

    return this.repository.addQuestion(input.assessmentId, {
      questionNumber: assessment.questions.length + 1,
      type: payload.type,
      content: payload.content,
      options: payload.options ?? null,
      correctAnswer: payload.correct_answer ?? null,
      explanation: payload.explanation ?? null,
      difficulty: payload.difficulty ?? null,
      cognitiveLevel: payload.cognitive_level ?? null,
      score: payload.score ?? 1,
      tags: payload.tags ?? [],
      source: payload.source ?? "manual",
      generatedBySkill: payload.generated_by_skill ?? null
    });
  }
}

export class UpdateQuestionUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public async execute(input: { assessmentId: string; questionId: string; userId: string; payload: Record<string, unknown> }) {
    const assessment = await this.repository.getAssessment(input.assessmentId, input.userId);
    if (!assessment) {
      throw new AppError("Assessment tidak ditemukan", "ASSESSMENT_NOT_FOUND", 404);
    }
    const payload = questionPayloadSchema.partial().parse(input.payload);
    const updated = await this.repository.updateQuestion(input.assessmentId, input.questionId, {
      ...(payload.type ? { type: payload.type } : {}),
      ...(payload.content ? { content: payload.content } : {}),
      ...(payload.options !== undefined ? { options: payload.options } : {}),
      ...(payload.correct_answer !== undefined ? { correctAnswer: payload.correct_answer } : {}),
      ...(payload.explanation !== undefined ? { explanation: payload.explanation } : {}),
      ...(payload.difficulty !== undefined ? { difficulty: payload.difficulty } : {}),
      ...(payload.cognitive_level !== undefined ? { cognitiveLevel: payload.cognitive_level } : {}),
      ...(payload.score !== undefined ? { score: payload.score } : {}),
      ...(payload.tags !== undefined ? { tags: payload.tags } : {}),
      ...(payload.source !== undefined ? { source: payload.source } : {}),
      ...(payload.generated_by_skill !== undefined ? { generatedBySkill: payload.generated_by_skill } : {})
    });
    if (!updated) {
      throw new AppError("Soal tidak ditemukan", "QUESTION_NOT_FOUND", 404);
    }

    return updated;
  }
}

export class DeleteQuestionUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public async execute(input: { assessmentId: string; questionId: string; userId: string }) {
    const assessment = await this.repository.getAssessment(input.assessmentId, input.userId);
    if (!assessment) {
      throw new AppError("Assessment tidak ditemukan", "ASSESSMENT_NOT_FOUND", 404);
    }
    const deleted = await this.repository.softDeleteQuestion(input.assessmentId, input.questionId);
    if (!deleted) {
      throw new AppError("Soal tidak ditemukan", "QUESTION_NOT_FOUND", 404);
    }

    return { deleted: true };
  }
}

export class ReorderQuestionsUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public async execute(input: { assessmentId: string; userId: string; payload: unknown }) {
    const assessment = await this.repository.getAssessment(input.assessmentId, input.userId);
    if (!assessment) {
      throw new AppError("Assessment tidak ditemukan", "ASSESSMENT_NOT_FOUND", 404);
    }
    const orders = reorderQuestionsSchema.parse(input.payload);
    await this.repository.reorderQuestions(
      input.assessmentId,
      orders.map((item) => ({ id: item.id, questionNumber: item.question_number }))
    );
    return { updated: true };
  }
}

export class AddQuestionsFromBankUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public async execute(input: { assessmentId: string; userId: string; questionBankIds: string[] }) {
    const assessment = await this.repository.getAssessment(input.assessmentId, input.userId);
    if (!assessment) {
      throw new AppError("Assessment tidak ditemukan", "ASSESSMENT_NOT_FOUND", 404);
    }

    return this.repository.cloneQuestionsToAssessment(input.assessmentId, input.questionBankIds, input.userId);
  }
}
