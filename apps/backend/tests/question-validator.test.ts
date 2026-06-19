import { describe, expect, it } from "vitest";
import { AppError } from "../src/lib/errors";
import { validateGeneratedQuestions } from "../src/application/assessments/question-validator";

describe("question validator", () => {
  it("accepts valid multiple choice output", () => {
    const result = validateGeneratedQuestions("generate-soal-pilihan-ganda", {
      questions: [
        {
          question: "Apa fungsi klorofil?",
          options: { A: "Fotosintesis", B: "Respirasi", C: "Ekskresi", D: "Transportasi" },
          correct_answer: "A",
          explanation: "Klorofil menyerap cahaya untuk fotosintesis."
        }
      ]
    });

    expect(result).toHaveProperty("questions");
  });

  it("normalizes common multiple choice aliases from provider output", () => {
    const result = validateGeneratedQuestions("generate-soal-pilihan-ganda", [
      {
        content: "Organ pernapasan utama manusia adalah...",
        choices: [
          { key: "A", text: "Paru-paru" },
          { key: "B", text: "Lambung" },
          { key: "C", text: "Hati" },
          { key: "D", text: "Ginjal" }
        ],
        answer: "A",
        pembahasan: "Paru-paru adalah organ utama sistem pernapasan."
      }
    ]);

    expect(result).toEqual({
      questions: [
        {
          question: "Organ pernapasan utama manusia adalah...",
          options: {
            A: "Paru-paru",
            B: "Lambung",
            C: "Hati",
            D: "Ginjal"
          },
          correct_answer: "A",
          explanation: "Paru-paru adalah organ utama sistem pernapasan."
        }
      ]
    });
  });

  it("normalizes lowercase and option_* keyed multiple choice output", () => {
    const result = validateGeneratedQuestions("generate-soal-pilihan-ganda", {
      items: [
        {
          stem: "Alat utama respirasi manusia adalah...",
          options: {
            option_a: "Paru-paru",
            option_b: "Jantung",
            option_c: "Ginjal",
            option_d: "Lambung"
          },
          correctAnswer: "a",
          rationale: "Paru-paru berfungsi untuk pertukaran gas."
        }
      ]
    });

    expect(result).toEqual({
      questions: [
        {
          question: "Alat utama respirasi manusia adalah...",
          options: {
            A: "Paru-paru",
            B: "Jantung",
            C: "Ginjal",
            D: "Lambung"
          },
          correct_answer: "A",
          explanation: "Paru-paru berfungsi untuk pertukaran gas."
        }
      ]
    });
  });

  it("rejects malformed essay output", () => {
    expect(() =>
      validateGeneratedQuestions("generate-soal-uraian", {
        questions: [{ question: "Jelaskan fotosintesis" }]
      })
    ).toThrow(AppError);
  });
});
