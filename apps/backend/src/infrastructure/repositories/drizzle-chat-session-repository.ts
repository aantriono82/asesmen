import { and, count, eq } from "drizzle-orm";
import type { ChatMessageEntity, ChatSessionEntity } from "@domain/entities/chat";
import { db } from "@infra/database/client";
import { chatMessages, chatSessions } from "@infra/database/schema";
import type { AIProviderName } from "@infra/ai/ai-provider.factory";
import type { ToolCall } from "@infra/ai/providers/base.provider";

function mapSession(row: typeof chatSessions.$inferSelect): ChatSessionEntity {
  return {
    ...row,
    provider: row.provider as AIProviderName
  };
}

function mapMessage(row: typeof chatMessages.$inferSelect): ChatMessageEntity {
  return {
    ...row,
    toolCallId: row.toolCallId ?? null,
    toolInput: isRecord(row.toolInput) ? row.toolInput : null,
    toolOutput: isRecord(row.toolOutput) ? row.toolOutput : null,
    toolCalls: Array.isArray(row.toolCalls) ? (row.toolCalls as ToolCall[]) : null
  };
}

export class DrizzleChatSessionRepository {
  public async create(input: {
    userId: string;
    title: string;
    provider: AIProviderName;
    model: string;
    systemPrompt?: string;
    knowledgeBaseId?: string | null;
  }): Promise<ChatSessionEntity> {
    const [created] = await db
      .insert(chatSessions)
      .values({
        userId: input.userId,
        title: input.title,
        provider: input.provider,
        model: input.model,
        systemPrompt: input.systemPrompt ?? "",
        knowledgeBaseId: input.knowledgeBaseId ?? null
      })
      .returning();

    if (!created) {
      throw new Error("Gagal membuat chat session");
    }

    return mapSession(created);
  }

  public async listByUser(input: {
    userId: string;
    page: number;
    limit: number;
  }): Promise<{ items: ChatSessionEntity[]; total: number }> {
    const offset = (input.page - 1) * input.limit;
    const [items, totalRow] = await Promise.all([
      db.query.chatSessions.findMany({
        where: eq(chatSessions.userId, input.userId),
        orderBy: (table, { desc: orderDesc }) => [orderDesc(table.updatedAt)],
        limit: input.limit,
        offset
      }),
      db.select({ value: count() }).from(chatSessions).where(eq(chatSessions.userId, input.userId))
    ]);

    return {
      items: items.map(mapSession),
      total: Number(totalRow[0]?.value ?? 0)
    };
  }

  public async findById(id: string, userId: string): Promise<ChatSessionEntity | null> {
    const session = await db.query.chatSessions.findFirst({
      where: and(eq(chatSessions.id, id), eq(chatSessions.userId, userId))
    });

    return session ? mapSession(session) : null;
  }

  public async updateTitle(id: string, userId: string, title: string): Promise<void> {
    await db
      .update(chatSessions)
      .set({
        title,
        updatedAt: new Date()
      })
      .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, userId)));
  }

  public async touch(id: string): Promise<void> {
    await db
      .update(chatSessions)
      .set({
        updatedAt: new Date()
      })
      .where(eq(chatSessions.id, id));
  }

  public async deleteById(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(chatSessions).where(and(eq(chatSessions.id, id), eq(chatSessions.userId, userId)));
    return Number(result.rowCount ?? 0) > 0;
  }

  public async addMessage(input: {
    sessionId: string;
    role: ChatMessageEntity["role"];
    content: string;
    toolCallId?: string | null;
    toolName?: string | null;
    toolCalls?: ToolCall[] | null;
    toolInput?: Record<string, unknown> | null;
    toolOutput?: Record<string, unknown> | unknown[] | null;
    tokensIn?: number | null;
    tokensOut?: number | null;
  }): Promise<ChatMessageEntity> {
    const [created] = await db
      .insert(chatMessages)
      .values({
        sessionId: input.sessionId,
        role: input.role,
        content: input.content,
        toolCallId: input.toolCallId ?? null,
        toolName: input.toolName ?? null,
        toolCalls: input.toolCalls ?? null,
        toolInput: input.toolInput ?? null,
        toolOutput: input.toolOutput ?? null,
        tokensIn: input.tokensIn ?? null,
        tokensOut: input.tokensOut ?? null
      })
      .returning();

    if (!created) {
      throw new Error("Gagal menyimpan chat message");
    }

    await this.touch(input.sessionId);
    return mapMessage(created);
  }

  public async listMessages(sessionId: string): Promise<ChatMessageEntity[]> {
    const messages = await db.query.chatMessages.findMany({
      where: eq(chatMessages.sessionId, sessionId),
      orderBy: (table, { asc }) => [asc(table.createdAt)]
    });

    return messages.map(mapMessage);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
