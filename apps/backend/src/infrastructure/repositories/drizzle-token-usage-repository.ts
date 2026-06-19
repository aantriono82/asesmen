import { and, eq, gte, sql } from "drizzle-orm";
import type { TokenUsageEntity } from "@domain/entities/chat";
import { db } from "@infra/database/client";
import { tokenUsage } from "@infra/database/schema";
import type { AIProviderName } from "@infra/ai/ai-provider.factory";
import { aiTokensUsedTotal } from "@infra/monitoring/metrics";

function mapUsage(row: typeof tokenUsage.$inferSelect): TokenUsageEntity {
  return {
    ...row,
    provider: row.provider as AIProviderName,
    costUsd: Number(row.costUsd)
  };
}

export class DrizzleTokenUsageRepository {
  public async create(input: {
    userId: string;
    sessionId?: string | null;
    provider: AIProviderName;
    model: string;
    tokensIn: number;
    tokensOut: number;
    costUsd: number;
  }): Promise<TokenUsageEntity> {
    const [created] = await db
      .insert(tokenUsage)
      .values({
        userId: input.userId,
        sessionId: input.sessionId ?? null,
        provider: input.provider,
        model: input.model,
        tokensIn: input.tokensIn,
        tokensOut: input.tokensOut,
        costUsd: input.costUsd.toFixed(6)
      })
      .returning();

    if (!created) {
      throw new Error("Gagal menyimpan token usage");
    }

    aiTokensUsedTotal.inc({ provider: input.provider, model: input.model }, input.tokensIn + input.tokensOut);

    return mapUsage(created);
  }

  public async getMonthlySummary(userId: string, fromDate: Date): Promise<{
    tokensIn: number;
    tokensOut: number;
    costUsd: number;
  }> {
    const [summary] = await db
      .select({
        tokensIn: sql<number>`coalesce(sum(${tokenUsage.tokensIn}), 0)`,
        tokensOut: sql<number>`coalesce(sum(${tokenUsage.tokensOut}), 0)`,
        costUsd: sql<string>`coalesce(sum(${tokenUsage.costUsd}), 0)::text`
      })
      .from(tokenUsage)
      .where(and(eq(tokenUsage.userId, userId), gte(tokenUsage.createdAt, fromDate)));

    return {
      tokensIn: Number(summary?.tokensIn ?? 0),
      tokensOut: Number(summary?.tokensOut ?? 0),
      costUsd: Number(summary?.costUsd ?? 0)
    };
  }

  public async getHistoryBySession(userId: string, sessionId?: string): Promise<TokenUsageEntity[]> {
    const filters = [eq(tokenUsage.userId, userId)];

    if (sessionId) {
      filters.push(eq(tokenUsage.sessionId, sessionId));
    }

    const items = await db.query.tokenUsage.findMany({
      where: and(...filters),
      orderBy: (table, { desc }) => [desc(table.createdAt)]
    });

    return items.map(mapUsage);
  }
}
