import { z } from "zod";
import { AppError } from "@lib/errors";

const multipleChoiceItemSchema = z.object({
  question: z.string().min(3),
  options: z.object({
    A: z.string().min(1),
    B: z.string().min(1),
    C: z.string().min(1),
    D: z.string().min(1),
    E: z.string().min(1).optional()
  }),
  correct_answer: z.enum(["A", "B", "C", "D", "E"]),
  explanation: z.string().min(1)
});

const multipleChoiceComplexItemSchema = z.object({
  question: z.string().min(3),
  options: z.array(
    z.object({
      key: z.enum(["A", "B", "C", "D", "E"]),
      text: z.string().min(1)
    })
  ).min(4).max(5),
  correctAnswers: z.array(z.enum(["A", "B", "C", "D", "E"])).min(2),
  explanation: z.string().min(1),
  difficulty: z.string().optional(),
  cognitiveLevel: z.string().optional()
});

const trueFalseItemSchema = z.object({
  statement: z.string().min(3),
  is_true: z.boolean(),
  explanation: z.string().min(1)
});

const matchingSchema = z.object({
  instruction: z.string().optional(),
  premises: z.array(
    z.object({
      number: z.number(),
      text: z.string().min(1)
    })
  ).min(1),
  responses: z.array(
    z.object({
      letter: z.string().min(1),
      text: z.string().min(1)
    })
  ).min(1),
  answerPairs: z.array(
    z.object({
      premiseNumber: z.number(),
      responseLetter: z.string().min(1),
      explanation: z.string().min(1)
    })
  ).min(1)
});

const fillBlankItemSchema = z.object({
  statement: z.string().min(3),
  correctAnswer: z.string().min(1),
  acceptedAnswers: z.array(z.string().min(1)).min(1),
  explanation: z.string().min(1),
  difficulty: z.string().optional(),
  cognitiveLevel: z.string().optional()
});

const essayItemSchema = z.object({
  question: z.string().min(3),
  sampleAnswer: z.string().min(1),
  keyPoints: z.array(z.string().min(1)).min(1),
  scoringRubric: z.array(
    z.object({
      criteria: z.string().min(1),
      maxScore: z.number(),
      descriptors: z.array(
        z.object({
          score: z.number(),
          description: z.string().min(1)
        })
      ).min(1)
    })
  ).min(1),
  totalMaxScore: z.number().optional(),
  difficulty: z.string().optional(),
  cognitiveLevel: z.string().optional()
});

const questionArraySchema = <TSchema extends z.ZodTypeAny>(itemSchema: TSchema) => z.object({ questions: z.array(itemSchema).min(1) });

const multipleChoiceOutputSchema = questionArraySchema(multipleChoiceItemSchema);
const multipleChoiceComplexOutputSchema = questionArraySchema(multipleChoiceComplexItemSchema);
const trueFalseOutputSchema = questionArraySchema(trueFalseItemSchema);
const fillBlankOutputSchema = questionArraySchema(fillBlankItemSchema);
const essayOutputSchema = questionArraySchema(essayItemSchema);

export type ValidatedSkillQuestionOutput =
  | z.infer<typeof multipleChoiceOutputSchema>
  | z.infer<typeof multipleChoiceComplexOutputSchema>
  | z.infer<typeof trueFalseOutputSchema>
  | z.infer<typeof matchingSchema>
  | z.infer<typeof fillBlankOutputSchema>
  | z.infer<typeof essayOutputSchema>;

export function validateGeneratedQuestions(skillSlug: string, value: unknown): ValidatedSkillQuestionOutput {
  try {
    const normalizedValue = normalizeGeneratedQuestions(skillSlug, value);
    switch (skillSlug) {
      case "generate-soal-pilihan-ganda":
        return multipleChoiceOutputSchema.parse(normalizedValue);
      case "generate-soal-pilihan-ganda-kompleks":
        return multipleChoiceComplexOutputSchema.parse(normalizedValue);
      case "generate-soal-benar-salah":
        return trueFalseOutputSchema.parse(normalizedValue);
      case "generate-soal-menjodohkan":
        return matchingSchema.parse(normalizedValue);
      case "generate-soal-isian-singkat":
        return fillBlankOutputSchema.parse(normalizedValue);
      case "generate-soal-uraian":
        return essayOutputSchema.parse(normalizedValue);
      default:
        throw new AppError("Skill assessment tidak didukung", "ASSESSMENT_SKILL_UNSUPPORTED", 400);
    }
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }

    const message =
      error instanceof z.ZodError
        ? error.issues
            .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
            .join("; ")
        : "Output soal tidak valid";
    throw new AppError(`Output skill ${skillSlug} tidak valid: ${message}`, "QUESTION_OUTPUT_INVALID", 422);
  }
}

function normalizeGeneratedQuestions(skillSlug: string, value: unknown): unknown {
  if (skillSlug === "generate-soal-pilihan-ganda") {
    return normalizeMultipleChoiceOutput(value);
  }

  if (skillSlug === "generate-soal-pilihan-ganda-kompleks") {
    return normalizeMultipleChoiceComplexOutput(value);
  }

  if (skillSlug === "generate-soal-benar-salah") {
    return normalizeTrueFalseOutput(value);
  }

  if (skillSlug === "generate-soal-menjodohkan") {
    return normalizeMatchingOutput(value);
  }

  if (skillSlug === "generate-soal-isian-singkat") {
    return normalizeFillBlankOutput(value);
  }

  if (skillSlug === "generate-soal-uraian") {
    return normalizeEssayOutput(value);
  }

  return value;
}

function normalizeMultipleChoiceOutput(value: unknown): unknown {
  const items = readQuestionArray(value);
  if (!items) {
    return value;
  }

  return {
    questions: items
      .map((item) => {
        const source = toRecord(item);
        if (!source) {
          return item;
        }

        return {
          question: readStringField(source, ["question", "content", "stem", "soal"]),
          options: normalizeChoiceObject(source.options ?? source.choices ?? source.pilihan),
          correct_answer: normalizeCorrectAnswer(source.correct_answer ?? source.correctAnswer ?? source.answer ?? source.kunci),
          explanation: readStringField(source, ["explanation", "reasoning", "pembahasan", "penjelasan", "rationale", "reason"])
        };
      })
      .filter(Boolean)
  };
}

function normalizeMultipleChoiceComplexOutput(value: unknown): unknown {
  const items = readQuestionArray(value);
  if (!items) {
    return value;
  }

  return {
    questions: items
      .map((item) => {
        const source = toRecord(item);
        if (!source) {
          return item;
        }

        return {
          question: readStringField(source, ["question", "content", "stem", "soal"]),
          options: normalizeChoiceArray(source.options ?? source.choices ?? source.pilihan),
          correctAnswers: normalizeCorrectAnswers(source.correctAnswers ?? source.correct_answers ?? source.answer ?? source.answers),
          explanation: readStringField(source, ["explanation", "reasoning", "pembahasan", "penjelasan", "rationale", "reason"]),
          difficulty: readStringField(source, ["difficulty"], true),
          cognitiveLevel: readStringField(source, ["cognitiveLevel", "cognitive_level"], true)
        };
      })
      .filter(Boolean)
  };
}

function normalizeTrueFalseOutput(value: unknown): unknown {
  const items = readQuestionArray(value);
  if (!items) {
    return value;
  }

  return {
    questions: items
      .map((item) => {
        const source = toRecord(item);
        if (!source) {
          return item;
        }

        return {
          statement: readStringField(source, ["statement", "question", "content", "soal"]),
          is_true: normalizeBoolean(source.is_true ?? source.isTrue ?? source.answer),
          explanation: readStringField(source, ["explanation", "reasoning", "pembahasan", "penjelasan", "rationale", "reason"])
        };
      })
      .filter(Boolean)
  };
}

function normalizeMatchingOutput(value: unknown): unknown {
  const source = toRecord(value);
  if (!source) {
    return value;
  }

  return {
    instruction: readStringField(source, ["instruction", "petunjuk"], true),
    premises: Array.isArray(source.premises) ? source.premises : Array.isArray(source.leftItems) ? source.leftItems : source.premises,
    responses: Array.isArray(source.responses) ? source.responses : Array.isArray(source.rightItems) ? source.rightItems : source.responses,
    answerPairs: Array.isArray(source.answerPairs) ? source.answerPairs : Array.isArray(source.answers) ? source.answers : source.answerPairs
  };
}

function normalizeFillBlankOutput(value: unknown): unknown {
  const items = readQuestionArray(value);
  if (!items) {
    return value;
  }

  return {
    questions: items
      .map((item) => {
        const source = toRecord(item);
        if (!source) {
          return item;
        }

        return {
          statement: readStringField(source, ["statement", "question", "content", "soal"]),
          correctAnswer: readStringField(source, ["correctAnswer", "correct_answer", "answer", "kunci"]),
          acceptedAnswers: normalizeStringArray(source.acceptedAnswers ?? source.accepted_answers ?? source.alternativeAnswers ?? [source.correctAnswer ?? source.correct_answer ?? source.answer]),
          explanation: readStringField(source, ["explanation", "reasoning", "pembahasan", "penjelasan", "rationale", "reason"]),
          difficulty: readStringField(source, ["difficulty"], true),
          cognitiveLevel: readStringField(source, ["cognitiveLevel", "cognitive_level"], true)
        };
      })
      .filter(Boolean)
  };
}

function normalizeEssayOutput(value: unknown): unknown {
  const items = readQuestionArray(value);
  if (!items) {
    return value;
  }

  return {
    questions: items
      .map((item) => {
        const source = toRecord(item);
        if (!source) {
          return item;
        }

        return {
          question: readStringField(source, ["question", "content", "stem", "soal"]),
          sampleAnswer: readStringField(source, ["sampleAnswer", "sample_answer", "answer", "idealAnswer"]),
          keyPoints: normalizeStringArray(source.keyPoints ?? source.key_points ?? source.points),
          scoringRubric: normalizeRubric(source.scoringRubric ?? source.scoring_rubric ?? source.rubric),
          totalMaxScore: normalizeNumber(source.totalMaxScore ?? source.total_max_score ?? source.maxScore),
          difficulty: readStringField(source, ["difficulty"], true),
          cognitiveLevel: readStringField(source, ["cognitiveLevel", "cognitive_level"], true)
        };
      })
      .filter(Boolean)
  };
}

function readQuestionArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) {
    return value;
  }

  const record = toRecord(value);
  if (!record) {
    return null;
  }

  if (Array.isArray(record.questions)) {
    return record.questions;
  }

  if (Array.isArray(record.items)) {
    return record.items;
  }

  if (Array.isArray(record.data)) {
    return record.data;
  }

  return null;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readStringField(source: Record<string, unknown>, keys: string[], optional = false): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return optional ? undefined : undefined;
}

function normalizeChoiceObject(value: unknown): Record<string, string> | undefined {
  const record = toRecord(value);
  if (record) {
    const A = readStringField(record, ["A", "a", "option_a", "optionA"], true);
    const B = readStringField(record, ["B", "b", "option_b", "optionB"], true);
    const C = readStringField(record, ["C", "c", "option_c", "optionC"], true);
    const D = readStringField(record, ["D", "d", "option_d", "optionD"], true);
    const E = readStringField(record, ["E", "e", "option_e", "optionE"], true);

    if (A && B && C && D) {
      return E ? { A, B, C, D, E } : { A, B, C, D };
    }
  }

  const array = Array.isArray(value) ? value : null;
  if (!array) {
    return undefined;
  }

  const mapped = array
    .map((item, index) => {
      const source = toRecord(item);
      const label = readStringField(source ?? {}, ["key", "label"], true) ?? ["A", "B", "C", "D", "E"][index];
      const text = source ? readStringField(source, ["text", "value", "content"], true) : typeof item === "string" ? item : undefined;
      return label && text ? [label, text] : null;
    })
    .filter((item): item is [string, string] => Array.isArray(item));

  if (mapped.length < 4) {
    return undefined;
  }

  return Object.fromEntries(mapped) as Record<string, string>;
}

function normalizeChoiceArray(value: unknown): Array<{ key: "A" | "B" | "C" | "D" | "E"; text: string }> | undefined {
  const record = normalizeChoiceObject(value);
  if (record) {
    return Object.entries(record)
      .filter((entry): entry is ["A" | "B" | "C" | "D" | "E", string] => ["A", "B", "C", "D", "E"].includes(entry[0]))
      .map(([key, text]) => ({ key, text }));
  }

  const array = Array.isArray(value) ? value : null;
  if (!array) {
    return undefined;
  }

  return array
    .map((item, index) => {
      const source = toRecord(item);
      const key = (readStringField(source ?? {}, ["key", "label"], true) ?? ["A", "B", "C", "D", "E"][index]) as "A" | "B" | "C" | "D" | "E";
      const text = source ? readStringField(source, ["text", "value", "content"], true) : typeof item === "string" ? item : undefined;
      return text ? { key, text } : null;
    })
    .filter((item): item is { key: "A" | "B" | "C" | "D" | "E"; text: string } => item !== null);
}

function normalizeCorrectAnswer(value: unknown): "A" | "B" | "C" | "D" | "E" | undefined {
  const candidate = readStringValue(value)?.toUpperCase();
  return candidate === "A" || candidate === "B" || candidate === "C" || candidate === "D" || candidate === "E" ? candidate : undefined;
}

function normalizeCorrectAnswers(value: unknown): Array<"A" | "B" | "C" | "D" | "E"> | undefined {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const normalized = values
    .map((item) => normalizeCorrectAnswer(item))
    .filter((item): item is "A" | "B" | "C" | "D" | "E" => Boolean(item));
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  const candidate = readStringValue(value)?.toLowerCase();
  if (candidate === "true" || candidate === "benar") {
    return true;
  }
  if (candidate === "false" || candidate === "salah") {
    return false;
  }

  return undefined;
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const normalized = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
    return normalized.length > 0 ? normalized : undefined;
  }

  const candidate = readStringValue(value);
  return candidate ? [candidate] : undefined;
}

function normalizeRubric(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function normalizeNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : undefined;
  }

  return undefined;
}

function readStringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
