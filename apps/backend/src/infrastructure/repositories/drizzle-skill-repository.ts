import { and, eq, notInArray } from "drizzle-orm";
import type { SkillEntity } from "@domain/entities/skill";
import type { SkillRepository } from "@domain/repositories/skill-repository";
import { db } from "@infra/database/client";
import { skills } from "@infra/database/schema";
import { withSoftDelete } from "@infra/database/soft-delete";

function mapSkill(record: typeof skills.$inferSelect): SkillEntity {
  return {
    ...record,
    tags: Array.isArray(record.tags) ? record.tags.filter((tag): tag is string => typeof tag === "string") : [],
    inputSchema: isRecord(record.inputSchema) ? record.inputSchema : {},
    outputSchema: isRecord(record.outputSchema) ? record.outputSchema : {},
    preferredModel: typeof record.preferredModel === "string" && record.preferredModel.length > 0 ? record.preferredModel : null
  };
}

export class DrizzleSkillRepository implements SkillRepository {
  public async findActive(): Promise<SkillEntity[]> {
    try {
      return await db.query.skills.findMany({
        where: withSoftDelete(skills, eq(skills.isActive, true)),
        orderBy: (table, { asc }) => [asc(table.name)]
      }).then((rows) => rows.map(mapSkill));
    } catch (error: unknown) {
      if (isMissingColumnError(error, "deleted_at")) {
        return db.query.skills.findMany({
          where: eq(skills.isActive, true),
          orderBy: (table, { asc }) => [asc(table.name)]
        }).then((rows) => rows.map(mapSkill));
      }

      throw error;
    }
  }

  public async findAll(): Promise<SkillEntity[]> {
    try {
      return await db.query.skills.findMany({
        orderBy: (table, { asc }) => [asc(table.name)]
      }).then((rows) => rows.map(mapSkill));
    } catch (error: unknown) {
      if (isMissingColumnError(error, "deleted_at")) {
        return db.query.skills.findMany({
          orderBy: (table, { asc }) => [asc(table.name)]
        }).then((rows) => rows.map(mapSkill));
      }

      throw error;
    }
  }

  public async findActiveBySlug(slug: string): Promise<SkillEntity | null> {
    const skill = await this.findFirstBySlug(slug, true);

    return skill ?? null;
  }

  public async findBySlug(slug: string): Promise<SkillEntity | null> {
    const skill = await this.findFirstBySlug(slug, false);

    return skill ?? null;
  }

  public async syncSkill(input: {
    name: string;
    slug: string;
    description: string;
    filePath: string;
    version: string;
    category: string;
    tags: string[];
    inputSchema: Record<string, unknown>;
    outputSchema: Record<string, unknown>;
    promptTemplate: string;
    preferredModel: string | null;
    isActive: boolean;
  }): Promise<SkillEntity> {
    const existing = await this.findBySlug(input.slug);

    if (existing) {
      const [updated] = await db
        .update(skills)
        .set({
          name: input.name,
          description: input.description,
          filePath: input.filePath,
          version: input.version,
          category: input.category,
          tags: input.tags,
          inputSchema: input.inputSchema,
          outputSchema: input.outputSchema,
          promptTemplate: input.promptTemplate,
          preferredModel: input.preferredModel,
          isActive: input.isActive,
          updatedAt: new Date()
        })
        .where(eq(skills.id, existing.id))
        .returning();

      if (!updated) {
        throw new Error("Failed to update skill");
      }

      return mapSkill(updated);
    }

    const [created] = await db.insert(skills).values(input).returning();
    if (!created) {
      throw new Error("Failed to create skill");
    }

    return mapSkill(created);
  }

  public async deactivateMissing(activeSlugs: string[]): Promise<number> {
    const result =
      activeSlugs.length === 0
        ? await db.update(skills).set({ isActive: false, updatedAt: new Date() })
        : await db.update(skills).set({ isActive: false, updatedAt: new Date() }).where(notInArray(skills.slug, activeSlugs));
    return Number(result.rowCount ?? 0);
  }

  private async findFirstBySlug(slug: string, onlyActive: boolean): Promise<SkillEntity | null> {
    const condition = onlyActive ? and(eq(skills.slug, slug), eq(skills.isActive, true)) : eq(skills.slug, slug);

    try {
      const record = await db.query.skills.findFirst({
        where: withSoftDelete(skills, condition)
      });
      return record ? mapSkill(record) : null;
    } catch (error: unknown) {
      if (isMissingColumnError(error, "deleted_at")) {
        const record = await db.query.skills.findFirst({
          where: condition
        });
        return record ? mapSkill(record) : null;
      }

      throw error;
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMissingColumnError(error: unknown, columnName: string): boolean {
  return Boolean(
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42703" &&
    "message" in error &&
    typeof (error as { message?: string }).message === "string" &&
    (error as { message?: string }).message?.includes(columnName)
  );
}
