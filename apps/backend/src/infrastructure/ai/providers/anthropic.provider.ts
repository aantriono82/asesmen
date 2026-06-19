import { env } from "@lib/env";
import {
  BaseAIProvider,
  type ChatMessage,
  type CompletionOptions,
  type CompletionResult,
  type ToolCall
} from "./base.provider";

export class AnthropicProvider extends BaseAIProvider {
  public readonly name = "anthropic";
  public readonly model = env.ANTHROPIC_MODEL;

  protected hasRequiredConfig(): boolean {
    return typeof env.ANTHROPIC_API_KEY === "string" && env.ANTHROPIC_API_KEY.length > 0;
  }

  public async complete(messages: ChatMessage[], options: CompletionOptions = {}): Promise<CompletionResult> {
    if (!this.hasRequiredConfig()) {
      throw new Error("ANTHROPIC_API_KEY tidak tersedia");
    }

    const model = options.model ?? this.model;
    const response = await this.postJson("https://api.anthropic.com/v1/messages", {
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01"
      },
      body: {
        model,
        system: options.systemPrompt ?? "",
        max_tokens: options.maxTokens ?? 1_024,
        temperature: options.temperature ?? 0.2,
        messages: messages.map((message) => ({
          role: message.role === "assistant" ? "assistant" : "user",
          content:
            message.role === "tool"
              ? [
                  {
                    type: "tool_result",
                    tool_use_id: message.toolCallId ?? message.toolName ?? "tool",
                    content: message.content
                  }
                ]
              : [
                  {
                    type: "text",
                    text: message.content
                  }
                ]
        })),
        ...(options.tools && options.tools.length > 0
          ? {
              tools: options.tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                input_schema: tool.inputSchema
              }))
            }
          : {})
      }
    });

    if (!response.ok) {
      throw new Error(readProviderError(response.body, response.status));
    }

    const content = Array.isArray(response.body.content) ? response.body.content : [];
    const textParts: string[] = [];
    const toolCalls: ToolCall[] = [];

    for (const block of content) {
      if (!isRecord(block)) {
        continue;
      }

      if (block.type === "text" && typeof block.text === "string") {
        textParts.push(block.text);
      }

      if (block.type === "tool_use" && typeof block.name === "string") {
        toolCalls.push({
          id: typeof block.id === "string" ? block.id : block.name,
          name: block.name,
          input: isRecord(block.input) ? block.input : {}
        });
      }
    }

    const usage = isRecord(response.body.usage) ? response.body.usage : {};
    const stopReason = typeof response.body.stop_reason === "string" ? response.body.stop_reason : "end_turn";

    return {
      text: textParts.join("\n").trim(),
      finishReason: stopReason === "tool_use" ? "tool_use" : stopReason === "max_tokens" ? "length" : "stop",
      usage: {
        inputTokens: readNumber(usage.input_tokens),
        outputTokens: readNumber(usage.output_tokens)
      },
      toolCalls
    };
  }
}

function readProviderError(body: Record<string, unknown>, status: number): string {
  if (isRecord(body.error) && typeof body.error.message === "string") {
    return `Anthropic error ${status}: ${body.error.message}`;
  }

  return `Anthropic error ${status}`;
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
