import { describe, expect, it, vi } from "vitest";
import { GenerateDocumentUseCase } from "../src/application/documents/generate-document.use-case";

describe("document generator", () => {
  it("builds structured documents for all supported types", async () => {
    const repository = {
      getAssessment: vi.fn().mockResolvedValue({
        id: "assessment-id",
        title: "Assessment IPA",
        subject: "IPA",
        gradeLevel: "VIII",
        assessmentType: "latihan",
        durationMinutes: 60,
        instructions: "Kerjakan semua soal.",
        questions: [
          {
            id: "q1",
            questionNumber: 1,
            type: "multiple_choice",
            content: "Apa fungsi klorofil?",
            options: { A: "A", B: "B", C: "C", D: "D" },
            correctAnswer: "A",
            explanation: "Karena...",
            score: 1
          },
          {
            id: "q2",
            questionNumber: 2,
            type: "essay",
            content: "Jelaskan fotosintesis.",
            options: { scoring_rubric: [{ criteria: "Isi" }], key_points: ["Klorofil"] },
            correctAnswer: "Jawaban",
            explanation: "Penjelasan",
            score: 5
          }
        ]
      }),
      createGeneratedDocument: vi.fn().mockImplementation(async (value) => ({ id: `doc-${value.type}`, ...value }))
    };

    const useCase = new GenerateDocumentUseCase(repository as never);
    const result = await useCase.execute({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      payload: {
        assessment_id: "550e8400-e29b-41d4-a716-446655440010",
        types: ["question_paper", "answer_key", "answer_sheet", "scoring_rubric"]
      }
    });

    expect(result).toHaveLength(4);
    expect(repository.createGeneratedDocument).toHaveBeenCalledTimes(4);
  });
});
