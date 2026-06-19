import { setTimeout as delay } from "node:timers/promises";

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  toolCallId?: string;
  toolName?: string;
  toolCalls?: ToolCall[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface CompletionUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface CompletionResult {
  text: string;
  finishReason: "stop" | "length" | "tool_use" | "error";
  usage: CompletionUsage;
  toolCalls: ToolCall[];
}

export interface CompletionOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  tools?: ToolDefinition[];
}

export interface AIProvider {
  name: string;
  model: string;
  complete(messages: ChatMessage[], options?: CompletionOptions): Promise<CompletionResult>;
  stream(messages: ChatMessage[], options?: CompletionOptions): AsyncGenerator<string>;
  countTokens(text: string): Promise<number>;
  isAvailable(): Promise<boolean>;
}

interface JsonResponse {
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
}

export abstract class BaseAIProvider implements AIProvider {
  public abstract readonly name: string;
  public abstract readonly model: string;

  public abstract complete(messages: ChatMessage[], options?: CompletionOptions): Promise<CompletionResult>;

  public async *stream(messages: ChatMessage[], options?: CompletionOptions): AsyncGenerator<string> {
    const completion = await this.complete(messages, options);
    const content = completion.text;

    if (content.length === 0) {
      return;
    }

    for (let index = 0; index < content.length; index += 48) {
      yield content.slice(index, index + 48);
    }
  }

  public async countTokens(text: string): Promise<number> {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return 0;
    }

    return Math.ceil(trimmed.length / 4);
  }

  public async isAvailable(): Promise<boolean> {
    return this.hasRequiredConfig();
  }

  protected abstract hasRequiredConfig(): boolean;

  protected async postJson(
    url: string,
    init: {
      body: Record<string, unknown>;
      headers: Record<string, string>;
      timeoutMs?: number;
      retries?: number;
    }
  ): Promise<JsonResponse> {
    const timeoutMs = init.timeoutMs ?? 30_000;
    const retries = init.retries ?? 2;
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...init.headers
          },
          body: JSON.stringify(init.body),
          signal: controller.signal
        });
        const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        clearTimeout(timer);

        if (!response.ok) {
          if (attempt < retries && response.status >= 500) {
            await delay(250 * 2 ** attempt);
            continue;
          }

          return { ok: false, status: response.status, body };
        }

        return { ok: true, status: response.status, body };
      } catch (error: unknown) {
        clearTimeout(timer);
        lastError = error;

        if (attempt >= retries) {
          break;
        }

        await delay(250 * 2 ** attempt);
      }
    }

    throw lastError instanceof Error ? lastError : new Error("AI provider request failed");
  }
}
