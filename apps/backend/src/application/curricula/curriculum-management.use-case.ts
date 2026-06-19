import { AppError } from "@lib/errors";
import { DrizzleAssessmentRepository } from "@infra/repositories/drizzle-assessment.repository";
import { generateCurriculumRequestSchema } from "./curriculum.schemas";
import { GenerateKisiKisiUseCase } from "./generate-kisi-kisi.use-case";
import { GenerateProtaProsemUseCase } from "./generate-prota-prosem.use-case";
import { GenerateRppUseCase } from "./generate-rpp.use-case";
import { GenerateSilabusUseCase } from "./generate-silabus.use-case";

export class GenerateCurriculumUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public async execute(input: { userId: string; payload: Record<string, unknown> }) {
    const payload = generateCurriculumRequestSchema.parse(input.payload);
    let content: Record<string, unknown>;
    let type = payload.type;

    if (payload.type === "silabus") {
      content = await new GenerateSilabusUseCase().execute({
        subject: payload.subject,
        gradeLevel: payload.grade_level,
        config: { ...payload.config, semester: payload.semester }
      });
    } else if (payload.type === "rpp") {
      content = await new GenerateRppUseCase().execute({
        subject: payload.subject,
        gradeLevel: payload.grade_level,
        config: payload.config
      });
    } else if (payload.type === "kisi_kisi") {
      content = await new GenerateKisiKisiUseCase(this.repository).execute({
        userId: input.userId,
        subject: payload.subject,
        gradeLevel: payload.grade_level,
        config: payload.config
      });
    } else {
      const result = await new GenerateProtaProsemUseCase().execute({
        subject: payload.subject,
        gradeLevel: payload.grade_level,
        config: { ...payload.config, academic_year: payload.academic_year }
      });
      content = payload.type === "prota" ? { annual_plan: result.annual_plan } : { semester_plan: result.semester_plan };
      type = payload.type;
    }

    return this.repository.createCurriculum({
      userId: input.userId,
      title: payload.title ?? `${payload.type.toUpperCase()} ${payload.subject} ${payload.grade_level}`,
      type,
      subject: payload.subject,
      gradeLevel: payload.grade_level,
      semester: payload.semester ?? null,
      academicYear: payload.academic_year ?? null,
      content,
      status: "draft"
    });
  }
}

export class ListCurriculaUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public execute(input: { userId: string; page?: number; limit?: number; type?: string; subject?: string }) {
    return this.repository.listCurricula(input);
  }
}

export class GetCurriculumUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public async execute(input: { id: string; userId: string }) {
    const curriculum = await this.repository.getCurriculum(input.id, input.userId);
    if (!curriculum) {
      throw new AppError("Kurikulum tidak ditemukan", "CURRICULUM_NOT_FOUND", 404);
    }

    return curriculum;
  }
}

export class UpdateCurriculumUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public async execute(input: { id: string; userId: string; payload: Record<string, unknown> }) {
    const curriculum = await this.repository.updateCurriculum(input.id, input.userId, input.payload);
    if (!curriculum) {
      throw new AppError("Kurikulum tidak ditemukan", "CURRICULUM_NOT_FOUND", 404);
    }

    return curriculum;
  }
}

export class DeleteCurriculumUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public async execute(input: { id: string; userId: string }) {
    const deleted = await this.repository.softDeleteCurriculum(input.id, input.userId);
    if (!deleted) {
      throw new AppError("Kurikulum tidak ditemukan", "CURRICULUM_NOT_FOUND", 404);
    }

    return { deleted: true };
  }
}
