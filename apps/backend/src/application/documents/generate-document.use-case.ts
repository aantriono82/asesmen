import { z } from "zod";
import { AppError } from "@lib/errors";
import { DrizzleAssessmentRepository } from "@infra/repositories/drizzle-assessment.repository";

const generateDocumentSchema = z.object({
  assessment_id: z.string().uuid(),
  types: z.array(z.enum(["question_paper", "answer_key", "answer_sheet", "scoring_rubric"])).min(1)
});

export class GenerateDocumentUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public async execute(input: { userId: string; payload: Record<string, unknown> }) {
    const payload = generateDocumentSchema.parse(input.payload);
    const assessment = await this.repository.getAssessment(payload.assessment_id, input.userId);
    if (!assessment) {
      throw new AppError("Assessment tidak ditemukan", "ASSESSMENT_NOT_FOUND", 404);
    }

    const documents = [];
    for (const type of payload.types) {
      const content = buildDocumentContent(type, assessment);
      const document = await this.repository.createGeneratedDocument({
        userId: input.userId,
        assessmentId: assessment.id,
        type,
        title: `${assessment.title} - ${type}`,
        content
      });
      documents.push(document);
    }

    return documents;
  }
}

export class ListGeneratedDocumentsUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public execute(input: { userId: string; page?: number; limit?: number }) {
    return this.repository.listGeneratedDocuments(input);
  }
}

export class GetGeneratedDocumentUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public async execute(input: { id: string; userId: string }) {
    const document = await this.repository.getGeneratedDocument(input.id, input.userId);
    if (!document) {
      throw new AppError("Dokumen tidak ditemukan", "GENERATED_DOCUMENT_NOT_FOUND", 404);
    }

    return document;
  }
}

function buildDocumentContent(
  type: "question_paper" | "answer_key" | "answer_sheet" | "scoring_rubric",
  assessment: Awaited<ReturnType<DrizzleAssessmentRepository["getAssessment"]>>
) {
  if (!assessment) {
    throw new AppError("Assessment tidak ditemukan", "ASSESSMENT_NOT_FOUND", 404);
  }

  if (type === "question_paper") {
    return {
      header: {
        school_name: "ATIGA School",
        title: assessment.title,
        subject: assessment.subject,
        grade_level: assessment.gradeLevel,
        assessment_type: assessment.assessmentType,
        duration_minutes: assessment.durationMinutes
      },
      instructions: assessment.instructions,
      questions: assessment.questions.map((question) => ({
        number: question.questionNumber,
        type: question.type,
        content: question.content,
        options: question.options
      }))
    };
  }

  if (type === "answer_key") {
    return {
      title: `Kunci Jawaban ${assessment.title}`,
      items: assessment.questions.map((question) => ({
        number: question.questionNumber,
        answer: question.correctAnswer,
        score: question.score,
        explanation: question.explanation
      }))
    };
  }

  if (type === "answer_sheet") {
    return {
      title: `Lembar Jawaban ${assessment.title}`,
      student_identity: ["Nama", "Kelas", "Nomor Induk"],
      items: assessment.questions.map((question) => ({
        number: question.questionNumber,
        type: question.type,
        answer_area: question.type === "essay" ? "multi_line" : question.type === "matching" ? "matching_grid" : "single_line"
      }))
    };
  }

  return {
    title: `Rubrik Penilaian ${assessment.title}`,
    items: assessment.questions
      .filter((question) => question.type === "essay")
      .map((question) => ({
        number: question.questionNumber,
        content: question.content,
        rubric: (question.options as Record<string, unknown> | null)?.scoring_rubric ?? [],
        key_points: (question.options as Record<string, unknown> | null)?.key_points ?? []
      }))
  };
}
