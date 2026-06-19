import type { QuestionPayload } from "./assessment.schemas";
import type { ValidatedSkillQuestionOutput } from "./question-validator";

const skillTypeMap = {
  "generate-soal-pilihan-ganda": "multiple_choice",
  "generate-soal-pilihan-ganda-kompleks": "multiple_choice_complex",
  "generate-soal-benar-salah": "true_false",
  "generate-soal-menjodohkan": "matching",
  "generate-soal-isian-singkat": "fill_blank",
  "generate-soal-uraian": "essay"
} as const;

function normalizeCognitiveLevel(value: string | undefined, fallback: "C1" | "C2" | "C3" | "C4" | "C5" | "C6") {
  return value === "C1" || value === "C2" || value === "C3" || value === "C4" || value === "C5" || value === "C6" ? value : fallback;
}

function defaultCognitiveLevel(levels: Array<"C1" | "C2" | "C3" | "C4" | "C5" | "C6">) {
  return levels[0] ?? "C1";
}

export function mapSkillOutputToQuestions(input: {
  skillSlug: keyof typeof skillTypeMap;
  output: ValidatedSkillQuestionOutput;
  score: number;
  difficulty: "mudah" | "sedang" | "sulit";
  cognitiveLevels: Array<"C1" | "C2" | "C3" | "C4" | "C5" | "C6">;
  subject: string;
  topic: string;
}): QuestionPayload[] {
  const base = {
    type: skillTypeMap[input.skillSlug],
    score: input.score,
    difficulty: input.difficulty,
    tags: [input.subject, input.topic],
    source: "ai_generated" as const,
    generated_by_skill: input.skillSlug
  };

  if (input.skillSlug === "generate-soal-pilihan-ganda") {
    const output = input.output as { questions: Array<{ question: string; options: Record<string, string>; correct_answer: string; explanation: string }> };
    return output.questions.map((question, index) => ({
      ...base,
      content: question.question,
      options: question.options,
      correct_answer: question.correct_answer,
      explanation: question.explanation,
      cognitive_level: input.cognitiveLevels[index % input.cognitiveLevels.length]
    }));
  }

  if (input.skillSlug === "generate-soal-pilihan-ganda-kompleks") {
    const output = input.output as {
      questions: Array<{ question: string; options: Array<{ key: string; text: string }>; correctAnswers: string[]; explanation: string; cognitiveLevel?: string }>;
    };
    return output.questions.map((question) => ({
      ...base,
      content: question.question,
      options: {
        choices: question.options
      },
      correct_answer: JSON.stringify(question.correctAnswers),
      explanation: question.explanation,
      cognitive_level: normalizeCognitiveLevel(question.cognitiveLevel, defaultCognitiveLevel(input.cognitiveLevels))
    }));
  }

  if (input.skillSlug === "generate-soal-benar-salah") {
    const output = input.output as { questions: Array<{ statement: string; is_true: boolean; explanation: string }> };
    return output.questions.map((question, index) => ({
      ...base,
      content: question.statement,
      options: {
        choices: [
          { key: "true", text: "Benar" },
          { key: "false", text: "Salah" }
        ]
      },
      correct_answer: question.is_true ? "true" : "false",
      explanation: question.explanation,
      cognitive_level: input.cognitiveLevels[index % input.cognitiveLevels.length]
    }));
  }

  if (input.skillSlug === "generate-soal-menjodohkan") {
    const output = input.output as {
      instruction?: string;
      premises: Array<{ number: number; text: string }>;
      responses: Array<{ letter: string; text: string }>;
      answerPairs: Array<{ premiseNumber: number; responseLetter: string; explanation: string }>;
    };
    return [
      {
        ...base,
        content: output.instruction ?? `Jodohkan item berikut terkait ${input.topic}.`,
        options: {
          premises: output.premises,
          responses: output.responses
        },
        correct_answer: JSON.stringify(output.answerPairs),
        explanation: output.answerPairs.map((item) => `${item.premiseNumber}-${item.responseLetter}: ${item.explanation}`).join("\n"),
        cognitive_level: defaultCognitiveLevel(input.cognitiveLevels)
      }
    ];
  }

  if (input.skillSlug === "generate-soal-isian-singkat") {
    const output = input.output as {
      questions: Array<{ statement: string; correctAnswer: string; acceptedAnswers: string[]; explanation: string; cognitiveLevel?: string }>;
    };
    return output.questions.map((question) => ({
      ...base,
      content: question.statement,
      options: {
        accepted_answers: question.acceptedAnswers
      },
      correct_answer: question.correctAnswer,
      explanation: question.explanation,
      cognitive_level: normalizeCognitiveLevel(question.cognitiveLevel, defaultCognitiveLevel(input.cognitiveLevels))
    }));
  }

  const output = input.output as {
    questions: Array<{
      question: string;
      sampleAnswer: string;
      keyPoints: string[];
      scoringRubric: Array<Record<string, unknown>>;
      totalMaxScore?: number;
      cognitiveLevel?: string;
    }>;
  };
  return output.questions.map((question) => ({
    ...base,
    content: question.question,
    options: {
      key_points: question.keyPoints,
      scoring_rubric: question.scoringRubric,
      sample_answer: question.sampleAnswer,
      total_max_score: question.totalMaxScore ?? input.score
    },
    correct_answer: question.sampleAnswer,
    explanation: question.keyPoints.join("; "),
    cognitive_level: normalizeCognitiveLevel(question.cognitiveLevel, defaultCognitiveLevel(input.cognitiveLevels))
  }));
}
