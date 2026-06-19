import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { SkillExecutionRecord, SkillExecutionStore } from "@app/skills/skill-execution.use-case";
import { db } from "@infra/database/client";
import { skillExecutions, skills } from "@infra/database/schema";
import { withSoftDelete } from "@infra/database/soft-delete";

export class DrizzleSkillExecutionStore implements SkillExecutionStore {
  public async createPending(input: {
    userId: string;
    skillId: string;
    skillSlug: string;
    input: Record<string, unknown>;
  }): Promise<SkillExecutionRecord> {
    const [record] = await db
      .insert(skillExecutions)
      .values({
        userId: input.userId,
        skillId: input.skillId,
        input: input.input,
        status: "pending"
      })
      .returning();

    if (!record) {
      throw new Error("Failed to create skill execution");
    }

    return mapExecution(record, input.skillSlug);
  }

  public async updateStatus(
    id: string,
    patch: Partial<Pick<SkillExecutionRecord, "status" | "output" | "error" | "durationMs">>
  ): Promise<SkillExecutionRecord | null> {
    const [updated] = await db
      .update(skillExecutions)
      .set({
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.output ? { output: patch.output } : {}),
        ...(typeof patch.error === "string" ? { error: patch.error } : {}),
        ...(typeof patch.durationMs === "number" ? { durationMs: patch.durationMs } : {})
      })
      .where(eq(skillExecutions.id, id))
      .returning();

    if (!updated) {
      return null;
    }

    const skill = await db.query.skills.findFirst({ where: eq(skills.id, updated.skillId) });
    return mapExecution(updated, skill?.slug ?? "");
  }

  public async findById(id: string, userId?: string): Promise<SkillExecutionRecord | null> {
    const condition = userId ? and(eq(skillExecutions.id, id), eq(skillExecutions.userId, userId)) : eq(skillExecutions.id, id);
    const record = await db.query.skillExecutions.findFirst({ where: withSoftDelete(skillExecutions, condition) });
    if (!record) {
      return null;
    }

    const skill = await db.query.skills.findFirst({ where: eq(skills.id, record.skillId) });
    return mapExecution(record, skill?.slug ?? "");
  }

  public async listByUserId(input: {
    userId: string;
    status?: SkillExecutionRecord["status"];
    skillSlug?: string;
    after?: string;
    before?: string;
    page: number;
    limit: number;
  }): Promise<{ items: SkillExecutionRecord[]; total: number }> {
    const offset = (input.page - 1) * input.limit;
    const conditions = [eq(skillExecutions.userId, input.userId)];
    if (input.status) {
      conditions.push(eq(skillExecutions.status, input.status));
    }
    if (input.after) {
      conditions.push(gte(skillExecutions.createdAt, new Date(input.after)));
    }
    if (input.before) {
      conditions.push(lte(skillExecutions.createdAt, new Date(input.before)));
    }

    if (input.skillSlug) {
      const rows = await db
        .select({
          execution: skillExecutions,
          skillSlug: skills.slug
        })
        .from(skillExecutions)
        .innerJoin(skills, eq(skillExecutions.skillId, skills.id))
        .where(withSoftDelete(skillExecutions, and(...conditions, eq(skills.slug, input.skillSlug))))
        .orderBy(sql`${skillExecutions.createdAt} desc`)
        .limit(input.limit)
        .offset(offset);

      const totalRows = await db
        .select({ count: sql<number>`count(*)` })
        .from(skillExecutions)
        .innerJoin(skills, eq(skillExecutions.skillId, skills.id))
        .where(withSoftDelete(skillExecutions, and(...conditions, eq(skills.slug, input.skillSlug))));

      return {
        items: rows.map((row) => mapExecution(row.execution, row.skillSlug)),
        total: Number(totalRows[0]?.count ?? 0)
      };
    }

    const rows = await db.query.skillExecutions.findMany({
      where: withSoftDelete(skillExecutions, and(...conditions)),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
      limit: input.limit,
      offset
    });

    const totalRows = await db.select({ count: sql<number>`count(*)` }).from(skillExecutions).where(withSoftDelete(skillExecutions, and(...conditions)));
    const skillRows = await db.select({ id: skills.id, slug: skills.slug }).from(skills);
    const skillSlugById = new Map(skillRows.map((row) => [row.id, row.slug]));

    return {
      items: rows.map((row) => mapExecution(row, skillSlugById.get(row.skillId) ?? "")),
      total: Number(totalRows[0]?.count ?? 0)
    };
  }

  public async deleteById(id: string, userId?: string): Promise<boolean> {
    const condition = userId ? and(eq(skillExecutions.id, id), eq(skillExecutions.userId, userId)) : eq(skillExecutions.id, id);
    const [updated] = await db
      .update(skillExecutions)
      .set({ deletedAt: new Date() })
      .where(withSoftDelete(skillExecutions, condition))
      .returning({ id: skillExecutions.id });

    return Boolean(updated);
  }
}

function mapExecution(
  record: typeof skillExecutions.$inferSelect,
  skillSlug: string
): SkillExecutionRecord {
  return {
    id: record.id,
    userId: record.userId,
    skillId: record.skillId,
    skillSlug,
    input: record.input as Record<string, unknown>,
    output: (record.output as Record<string, unknown> | unknown[] | null) ?? null,
    status: record.status,
    durationMs: record.durationMs,
    error: record.error,
    createdAt: record.createdAt
  };
}
