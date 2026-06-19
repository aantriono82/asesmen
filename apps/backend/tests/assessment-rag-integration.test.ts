import { describe, expect, it, vi } from "vitest";
import { processAssessmentGenerationJobWithDeps } from "../src/infrastructure/queue/workers/assessment-generation.worker";

describe("assessment rag integration", () => {
  it("calls retrieval when knowledge base is attached", async () => {
    const retrievalSearch = vi.fn().mockResolvedValue([
      {
        chunkId: "chunk-1",
        documentId: "doc-1",
        documentTitle: "Doc",
        content: "Fotosintesis terjadi di kloroplas.",
        pageNumber: 1,
        tokenCount: 6,
        similarity: 0.92,
        score: 0.91,
        createdAt: new Date()
      }
    ]);
    const generateQuestionsFromSkill = vi.fn().mockResolvedValue({
      questions: [
        {
          question: "Apa fungsi kloroplas?",
          options: { A: "Respirasi", B: "Fotosintesis", C: "Ekskresi", D: "Transportasi" },
          correct_answer: "B",
          explanation: "Kloroplas tempat fotosintesis."
        }
      ]
    });

    await processAssessmentGenerationJobWithDeps(
      { assessmentId: "assessment-1", userId: "user-1" },
      {
        repository: {
          getAssessment: vi
            .fn()
            .mockResolvedValueOnce({
              id: "assessment-1",
              userId: "user-1",
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
            .mockResolvedValueOnce({
              id: "assessment-1",
              questions: []
            }),
          listBankCandidates: vi.fn().mockResolvedValue([]),
          cloneQuestionsToAssessment: vi.fn().mockResolvedValue(undefined),
          replaceQuestions: vi.fn().mockResolvedValue(undefined),
          updateAssessment: vi.fn().mockResolvedValue(undefined)
        } as never,
        auditService: { log: vi.fn().mockResolvedValue(undefined) } as never,
        notificationService: { create: vi.fn().mockResolvedValue(undefined) } as never,
        retrievalService: { search: retrievalSearch } as never,
        contextBuilder: { build: vi.fn().mockReturnValue("Dokumen: kloroplas") } as never,
        generateQuestionsFromSkill
      }
    );

    expect(retrievalSearch).toHaveBeenCalledWith("IPA VIII", {
      knowledge_base_id: "kb-1",
      top_k: 8,
      threshold: 0.6
    });
    expect(generateQuestionsFromSkill).toHaveBeenCalled();
    expect(generateQuestionsFromSkill.mock.calls[0]?.[0]?.payload?.sourceContext).toBe("Dokumen: kloroplas");
  });
});
