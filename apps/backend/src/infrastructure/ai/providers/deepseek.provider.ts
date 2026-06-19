import OpenAI, { APIError } from "openai";
import { env } from "@lib/env";
import {
  BaseAIProvider,
  type ChatMessage,
  type CompletionOptions,
  type CompletionResult,
  type ToolCall
} from "./base.provider";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const REQUEST_TIMEOUT_MS = 30_000;
const REQUEST_MAX_RETRIES = 2;

export class DeepSeekProvider extends BaseAIProvider {
  public readonly name = "deepseek";
  public readonly model = env.DEEPSEEK_MODEL;

  protected hasRequiredConfig(): boolean {
    return typeof env.DEEPSEEK_API_KEY === "string" && env.DEEPSEEK_API_KEY.trim().length > 0;
  }

  public async complete(messages: ChatMessage[], options: CompletionOptions = {}): Promise<CompletionResult> {
    const client = this.createClient();
    const model = options.model ?? this.model;

    try {
      const response = await client.chat.completions.create({
        model,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 1_024,
        messages: this.buildMessages(messages, options.systemPrompt) as never,
        ...(options.tools && options.tools.length > 0
          ? {
              tools: options.tools.map((tool) => ({
                type: "function" as const,
                function: {
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.inputSchema
                }
              }))
            }
          : {})
      });

      return this.mapCompletionResponse(response);
    } catch (error: unknown) {
      throw new Error(formatDeepSeekError(error), { cause: error });
    }
  }

  public async *stream(messages: ChatMessage[], options: CompletionOptions = {}): AsyncGenerator<string> {
    const client = this.createClient();
    const model = options.model ?? this.model;

    try {
      const stream = await client.chat.completions.create({
        model,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 1_024,
        stream: true,
        messages: this.buildMessages(messages, options.systemPrompt) as never,
        ...(options.tools && options.tools.length > 0
          ? {
              tools: options.tools.map((tool) => ({
                type: "function" as const,
                function: {
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.inputSchema
                }
              }))
            }
          : {})
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (typeof delta === "string" && delta.length > 0) {
          yield delta;
        }
      }
    } catch (error: unknown) {
      throw new Error(formatDeepSeekError(error), { cause: error });
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
    if (!this.hasRequiredConfig()) {
      return false;
    }

    try {
      const client = this.createClient();
      await client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  private createClient(): OpenAI {
    if (!this.hasRequiredConfig()) {
      throw new Error("DEEPSEEK_API_KEY tidak tersedia");
    }

    return new OpenAI({
      apiKey: env.DEEPSEEK_API_KEY,
      baseURL: DEEPSEEK_BASE_URL,
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: REQUEST_MAX_RETRIES
    });
  }

  private buildMessages(messages: ChatMessage[], systemPrompt?: string): Array<Record<string, unknown>> {
    const built: Array<Record<string, unknown>> = [];

    if (systemPrompt && systemPrompt.trim().length > 0) {
      built.push({ role: "system", content: systemPrompt });
    }

    for (const message of messages) {
      if (message.role === "assistant" && message.toolCalls && message.toolCalls.length > 0) {
        built.push({
          role: "assistant",
          content: message.content,
          tool_calls: message.toolCalls.map((toolCall) => ({
            id: toolCall.id,
            type: "function",
            function: {
              name: toolCall.name,
              arguments: JSON.stringify(toolCall.input)
            }
          }))
        });
        continue;
      }

      if (message.role === "tool") {
        built.push({
          role: "tool",
          content: message.content,
          tool_call_id: message.toolCallId ?? message.toolName ?? "tool",
          ...(message.toolName ? { name: message.toolName } : {})
        });
        continue;
      }

      built.push({
        role: message.role,
        content: message.content
      });
    }

    return built;
  }

  private mapCompletionResponse(response: unknown): CompletionResult {
    const responseBody = isRecord(response) ? response : {};
    const choice = Array.isArray(responseBody.choices) ? responseBody.choices[0] : undefined;
    const message = isRecord(choice?.message) ? choice.message : {};
    const text = typeof message.content === "string" ? message.content : "";
    const toolCalls = normalizeToolCalls(message.tool_calls);
    const usage = isRecord(responseBody.usage) ? responseBody.usage : {};
    const finishReason = typeof choice?.finish_reason === "string" ? choice.finish_reason : "stop";

    return {
      text,
      finishReason: finishReason === "tool_calls" ? "tool_use" : finishReason === "length" ? "length" : "stop",
      usage: {
        inputTokens: readNumber(usage.prompt_tokens),
        outputTokens: readNumber(usage.completion_tokens)
      },
      toolCalls
    };
  }
}

function normalizeToolCalls(value: unknown): ToolCall[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      if (!isRecord(item) || !isRecord(item.function) || typeof item.function.name !== "string") {
        return null;
      }

      return {
        id: typeof item.id === "string" ? item.id : `tool-${index + 1}`,
        name: item.function.name,
        input: parseArguments(item.function.arguments)
      } satisfies ToolCall;
    })
    .filter((item): item is ToolCall => item !== null);
}

function parseArguments(value: unknown): Record<string, unknown> {
  if (typeof value !== "string" || value.trim().length === 0) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function formatDeepSeekError(error: unknown): string {
  if (error instanceof APIError) {
    return `DeepSeek error ${error.status}: ${error.message}`;
  }

  if (error instanceof Error) {
    return `DeepSeek error: ${error.message}`;
  }

  return "DeepSeek error: request failed";
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
