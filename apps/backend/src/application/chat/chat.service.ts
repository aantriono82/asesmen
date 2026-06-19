import type { ChatMessageEntity, ChatSessionEntity } from "@domain/entities/chat";
import { ContextManager } from "./context-manager";
import { ToolRouter } from "./tool-router";
import { AIProviderRegistry } from "@infra/ai/ai-provider.registry";
import { ContextBuilder } from "@infra/documents/context-builder";
import { RetrievalService } from "@infra/documents/retrieval.service";
import type { ChatMessage as ProviderChatMessage, CompletionResult } from "@infra/ai/providers/base.provider";
import { DrizzleChatSessionRepository } from "@infra/repositories/drizzle-chat-session-repository";
import { DrizzleTokenUsageRepository } from "@infra/repositories/drizzle-token-usage-repository";
import type { AIProviderName } from "@infra/ai/ai-provider.factory";
import { AppError } from "@lib/errors";

export type ChatStreamEvent =
  | { type: "text"; delta: string }
  | { type: "retrieval"; chunks_found: number }
  | { type: "tool_use"; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; output: Record<string, unknown> | unknown[] }
  | { type: "done"; tokens: { in: number; out: number } }
  | { type: "error"; message: string };

export class ChatService {
  public constructor(
    private readonly sessions = new DrizzleChatSessionRepository(),
    private readonly providers = new AIProviderRegistry(),
    private readonly tools = new ToolRouter(),
    private readonly contextManager = new ContextManager(),
    private readonly usage = new DrizzleTokenUsageRepository(),
    private readonly retrieval = new RetrievalService(),
    private readonly contextBuilder = new ContextBuilder()
  ) {}

  public async createSession(input: {
    userId: string;
    title?: string;
    systemPrompt?: string;
    knowledgeBaseId?: string | null;
  }): Promise<ChatSessionEntity> {
    const provider = await this.providers.getActiveProvider();

    return this.sessions.create({
        userId: input.userId,
        title: input.title?.trim() || "Sesi Baru",
        provider: provider.name as AIProviderName,
        model: provider.model,
      systemPrompt: input.systemPrompt ?? "",
      knowledgeBaseId: input.knowledgeBaseId ?? null
    });
  }

  public async listSessions(userId: string, page: number, limit: number) {
    const result = await this.sessions.listByUser({ userId, page, limit });
    return {
      ...result,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(result.total / limit))
    };
  }

  public async getSession(sessionId: string, userId: string): Promise<{ session: ChatSessionEntity; messages: ChatMessageEntity[] }> {
    const session = await this.sessions.findById(sessionId, userId);
    if (!session) {
      throw new AppError("Chat session tidak ditemukan", "CHAT_SESSION_NOT_FOUND", 404);
    }

    const messages = await this.sessions.listMessages(sessionId);
    return { session, messages };
  }

  public async deleteSession(sessionId: string, userId: string): Promise<void> {
    const deleted = await this.sessions.deleteById(sessionId, userId);
    if (!deleted) {
      throw new AppError("Chat session tidak ditemukan", "CHAT_SESSION_NOT_FOUND", 404);
    }
  }

  public async *sendMessage(input: {
    sessionId: string;
    userId: string;
    content: string;
  }): AsyncGenerator<ChatStreamEvent> {
    const session = await this.sessions.findById(input.sessionId, input.userId);
    if (!session) {
      yield { type: "error", message: "Chat session tidak ditemukan" };
      return;
    }

    try {
      await this.sessions.addMessage({
        sessionId: session.id,
        role: "user",
        content: input.content
      });

      if (session.title === "Sesi Baru") {
        await this.sessions.updateTitle(session.id, session.userId, deriveTitle(input.content));
      }

      const provider = await this.providers.getActiveProvider();
      const toolDefinitions = await this.tools.getToolDefinitions();
      let ragSystemPrompt = session.systemPrompt;

      if (session.knowledgeBaseId) {
        const retrieved = await this.retrieval.search(input.content, {
          knowledge_base_id: session.knowledgeBaseId,
          top_k: 6,
          threshold: 0.6
        });
        yield { type: "retrieval", chunks_found: retrieved.length };
        if (retrieved.length > 0) {
          const ragContext = this.contextBuilder.build(
            retrieved.map((chunk) => ({
              documentTitle: chunk.documentTitle,
              content: chunk.content,
              pageNumber: chunk.pageNumber,
              score: chunk.score,
              tokenCount: chunk.tokenCount
            })),
            { format: "markdown", maxTokens: 3_500 }
          );
          ragSystemPrompt = [
            session.systemPrompt.trim(),
            "Gunakan konteks knowledge base berikut saat relevan. Jika konteks tidak cukup, katakan dengan jelas.",
            ragContext
          ]
            .filter((item) => item.trim().length > 0)
            .join("\n\n");
        }
      }

      let providerMessages = await this.buildProviderMessages(session, ragSystemPrompt);

      const primaryCompletion = await this.runCompletion(session, providerMessages, provider, ragSystemPrompt, toolDefinitions);
      let totalInputTokens = primaryCompletion.usage.inputTokens;
      let totalOutputTokens = primaryCompletion.usage.outputTokens;
      let finalCompletion = primaryCompletion;

      if (primaryCompletion.toolCalls.length > 0) {
        await this.sessions.addMessage({
          sessionId: session.id,
          role: "assistant",
          content: "",
          toolCalls: primaryCompletion.toolCalls
        });

        for (const toolCall of primaryCompletion.toolCalls) {
          yield {
            type: "tool_use",
            name: toolCall.name,
            input: toolCall.input
          };

          const toolResult = await this.tools.executeTool(provider, toolCall.name, toolCall.input);
          await this.sessions.addMessage({
            sessionId: session.id,
            role: "tool",
            content: JSON.stringify(toolResult.output),
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            toolInput: toolCall.input,
            toolOutput: toolResult.output
          });

          yield {
            type: "tool_result",
            output: toolResult.output
          };
        }

        providerMessages = await this.buildProviderMessages(session, ragSystemPrompt);
        finalCompletion = await this.runCompletion(session, providerMessages, provider, ragSystemPrompt, toolDefinitions);
        totalInputTokens += finalCompletion.usage.inputTokens;
        totalOutputTokens += finalCompletion.usage.outputTokens;
      }

      const chunks = splitText(finalCompletion.text);
      let fullText = "";

      for (const chunk of chunks) {
        fullText += chunk;
        yield { type: "text", delta: chunk };
      }

      await this.sessions.addMessage({
        sessionId: session.id,
        role: "assistant",
        content: fullText,
        tokensIn: totalInputTokens,
        tokensOut: totalOutputTokens
      });

      await this.usage.create({
        userId: session.userId,
        sessionId: session.id,
        provider: provider.name as AIProviderName,
        model: provider.model,
        tokensIn: totalInputTokens,
        tokensOut: totalOutputTokens,
        costUsd: estimateCostUsd(provider.name, provider.model, totalInputTokens, totalOutputTokens)
      });

      yield {
        type: "done",
        tokens: {
          in: totalInputTokens,
          out: totalOutputTokens
        }
      };
    } catch (error: unknown) {
      yield {
        type: "error",
        message: error instanceof Error ? error.message : "Gagal memproses chat"
      };
    }
  }

  private async buildProviderMessages(session: ChatSessionEntity, systemPromptOverride?: string): Promise<ProviderChatMessage[]> {
    const history = await this.sessions.listMessages(session.id);
    const messages: ProviderChatMessage[] = [];

    const systemPrompt = systemPromptOverride ?? session.systemPrompt;
    if (systemPrompt.trim().length > 0) {
      messages.push({
        role: "system",
        content: systemPrompt
      });
    }

    for (const message of history) {
      messages.push({
        role: message.role,
        content: message.content,
        ...(message.toolCallId ? { toolCallId: message.toolCallId } : {}),
        ...(message.toolName ? { toolName: message.toolName } : {}),
        ...(message.toolCalls ? { toolCalls: message.toolCalls } : {})
      });
    }

    return messages;
  }

  private async runCompletion(
    session: ChatSessionEntity,
    messages: ProviderChatMessage[],
    provider: Awaited<ReturnType<AIProviderRegistry["getActiveProvider"]>>,
    systemPrompt: string,
    tools: Awaited<ReturnType<ToolRouter["getToolDefinitions"]>>
  ): Promise<CompletionResult> {
    const truncated = await this.contextManager.truncate(provider.model, messages, (text) => provider.countTokens(text));

    return provider.complete(truncated.messages.filter((message) => message.role !== "system"), {
      systemPrompt,
      tools,
      maxTokens: Math.min(2_048, Math.floor(truncated.maxTokens * 0.2))
    });
  }
}

function splitText(text: string): string[] {
  if (text.trim().length === 0) {
    return [];
  }

  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += 32) {
    chunks.push(text.slice(index, index + 32));
  }

  return chunks;
}

function deriveTitle(content: string): string {
  const normalized = content.trim().replace(/\s+/g, " ");
  return normalized.length > 60 ? `${normalized.slice(0, 57)}...` : normalized || "Sesi Baru";
}

function estimateCostUsd(provider: string, model: string, tokensIn: number, tokensOut: number): number {
  const pricingTable: Record<string, { in: number; out: number }> = {
    "openai:gpt-4o": { in: 0.000005, out: 0.000015 },
    "anthropic:claude-sonnet-4-6": { in: 0.000003, out: 0.000015 },
    "google:gemini-1.5-pro": { in: 0.0000035, out: 0.0000105 },
    "deepseek:deepseek-chat": { in: 0.00000027, out: 0.0000011 },
    "deepseek:deepseek-reasoner": { in: 0.00000055, out: 0.00000219 }
  };

  const pricing = pricingTable[`${provider}:${model}`] ?? { in: 0.000003, out: 0.000009 };
  return Number((tokensIn * pricing.in + tokensOut * pricing.out).toFixed(6));
}
