import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@infra/database/client";
import {
  assessments,
  curricula,
  generatedDocuments,
  questionBank,
  questions,
  type Assessment,
  type Curriculum,
  type GeneratedDocument,
  type Question,
  type QuestionBankItem
} from "@infra/database/schema";
import { withSoftDelete } from "@infra/database/soft-delete";
import { resolvePagination, toPaginatedResult, type PaginatedResult } from "@lib/pagination";

export interface AssessmentDetail extends Assessment {
  questions: Question[];
}

export class DrizzleAssessmentRepository {
  public async createAssessment(input: Omit<typeof assessments.$inferInsert, "id" | "createdAt" | "updatedAt">): Promise<Assessment> {
    const [record] = await db.insert(assessments).values(input).returning();
    if (!record) {
      throw new Error("Failed to create assessment");
    }

    return record;
  }

  public async updateAssessment(
    id: string,
    userId: string,
    patch: Partial<typeof assessments.$inferInsert>
  ): Promise<Assessment | null> {
    const [record] = await db
      .update(assessments)
      .set({ ...patch, updatedAt: new Date() })
      .where(withSoftDelete(assessments, and(eq(assessments.id, id), eq(assessments.userId, userId))))
      .returning();

    return record ?? null;
  }

  public async getAssessment(id: string, userId: string): Promise<AssessmentDetail | null> {
    const assessment = await db.query.assessments.findFirst({
      where: withSoftDelete(assessments, and(eq(assessments.id, id), eq(assessments.userId, userId)))
    });
    if (!assessment) {
      return null;
    }

    const assessmentQuestions = await db.query.questions.findMany({
      where: withSoftDelete(questions, eq(questions.assessmentId, assessment.id)),
      orderBy: [asc(questions.questionNumber)]
    });

    return {
      ...assessment,
      questions: assessmentQuestions
    };
  }

  public async listAssessments(input: {
    userId: string;
    page?: number;
    limit?: number;
    subject?: string;
    status?: string;
  }): Promise<PaginatedResult<Assessment>> {
    const pagination = resolvePagination(input.page, input.limit);
    const conditions = [eq(assessments.userId, input.userId)];
    if (input.subject) {
      conditions.push(eq(assessments.subject, input.subject));
    }
    if (input.status) {
      conditions.push(eq(assessments.status, input.status as typeof assessments.$inferSelect.status));
    }

    const where = withSoftDelete(assessments, and(...conditions));
    const [items, totalRows] = await Promise.all([
      db.query.assessments.findMany({
        where,
        orderBy: [desc(assessments.createdAt)],
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit
      }),
      db.select({ count: sql<number>`count(*)` }).from(assessments).where(where)
    ]);

    return toPaginatedResult(items, Number(totalRows[0]?.count ?? 0), pagination);
  }

  public async softDeleteAssessment(id: string, userId: string): Promise<boolean> {
    const [record] = await db
      .update(assessments)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(withSoftDelete(assessments, and(eq(assessments.id, id), eq(assessments.userId, userId))))
      .returning({ id: assessments.id });

    return Boolean(record);
  }

  public async replaceQuestions(assessmentId: string, items: Array<Omit<typeof questions.$inferInsert, "assessmentId">>): Promise<Question[]> {
    await db.update(questions).set({ deletedAt: new Date(), updatedAt: new Date() }).where(withSoftDelete(questions, eq(questions.assessmentId, assessmentId)));
    if (items.length === 0) {
      return [];
    }

    return db
      .insert(questions)
      .values(items.map((item) => ({ ...item, assessmentId })))
      .returning();
  }

  public async addQuestion(assessmentId: string, question: Omit<typeof questions.$inferInsert, "assessmentId">): Promise<Question> {
    const [record] = await db
      .insert(questions)
      .values({ ...question, assessmentId })
      .returning();
    if (!record) {
      throw new Error("Failed to insert question");
    }

    return record;
  }

  public async updateQuestion(assessmentId: string, questionId: string, patch: Partial<typeof questions.$inferInsert>): Promise<Question | null> {
    const [record] = await db
      .update(questions)
      .set({ ...patch, updatedAt: new Date() })
      .where(withSoftDelete(questions, and(eq(questions.id, questionId), eq(questions.assessmentId, assessmentId))))
      .returning();

    return record ?? null;
  }

  public async softDeleteQuestion(assessmentId: string, questionId: string): Promise<boolean> {
    const [record] = await db
      .update(questions)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(withSoftDelete(questions, and(eq(questions.id, questionId), eq(questions.assessmentId, assessmentId))))
      .returning({ id: questions.id });

    return Boolean(record);
  }

  public async reorderQuestions(assessmentId: string, orders: Array<{ id: string; questionNumber: number }>): Promise<void> {
    for (const order of orders) {
      await db
        .update(questions)
        .set({ questionNumber: order.questionNumber, updatedAt: new Date() })
        .where(withSoftDelete(questions, and(eq(questions.id, order.id), eq(questions.assessmentId, assessmentId))));
    }
  }

  public async listQuestionBank(input: {
    userId: string;
    page?: number;
    limit?: number;
    subject?: string;
    gradeLevel?: string;
    type?: string;
    difficulty?: string;
    tags?: string[];
    query?: string;
  }): Promise<PaginatedResult<QuestionBankItem & { question: Question | null }>> {
    const pagination = resolvePagination(input.page, input.limit);
    const bankConditions = [eq(questionBank.userId, input.userId)];
    if (input.subject) {
      bankConditions.push(eq(questionBank.subject, input.subject));
    }
    if (input.gradeLevel) {
      bankConditions.push(eq(questionBank.gradeLevel, input.gradeLevel));
    }

    const questionConditions = [];
    if (input.type) {
      questionConditions.push(eq(questions.type, input.type as typeof questions.$inferSelect.type));
    }
    if (input.difficulty) {
      questionConditions.push(eq(questions.difficulty, input.difficulty as "mudah" | "sedang" | "sulit"));
    }
    if (input.query) {
      questionConditions.push(ilike(questions.content, `%${input.query}%`));
    }
    if (input.tags && input.tags.length > 0) {
      questionConditions.push(sql`${questions.tags} && ${input.tags}`);
    }

    const where = and(withSoftDelete(questionBank, and(...bankConditions)), withSoftDelete(questions, questionConditions.length > 0 ? and(...questionConditions) : undefined));
    const [rows, totalRows] = await Promise.all([
      db
        .select({
          bank: questionBank,
          question: questions
        })
        .from(questionBank)
        .innerJoin(questions, eq(questionBank.questionId, questions.id))
        .where(where)
        .orderBy(desc(questionBank.createdAt))
        .limit(pagination.limit)
        .offset((pagination.page - 1) * pagination.limit),
      db
        .select({ count: sql<number>`count(*)` })
        .from(questionBank)
        .innerJoin(questions, eq(questionBank.questionId, questions.id))
        .where(where)
    ]);

    return toPaginatedResult(
      rows.map((row) => ({ ...row.bank, question: row.question })),
      Number(totalRows[0]?.count ?? 0),
      pagination
    );
  }

  public async createQuestionBankItem(input: Omit<typeof questionBank.$inferInsert, "id" | "createdAt">): Promise<QuestionBankItem> {
    const [record] = await db.insert(questionBank).values(input).returning();
    if (!record) {
      throw new Error("Failed to create question bank item");
    }

    return record;
  }

  public async getQuestionForUser(questionId: string, userId: string): Promise<(Question & { assessment: Assessment | null }) | null> {
    const row = await db
      .select({
        question: questions,
        assessment: assessments
      })
      .from(questions)
      .innerJoin(assessments, eq(questions.assessmentId, assessments.id))
      .where(
        and(
          withSoftDelete(questions, eq(questions.id, questionId)),
          withSoftDelete(assessments, and(eq(assessments.id, questions.assessmentId), eq(assessments.userId, userId)))
        )
      )
      .limit(1);

    const record = row[0];
    return record ? { ...record.question, assessment: record.assessment } : null;
  }

  public async getQuestionBankItem(id: string, userId: string): Promise<(QuestionBankItem & { question: Question | null }) | null> {
    const row = await db
      .select({
        bank: questionBank,
        question: questions
      })
      .from(questionBank)
      .innerJoin(questions, eq(questionBank.questionId, questions.id))
      .where(and(withSoftDelete(questionBank, and(eq(questionBank.id, id), eq(questionBank.userId, userId))), withSoftDelete(questions)))
      .limit(1);

    const record = row[0];
    return record ? { ...record.bank, question: record.question } : null;
  }

  public async updateQuestionBankItem(id: string, userId: string, patch: Partial<typeof questionBank.$inferInsert>): Promise<QuestionBankItem | null> {
    const [record] = await db
      .update(questionBank)
      .set(patch)
      .where(withSoftDelete(questionBank, and(eq(questionBank.id, id), eq(questionBank.userId, userId))))
      .returning();

    return record ?? null;
  }

  public async softDeleteQuestionBankItem(id: string, userId: string): Promise<boolean> {
    const [record] = await db
      .update(questionBank)
      .set({ deletedAt: new Date() })
      .where(withSoftDelete(questionBank, and(eq(questionBank.id, id), eq(questionBank.userId, userId))))
      .returning({ id: questionBank.id });

    return Boolean(record);
  }

  public async incrementQuestionBankUsage(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    await db
      .update(questionBank)
      .set({ usageCount: sql`${questionBank.usageCount} + 1` })
      .where(withSoftDelete(questionBank, inArray(questionBank.id, ids)));
  }

  public async listQuestionBankItemsByIds(ids: string[], userId: string): Promise<Array<QuestionBankItem & { question: Question | null }>> {
    if (ids.length === 0) {
      return [];
    }

    const rows = await db
      .select({
        bank: questionBank,
        question: questions
      })
      .from(questionBank)
      .innerJoin(questions, eq(questionBank.questionId, questions.id))
      .where(and(withSoftDelete(questionBank, and(eq(questionBank.userId, userId), inArray(questionBank.id, ids))), withSoftDelete(questions)));

    return rows.map((row) => ({ ...row.bank, question: row.question }));
  }

  public async searchQuestionBank(input: {
    userId: string;
    query: string;
    subject?: string;
    type?: string;
  }): Promise<Array<QuestionBankItem & { question: Question | null }>> {
    const conditions = [
      eq(questionBank.userId, input.userId),
      ilike(questions.content, `%${input.query}%`)
    ];
    if (input.subject) {
      conditions.push(eq(questionBank.subject, input.subject));
    }
    if (input.type) {
      conditions.push(eq(questions.type, input.type as typeof questions.$inferSelect.type));
    }

    const rows = await db
      .select({
        bank: questionBank,
        question: questions
      })
      .from(questionBank)
      .innerJoin(questions, eq(questionBank.questionId, questions.id))
      .where(and(withSoftDelete(questionBank, and(...conditions)), withSoftDelete(questions)))
      .orderBy(desc(questionBank.createdAt))
      .limit(50);

    return rows.map((row) => ({ ...row.bank, question: row.question }));
  }

  public async listBankCandidates(subject: string, gradeLevel: string, limit: number, userId: string): Promise<Array<QuestionBankItem & { question: Question | null }>> {
    const rows = await db
      .select({
        bank: questionBank,
        question: questions
      })
      .from(questionBank)
      .innerJoin(questions, eq(questionBank.questionId, questions.id))
      .where(
        and(
          withSoftDelete(questionBank, and(eq(questionBank.userId, userId), eq(questionBank.subject, subject), eq(questionBank.gradeLevel, gradeLevel))),
          withSoftDelete(questions)
        )
      )
      .orderBy(desc(questionBank.usageCount), desc(questionBank.createdAt))
      .limit(limit);

    return rows.map((row) => ({ ...row.bank, question: row.question }));
  }

  public async createCurriculum(input: Omit<typeof curricula.$inferInsert, "id" | "createdAt" | "updatedAt">): Promise<Curriculum> {
    const [record] = await db.insert(curricula).values(input).returning();
    if (!record) {
      throw new Error("Failed to create curriculum");
    }

    return record;
  }

  public async updateCurriculum(id: string, userId: string, patch: Partial<typeof curricula.$inferInsert>): Promise<Curriculum | null> {
    const [record] = await db
      .update(curricula)
      .set({ ...patch, updatedAt: new Date() })
      .where(withSoftDelete(curricula, and(eq(curricula.id, id), eq(curricula.userId, userId))))
      .returning();

    return record ?? null;
  }

  public async listCurricula(input: {
    userId: string;
    page?: number;
    limit?: number;
    type?: string;
    subject?: string;
  }): Promise<PaginatedResult<Curriculum>> {
    const pagination = resolvePagination(input.page, input.limit);
    const conditions = [eq(curricula.userId, input.userId)];
    if (input.type) {
      conditions.push(eq(curricula.type, input.type as typeof curricula.$inferSelect.type));
    }
    if (input.subject) {
      conditions.push(eq(curricula.subject, input.subject));
    }

    const where = withSoftDelete(curricula, and(...conditions));
    const [items, totalRows] = await Promise.all([
      db.query.curricula.findMany({
        where,
        orderBy: [desc(curricula.createdAt)],
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit
      }),
      db.select({ count: sql<number>`count(*)` }).from(curricula).where(where)
    ]);

    return toPaginatedResult(items, Number(totalRows[0]?.count ?? 0), pagination);
  }

  public async getCurriculum(id: string, userId: string): Promise<Curriculum | null> {
    return (
      (await db.query.curricula.findFirst({
        where: withSoftDelete(curricula, and(eq(curricula.id, id), eq(curricula.userId, userId)))
      })) ?? null
    );
  }

  public async softDeleteCurriculum(id: string, userId: string): Promise<boolean> {
    const [record] = await db
      .update(curricula)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(withSoftDelete(curricula, and(eq(curricula.id, id), eq(curricula.userId, userId))))
      .returning({ id: curricula.id });

    return Boolean(record);
  }

  public async createGeneratedDocument(input: Omit<typeof generatedDocuments.$inferInsert, "id" | "createdAt">): Promise<GeneratedDocument> {
    const [record] = await db.insert(generatedDocuments).values(input).returning();
    if (!record) {
      throw new Error("Failed to create generated document");
    }

    return record;
  }

  public async listGeneratedDocuments(input: {
    userId: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<GeneratedDocument>> {
    const pagination = resolvePagination(input.page, input.limit);
    const where = eq(generatedDocuments.userId, input.userId);
    const [items, totalRows] = await Promise.all([
      db.query.generatedDocuments.findMany({
        where,
        orderBy: [desc(generatedDocuments.createdAt)],
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit
      }),
      db.select({ count: sql<number>`count(*)` }).from(generatedDocuments).where(where)
    ]);

    return toPaginatedResult(items, Number(totalRows[0]?.count ?? 0), pagination);
  }

  public async getGeneratedDocument(id: string, userId: string): Promise<GeneratedDocument | null> {
    return (
      (await db.query.generatedDocuments.findFirst({
        where: and(eq(generatedDocuments.id, id), eq(generatedDocuments.userId, userId))
      })) ?? null
    );
  }

  public async searchKnowledge(input: {
    userId: string;
    q: string;
    types: string[];
    subject?: string;
  }): Promise<Array<Record<string, unknown>>> {
    const results: Array<Record<string, unknown>> = [];
    if (input.types.includes("assessment")) {
      const rows = await db.query.assessments.findMany({
        where: withSoftDelete(
          assessments,
          and(eq(assessments.userId, input.userId), ilike(assessments.title, `%${input.q}%`), input.subject ? eq(assessments.subject, input.subject) : undefined)
        ),
        limit: 25
      });
      results.push(...rows.map((item) => ({ type: "assessment", id: item.id, title: item.title, subject: item.subject, content: item.config })));
    }
    if (input.types.includes("question")) {
      const rows = await db
        .select({
          question: questions,
          assessmentTitle: assessments.title
        })
        .from(questions)
        .innerJoin(assessments, eq(questions.assessmentId, assessments.id))
        .where(
          and(
            withSoftDelete(questions, ilike(questions.content, `%${input.q}%`)),
            withSoftDelete(assessments, and(eq(assessments.userId, input.userId), input.subject ? eq(assessments.subject, input.subject) : undefined))
          )
        )
        .limit(25);
      results.push(
        ...rows.map((row) => ({
          type: "question",
          id: row.question.id,
          title: row.assessmentTitle,
          subject: null,
          content: row.question.content
        }))
      );
    }
    if (input.types.includes("curriculum")) {
      const rows = await db.query.curricula.findMany({
        where: withSoftDelete(
          curricula,
          and(
            eq(curricula.userId, input.userId),
            or(ilike(curricula.title, `%${input.q}%`), sql`${curricula.content}::text ILIKE ${`%${input.q}%`}`),
            input.subject ? eq(curricula.subject, input.subject) : undefined
          )
        ),
        limit: 25
      });
      results.push(...rows.map((item) => ({ type: "curriculum", id: item.id, title: item.title, subject: item.subject, content: item.content })));
    }

    return results;
  }

  public async appendTags(input: {
    entityType: "assessment" | "curriculum" | "question";
    entityId: string;
    userId: string;
    tags: string[];
  }): Promise<void> {
    if (input.entityType === "question") {
      const question = await db.query.questions.findFirst({
        where: withSoftDelete(questions, eq(questions.id, input.entityId))
      });
      if (!question) {
        return;
      }
      const merged = [...new Set([...(question.tags ?? []), ...input.tags])];
      await db.update(questions).set({ tags: merged, updatedAt: new Date() }).where(eq(questions.id, input.entityId));
      return;
    }

    if (input.entityType === "assessment") {
      const assessment = await db.query.assessments.findFirst({
        where: withSoftDelete(assessments, and(eq(assessments.id, input.entityId), eq(assessments.userId, input.userId)))
      });
      if (!assessment) {
        return;
      }
      const config = (assessment.config ?? {}) as Record<string, unknown>;
      const currentTags = Array.isArray(config.tags) ? config.tags.filter((tag): tag is string => typeof tag === "string") : [];
      await db
        .update(assessments)
        .set({ config: { ...config, tags: [...new Set([...currentTags, ...input.tags])] }, updatedAt: new Date() })
        .where(eq(assessments.id, input.entityId));
      return;
    }

    const curriculum = await db.query.curricula.findFirst({
      where: withSoftDelete(curricula, and(eq(curricula.id, input.entityId), eq(curricula.userId, input.userId)))
    });
    if (!curriculum) {
      return;
    }
    const content = (curriculum.content ?? {}) as Record<string, unknown>;
    const currentTags = Array.isArray(content.tags) ? content.tags.filter((tag): tag is string => typeof tag === "string") : [];
    await db
      .update(curricula)
      .set({ content: { ...content, tags: [...new Set([...currentTags, ...input.tags])] }, updatedAt: new Date() })
      .where(eq(curricula.id, input.entityId));
  }

  public async listKnowledgeTags(userId: string): Promise<string[]> {
    const [questionRows, assessmentRows, curriculumRows] = await Promise.all([
      db.select({ tags: questions.tags }).from(questions).innerJoin(assessments, eq(questions.assessmentId, assessments.id)).where(withSoftDelete(questions, eq(assessments.userId, userId))),
      db.select({ config: assessments.config }).from(assessments).where(withSoftDelete(assessments, eq(assessments.userId, userId))),
      db.select({ content: curricula.content }).from(curricula).where(withSoftDelete(curricula, eq(curricula.userId, userId)))
    ]);
    const tags = new Set<string>();

    for (const row of questionRows) {
      for (const tag of row.tags ?? []) {
        if (tag) {
          tags.add(tag);
        }
      }
    }

    for (const row of assessmentRows) {
      const config = row.config as Record<string, unknown>;
      const values = Array.isArray(config.tags) ? config.tags : [];
      for (const tag of values) {
        if (typeof tag === "string" && tag.length > 0) {
          tags.add(tag);
        }
      }
    }

    for (const row of curriculumRows) {
      const content = row.content as Record<string, unknown>;
      const values = Array.isArray(content.tags) ? content.tags : [];
      for (const tag of values) {
        if (typeof tag === "string" && tag.length > 0) {
          tags.add(tag);
        }
      }
    }

    return [...tags].sort((a, b) => a.localeCompare(b));
  }

  public async cloneQuestionsToAssessment(assessmentId: string, bankIds: string[], userId: string): Promise<Question[]> {
    const items = await this.listQuestionBankItemsByIds(bankIds, userId);
    const currentCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(questions)
      .where(withSoftDelete(questions, eq(questions.assessmentId, assessmentId)));
    let nextQuestionNumber = Number(currentCountResult[0]?.count ?? 0) + 1;

    const cloned: Question[] = [];
    for (const item of items) {
      if (!item.question) {
        continue;
      }

      const [record] = await db
        .insert(questions)
        .values({
          assessmentId,
          questionNumber: nextQuestionNumber,
          type: item.question.type,
          content: item.question.content,
          options: item.question.options,
          correctAnswer: item.question.correctAnswer,
          explanation: item.question.explanation,
          difficulty: item.question.difficulty,
          cognitiveLevel: item.question.cognitiveLevel,
          score: item.question.score,
          tags: item.question.tags,
          source: "bank",
          generatedBySkill: item.question.generatedBySkill
        })
        .returning();

      if (record) {
        cloned.push(record);
        nextQuestionNumber += 1;
      }
    }

    await this.incrementQuestionBankUsage(bankIds);
    return cloned;
  }
}
