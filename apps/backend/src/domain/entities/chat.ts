import type { AIProviderName } from "@infra/ai/ai-provider.factory";
import type { ToolCall } from "@infra/ai/providers/base.provider";

export type ChatMessageRole = "system" | "user" | "assistant" | "tool";

export interface ChatSessionEntity {
  id: string;
  userId: string;
  title: string;
  provider: AIProviderName;
  model: string;
  systemPrompt: string;
  knowledgeBaseId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessageEntity {
  id: string;
  sessionId: string;
  role: ChatMessageRole;
  content: string;
  toolCallId: string | null;
  toolName: string | null;
  toolCalls: ToolCall[] | null;
  toolInput: Record<string, unknown> | null;
  toolOutput: Record<string, unknown> | null;
  tokensIn: number | null;
  tokensOut: number | null;
  createdAt: Date;
}

export interface TokenUsageEntity {
  id: string;
  userId: string;
  sessionId: string | null;
  provider: AIProviderName;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  createdAt: Date;
}
