import { describe, expect, it, vi } from "vitest";
import { processAssessmentGenerationJobWithDeps } from "../src/infrastructure/queue/workers/assessment-generation.worker";

describe("assessment generation with rag", () => {
  it("passes retrieved context into generated questions flow", async () => {
    const retrievalService = {
      search: vi.fn().mockResolvedValue([
        {
          chunkId: "chunk-1",
          documentId: "doc-1",
          documentTitle: "Modul IPA",
          content: "Kloroplas mengandung klorofil.",
          pageNumber: 3,
          tokenCount: 5,
          similarity: 0.9,
          score: 0.9,
          createdAt: new Date()
        }
      ])
    };
    const generateQuestionsFromSkill = vi.fn().mockResolvedValue({
      questions: [
        {
          question: "Klorofil berada di ...",
          options: { A: "Kloroplas", B: "Nukleus", C: "Mitokondria", D: "Ribosom" },
          correct_answer: "A",
          explanation: "Klorofil terdapat di kloroplas."
        }
      ]
    });

    await processAssessmentGenerationJobWithDeps(
      { assessmentId: "a1", userId: "u1" },
      {
        repository: {
          getAssessment: vi
            .fn()
            .mockResolvedValueOnce({
              id: "a1",
              userId: "u1",
              title: "IPA",
              subject: "IPA",
              gradeLevel: "VIII",
              knowledgeBaseId: "kb-1",
              config: {
                topic: "Fotosintesis",
                question_types: [{ skill_slug: "generate-soal-pilihan-ganda", count: 1, score: 1 }],
                difficulty_mix: { mudah: 100, sedang: 0, sulit: 0 },
                total_questions: 1,
                cognitive_levels: ["C1"]
              },
              questions: []
            })
            .mockResolvedValueOnce({ id: "a1", questions: [] }),
          listBankCandidates: vi.fn().mockResolvedValue([]),
          cloneQuestionsToAssessment: vi.fn().mockResolvedValue(undefined),
          replaceQuestions: vi.fn().mockResolvedValue(undefined),
          updateAssessment: vi.fn().mockResolvedValue(undefined)
        } as never,
        auditService: { log: vi.fn().mockResolvedValue(undefined) } as never,
        notificationService: { create: vi.fn().mockResolvedValue(undefined) } as never,
        retrievalService: retrievalService as never,
        contextBuilder: { build: vi.fn().mockReturnValue("Dokumen: Kloroplas mengandung klorofil.") } as never,
        generateQuestionsFromSkill
      }
    );

    expect(retrievalService.search).toHaveBeenCalledTimes(1);
    expect(generateQuestionsFromSkill.mock.calls[0]?.[0]?.payload?.sourceContext).toContain("Kloroplas");
  });
});
