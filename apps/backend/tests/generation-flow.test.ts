import { describe, expect, it, vi } from "vitest";
import { processAssessmentGenerationJobWithDeps } from "../src/infrastructure/queue/workers/assessment-generation.worker";

describe("generation flow", () => {
  it("creates questions and completes assessment generation", async () => {
    const repository = {
      getAssessment: vi
        .fn()
        .mockResolvedValueOnce({
          id: "assessment-id",
          title: "Assessment IPA",
          subject: "IPA",
          gradeLevel: "VIII",
          config: {
            topic: "Fotosintesis",
            use_question_bank: false,
            total_questions: 1,
            question_types: [{ skill_slug: "generate-soal-pilihan-ganda", count: 1, score: 1 }],
            difficulty_mix: { mudah: 100, sedang: 0, sulit: 0 },
            cognitive_levels: ["C1"]
          },
          questions: []
        })
        .mockResolvedValueOnce({
          id: "assessment-id",
          title: "Assessment IPA",
          subject: "IPA",
          gradeLevel: "VIII",
          config: {},
          questions: []
        }),
      listBankCandidates: vi.fn().mockResolvedValue([]),
      cloneQuestionsToAssessment: vi.fn().mockResolvedValue([]),
      replaceQuestions: vi.fn().mockResolvedValue([]),
      updateAssessment: vi.fn().mockResolvedValue({ id: "assessment-id" })
    };
    const auditService = { log: vi.fn().mockResolvedValue(undefined) };
    const notificationService = { create: vi.fn().mockResolvedValue(undefined) };
    const generateQuestions = vi.fn().mockResolvedValue({
      questions: [
        {
          question: "Apa fungsi klorofil?",
          options: { A: "A", B: "B", C: "C", D: "D" },
          correct_answer: "A",
          explanation: "Penjelasan"
        }
      ]
    });

    await processAssessmentGenerationJobWithDeps(
      { assessmentId: "assessment-id", userId: "550e8400-e29b-41d4-a716-446655440000" },
      {
        repository: repository as never,
        auditService: auditService as never,
        notificationService: notificationService as never,
        generateQuestionsFromSkill: generateQuestions
      }
    );

    expect(generateQuestions).toHaveBeenCalledTimes(1);
    expect(repository.replaceQuestions).toHaveBeenCalledTimes(1);
    expect(repository.updateAssessment).toHaveBeenCalledWith(
      "assessment-id",
      "550e8400-e29b-41d4-a716-446655440000",
      expect.objectContaining({ status: "draft" })
    );
    expect(notificationService.create).toHaveBeenCalledTimes(1);
  });
});
