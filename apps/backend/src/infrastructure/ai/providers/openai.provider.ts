import { env } from "@lib/env";
import {
  BaseAIProvider,
  type ChatMessage,
  type CompletionOptions,
  type CompletionResult,
  type ToolCall
} from "./base.provider";

export class OpenAIProvider extends BaseAIProvider {
  public readonly name = "openai";
  public readonly model = env.OPENAI_MODEL;

  protected hasRequiredConfig(): boolean {
    return typeof env.OPENAI_API_KEY === "string" && env.OPENAI_API_KEY.length > 0;
  }

  public async complete(messages: ChatMessage[], options: CompletionOptions = {}): Promise<CompletionResult> {
    if (!this.hasRequiredConfig()) {
      throw new Error("OPENAI_API_KEY tidak tersedia");
    }

    const model = options.model ?? this.model;
    const response = await this.postJson("https://api.openai.com/v1/chat/completions", {
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`
      },
      body: {
        model,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 1_024,
        messages: [
          ...(options.systemPrompt ? [{ role: "system", content: options.systemPrompt }] : []),
          ...messages.map((message) => ({
            role: message.role === "tool" ? "tool" : message.role,
            content: message.content,
            ...(message.toolCalls && message.toolCalls.length > 0
              ? {
                  tool_calls: message.toolCalls.map((toolCall) => ({
                    id: toolCall.id,
                    type: "function",
                    function: {
                      name: toolCall.name,
                      arguments: JSON.stringify(toolCall.input)
                    }
                  }))
                }
              : {}),
            ...(message.toolCallId ? { tool_call_id: message.toolCallId } : {}),
            ...(message.toolName ? { name: message.toolName } : {})
          }))
        ],
        ...(options.tools && options.tools.length > 0
          ? {
              tools: options.tools.map((tool) => ({
                type: "function",
                function: {
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.inputSchema
                }
              }))
            }
          : {})
      }
    });

    if (!response.ok) {
      throw new Error(readProviderError(response.body, response.status));
    }

    const choice = Array.isArray(response.body.choices) ? response.body.choices[0] : undefined;
    const message = isRecord(choice) && isRecord(choice.message) ? choice.message : {};
    const text = typeof message.content === "string" ? message.content : "";
    const toolCalls = normalizeOpenAIToolCalls(message.tool_calls);
    const finishReason = typeof choice?.finish_reason === "string" ? choice.finish_reason : "stop";
    const usage = isRecord(response.body.usage) ? response.body.usage : {};

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

function normalizeOpenAIToolCalls(value: unknown): ToolCall[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      if (!isRecord(item) || !isRecord(item.function) || typeof item.function.name !== "string") {
        return null;
      }

      const input = tryParseJson(item.function.arguments);
      return {
        id: typeof item.id === "string" ? item.id : `tool-${index + 1}`,
        name: item.function.name,
        input
      } satisfies ToolCall;
    })
    .filter((item): item is ToolCall => item !== null);
}

function tryParseJson(value: unknown): Record<string, unknown> {
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

function readProviderError(body: Record<string, unknown>, status: number): string {
  if (isRecord(body.error) && typeof body.error.message === "string") {
    return `OpenAI error ${status}: ${body.error.message}`;
  }

  return `OpenAI error ${status}`;
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
