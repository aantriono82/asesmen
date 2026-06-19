import { describe, expect, it, vi } from "vitest";
import { AppError } from "../src/lib/errors";
import { GenerateAssessmentUseCase } from "../src/application/assessments/generate-assessment.use-case";

describe("assessment generator", () => {
  it("validates total questions and queues generation", async () => {
    const skillRepository = {
      findActiveBySlug: vi.fn().mockResolvedValue({ id: "skill-id", slug: "generate-soal-pilihan-ganda" })
    };
    const repository = {
      createAssessment: vi.fn().mockResolvedValue({ id: "assessment-id" })
    };
    const queue = {
      send: vi.fn().mockResolvedValue("job-id")
    };

    const useCase = new GenerateAssessmentUseCase(skillRepository as never, repository as never, queue);
    const result = await useCase.execute({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      payload: {
        title: "Assessment IPA",
        subject: "IPA",
        grade_level: "VIII",
        assessment_type: "latihan",
        topic: "Fotosintesis",
        config: {
          total_questions: 3,
          question_types: [
            { skill_slug: "generate-soal-pilihan-ganda", count: 2, score: 1 },
            { skill_slug: "generate-soal-uraian", count: 1, score: 5 }
          ],
          difficulty_mix: { mudah: 40, sedang: 40, sulit: 20 },
          cognitive_levels: ["C1", "C3"]
        }
      }
    });

    expect(skillRepository.findActiveBySlug).toHaveBeenCalledTimes(2);
    expect(repository.createAssessment).toHaveBeenCalledTimes(1);
    expect(queue.send).toHaveBeenCalledWith("assessment-generation", {
      assessmentId: "assessment-id",
      userId: "550e8400-e29b-41d4-a716-446655440000"
    });
    expect(result).toEqual({ assessmentId: "assessment-id", status: "draft" });
  });

  it("rejects invalid config mapping", async () => {
    const useCase = new GenerateAssessmentUseCase(
      { findActiveBySlug: vi.fn() } as never,
      { createAssessment: vi.fn() } as never,
      { send: vi.fn() }
    );

    await expect(
      useCase.execute({
        userId: "550e8400-e29b-41d4-a716-446655440000",
        payload: {
          title: "Assessment IPA",
          subject: "IPA",
          grade_level: "VIII",
          assessment_type: "latihan",
          topic: "Fotosintesis",
          config: {
            total_questions: 3,
            question_types: [{ skill_slug: "generate-soal-pilihan-ganda", count: 2, score: 1 }],
            difficulty_mix: { mudah: 40, sedang: 40, sulit: 20 },
            cognitive_levels: ["C1"]
          }
        }
      })
    ).rejects.toBeInstanceOf(AppError);
  });
});
