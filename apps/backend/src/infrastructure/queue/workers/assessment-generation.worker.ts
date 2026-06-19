import { AppError } from "@lib/errors";
import { getQueue, queueNames } from "../queue";
import { DrizzleAssessmentRepository } from "@infra/repositories/drizzle-assessment.repository";
import { AuditService } from "@infra/audit/audit.service";
import { ContextBuilder } from "@infra/documents/context-builder";
import { RetrievalService } from "@infra/documents/retrieval.service";
import { NotificationService } from "@infra/notifications/notification.service";
import { generateQuestionsFromSkill } from "@app/assessments/assessment-generation.service";
import { mapSkillOutputToQuestions } from "@app/assessments/question-mapper";

const repository = new DrizzleAssessmentRepository();
const auditService = new AuditService();
const notificationService = new NotificationService();
const retrievalService = new RetrievalService();
const contextBuilder = new ContextBuilder();

export async function startAssessmentGenerationWorker(): Promise<void> {
  const boss = getQueue();
  await boss.work(queueNames.assessmentGeneration, async (jobs) => {
    const job = jobs[0];
    if (!job) {
      return;
    }

    await processAssessmentGenerationJob(readPayload(job.data));
  });
}

export async function processAssessmentGenerationJob(payload: { assessmentId: string; userId: string }): Promise<void> {
  return processAssessmentGenerationJobWithDeps(payload, {
    repository,
    auditService,
    notificationService,
    retrievalService,
    contextBuilder,
    generateQuestionsFromSkill
  });
}

export async function processAssessmentGenerationJobWithDeps(
  payload: { assessmentId: string; userId: string },
  deps: {
    repository: DrizzleAssessmentRepository;
    auditService: AuditService;
    notificationService: NotificationService;
    retrievalService: RetrievalService;
    contextBuilder: ContextBuilder;
    generateQuestionsFromSkill: typeof generateQuestionsFromSkill;
  }
): Promise<void> {
  const assessment = await deps.repository.getAssessment(payload.assessmentId, payload.userId);
  if (!assessment) {
    throw new AppError("Assessment tidak ditemukan", "ASSESSMENT_NOT_FOUND", 404);
  }

  const config = assessment.config as Record<string, unknown>;
  const questionTypes = Array.isArray(config.question_types) ? config.question_types : [];
  const topic = typeof config.topic === "string" ? config.topic : assessment.title;
  const useQuestionBank = config.use_question_bank === true;

  try {
    const sourceContext = assessment.knowledgeBaseId
      ? deps.contextBuilder.build(
          (
            await deps.retrievalService.search(`${assessment.subject ?? assessment.title} ${assessment.gradeLevel ?? ""}`.trim(), {
              knowledge_base_id: assessment.knowledgeBaseId,
              top_k: 8,
              threshold: 0.6
            })
          ).map((chunk) => ({
            documentTitle: chunk.documentTitle,
            content: chunk.content,
            pageNumber: chunk.pageNumber,
            score: chunk.score,
            tokenCount: chunk.tokenCount
          })),
          { format: "markdown", maxTokens: 4_000 }
        )
      : "";

    const generatedQuestions = [];
    const bankItems = useQuestionBank && assessment.subject && assessment.gradeLevel
      ? await deps.repository.listBankCandidates(
          assessment.subject,
          assessment.gradeLevel,
          Math.min(Math.max(Math.floor(questionTypes.length / 2), 1), 5),
          payload.userId
        )
      : [];

    const bankIdsToUse = bankItems.map((item) => item.id);
    if (bankIdsToUse.length > 0) {
      await deps.repository.cloneQuestionsToAssessment(assessment.id, bankIdsToUse, payload.userId);
    }

    const difficultyQueue = buildDifficultyQueue(config.difficulty_mix as Record<string, unknown>, Number(config.total_questions ?? 0));
    const cognitiveLevels = Array.isArray(config.cognitive_levels)
      ? config.cognitive_levels.filter(
          (item): item is "C1" | "C2" | "C3" | "C4" | "C5" | "C6" =>
            item === "C1" || item === "C2" || item === "C3" || item === "C4" || item === "C5" || item === "C6"
        )
      : (["C1"] as Array<"C1" | "C2" | "C3" | "C4" | "C5" | "C6">);

    for (const questionType of questionTypes) {
      const skillSlug = typeof questionType?.skill_slug === "string" ? questionType.skill_slug : "";
      const count = typeof questionType?.count === "number" ? questionType.count : 0;
      const score = typeof questionType?.score === "number" ? questionType.score : 1;
      const difficulty = difficultyQueue.shift() ?? "sedang";
      const output = await deps.generateQuestionsFromSkill({
        skillSlug,
        payload: buildSkillInput(skillSlug, {
          topic,
          subject: assessment.subject ?? "Umum",
          gradeLevel: assessment.gradeLevel ?? "Umum",
          difficulty,
          count,
          cognitiveLevels,
          sourceContext
        })
      });

      generatedQuestions.push(
        ...mapSkillOutputToQuestions({
          skillSlug: skillSlug as never,
          output,
          score,
          difficulty,
          cognitiveLevels,
          subject: assessment.subject ?? "Umum",
          topic
        })
      );
    }

    const existing = await deps.repository.getAssessment(assessment.id, payload.userId);
    const existingQuestions = existing?.questions ?? [];
    const startingCount = existingQuestions.filter((question) => question.source === "bank").length;
    await deps.repository.replaceQuestions(assessment.id, [
      ...existingQuestions
        .filter((question) => question.source === "bank")
        .map((question, index) => ({
          questionNumber: index + 1,
          type: question.type,
          content: question.content,
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          difficulty: question.difficulty,
          cognitiveLevel: question.cognitiveLevel,
          score: question.score,
          tags: question.tags,
          source: question.source,
          generatedBySkill: question.generatedBySkill
        })),
      ...generatedQuestions.map((question, index) => ({
        questionNumber: startingCount + index + 1,
        type: question.type,
        content: question.content,
        options: question.options ?? null,
        correctAnswer: question.correct_answer ?? null,
        explanation: question.explanation ?? null,
        difficulty: question.difficulty ?? null,
        cognitiveLevel: question.cognitive_level ?? null,
        score: question.score ?? 1,
        tags: question.tags ?? [],
        source: question.source ?? "ai_generated",
        generatedBySkill: question.generated_by_skill ?? null
      }))
    ]);

    await deps.repository.updateAssessment(assessment.id, payload.userId, {
      status: "draft",
      config: { ...config, generation_status: "completed", generated_at: new Date().toISOString() }
    });
    await deps.notificationService.create({
      userId: payload.userId,
      type: "system",
      title: `Assessment ${assessment.title} siap ditinjau`,
      message: `Assessment ${assessment.title} telah selesai dibuat.`,
      metadata: { assessmentId: assessment.id }
    });
    await deps.auditService.log({
      userId: payload.userId,
      action: "EXECUTE",
      entityType: "assessment",
      entityId: assessment.id,
      description: `Generate assessment ${assessment.title}`,
      metadata: {
        assessmentId: assessment.id,
        generatedQuestions: generatedQuestions.length,
        bankUsed: bankIdsToUse.length,
        ragUsed: Boolean(assessment.knowledgeBaseId),
        contextUsed: sourceContext.length > 0
      }
    });
  } catch (error: unknown) {
    await deps.repository.updateAssessment(assessment.id, payload.userId, {
      status: "failed",
      config: {
        ...config,
        generation_status: "failed",
        error: error instanceof Error ? error.message : "Unknown error"
      }
    });
    throw error;
  }
}

function readPayload(data: unknown): { assessmentId: string; userId: string } {
  if (typeof data !== "object" || data === null) {
    throw new AppError("Payload assessment job tidak valid", "JOB_INVALID", 400);
  }
  const assessmentId = (data as Record<string, unknown>).assessmentId;
  const userId = (data as Record<string, unknown>).userId;
  if (typeof assessmentId !== "string" || typeof userId !== "string") {
    throw new AppError("assessmentId dan userId wajib diisi", "JOB_INVALID", 400);
  }

  return { assessmentId, userId };
}

function buildDifficultyQueue(mix: Record<string, unknown>, total: number): Array<"mudah" | "sedang" | "sulit"> {
  const result: Array<"mudah" | "sedang" | "sulit"> = [];
  const entries: Array<["mudah" | "sedang" | "sulit", number]> = [
    ["mudah", typeof mix.mudah === "number" ? mix.mudah : 0],
    ["sedang", typeof mix.sedang === "number" ? mix.sedang : 0],
    ["sulit", typeof mix.sulit === "number" ? mix.sulit : 0]
  ];

  for (const [label, value] of entries) {
    const count = Math.round((value / 100) * Math.max(total, 1));
    for (let index = 0; index < count; index += 1) {
      result.push(label);
    }
  }

  while (result.length < total) {
    result.push("sedang");
  }

  return result;
}

function buildSkillInput(
  skillSlug: string,
  input: {
    topic: string;
    subject: string;
    gradeLevel: string;
    difficulty: "mudah" | "sedang" | "sulit";
    count: number;
    cognitiveLevels: Array<"C1" | "C2" | "C3" | "C4" | "C5" | "C6">;
    sourceContext?: string;
  }
): Record<string, unknown> {
  if (skillSlug === "generate-soal-pilihan-ganda") {
    return {
      topic: input.topic,
      subject: input.subject,
      grade_level: input.gradeLevel,
      difficulty: difficultyToEnglish(input.difficulty),
      count: input.count,
      language: "id",
      sourceContext: input.sourceContext ?? ""
    };
  }

  if (skillSlug === "generate-soal-benar-salah") {
    return {
      topic: input.topic,
      subject: input.subject,
      grade_level: input.gradeLevel,
      count: input.count,
      sourceContext: input.sourceContext ?? ""
    };
  }

  if (skillSlug === "generate-soal-pilihan-ganda-kompleks") {
    return {
      topic: input.topic,
      gradeLevel: input.gradeLevel,
      difficulty: input.difficulty === "mudah" ? "sedang" : input.difficulty,
      questionCount: input.count,
      optionCount: 5,
      minCorrect: 2,
      maxCorrect: 3,
      sourceContext: input.sourceContext ?? ""
    };
  }

  if (skillSlug === "generate-soal-menjodohkan") {
    return {
      topic: input.topic,
      gradeLevel: input.gradeLevel,
      pairCount: Math.max(input.count, 3),
      distractorCount: 2,
      matchingType: "term-definition",
      sourceContext: input.sourceContext ?? ""
    };
  }

  if (skillSlug === "generate-soal-isian-singkat") {
    return {
      topic: input.topic,
      gradeLevel: input.gradeLevel,
      questionCount: input.count,
      blankPosition: "acak",
      sourceContext: input.sourceContext ?? ""
    };
  }

  return {
    topic: input.topic,
    gradeLevel: input.gradeLevel,
    questionCount: input.count,
    difficulty: input.difficulty,
    maxScore: 10,
    cognitiveTarget: input.cognitiveLevels[0],
    sourceContext: input.sourceContext ?? ""
  };
}

function difficultyToEnglish(value: "mudah" | "sedang" | "sulit"): "easy" | "medium" | "hard" {
  if (value === "mudah") {
    return "easy";
  }
  if (value === "sulit") {
    return "hard";
  }
  return "medium";
}
