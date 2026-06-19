import { env } from "@lib/env";
import {
  BaseAIProvider,
  type ChatMessage,
  type CompletionOptions,
  type CompletionResult,
  type ToolCall
} from "./base.provider";

export class GoogleProvider extends BaseAIProvider {
  public readonly name = "google";
  public readonly model = env.GOOGLE_MODEL;

  protected hasRequiredConfig(): boolean {
    return typeof env.GOOGLE_API_KEY === "string" && env.GOOGLE_API_KEY.length > 0;
  }

  public async complete(messages: ChatMessage[], options: CompletionOptions = {}): Promise<CompletionResult> {
    if (!this.hasRequiredConfig()) {
      throw new Error("GOOGLE_API_KEY tidak tersedia");
    }

    const model = options.model ?? this.model;
    const response = await this.postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GOOGLE_API_KEY ?? "")}`,
      {
        headers: {},
        body: {
          contents: [
            ...(options.systemPrompt
              ? [
                  {
                    role: "user",
                    parts: [{ text: `System instruction:\n${options.systemPrompt}` }]
                  }
                ]
              : []),
            ...messages.map((message) => ({
              role: message.role === "assistant" ? "model" : "user",
              parts:
                message.toolCalls && message.toolCalls.length > 0
                  ? message.toolCalls.map((toolCall) => ({
                      functionCall: {
                        name: toolCall.name,
                        args: toolCall.input
                      }
                    }))
                  : [{ text: message.content }]
            }))
          ],
          ...(options.tools && options.tools.length > 0
            ? {
                tools: [
                  {
                    functionDeclarations: options.tools.map((tool) => ({
                      name: tool.name,
                      description: tool.description,
                      parameters: tool.inputSchema
                    }))
                  }
                ]
              }
            : {}),
          generationConfig: {
            temperature: options.temperature ?? 0.2,
            maxOutputTokens: options.maxTokens ?? 1_024
          }
        }
      }
    );

    if (!response.ok) {
      throw new Error(readProviderError(response.body, response.status));
    }

    const candidate = Array.isArray(response.body.candidates) ? response.body.candidates[0] : undefined;
    const content = isRecord(candidate) && isRecord(candidate.content) ? candidate.content : {};
    const parts = Array.isArray(content.parts) ? content.parts : [];
    const texts: string[] = [];
    const toolCalls: ToolCall[] = [];

    for (const part of parts) {
      if (!isRecord(part)) {
        continue;
      }

      if (typeof part.text === "string") {
        texts.push(part.text);
      }

      if (isRecord(part.functionCall) && typeof part.functionCall.name === "string") {
        toolCalls.push({
          id: part.functionCall.name,
          name: part.functionCall.name,
          input: isRecord(part.functionCall.args) ? part.functionCall.args : {}
        });
      }
    }

    const metadata = isRecord(response.body.usageMetadata) ? response.body.usageMetadata : {};
    const finishReason = isRecord(candidate) && typeof candidate.finishReason === "string" ? candidate.finishReason : "STOP";

    return {
      text: texts.join("\n").trim(),
      finishReason: finishReason === "MAX_TOKENS" ? "length" : toolCalls.length > 0 ? "tool_use" : "stop",
      usage: {
        inputTokens: readNumber(metadata.promptTokenCount),
        outputTokens: readNumber(metadata.candidatesTokenCount)
      },
      toolCalls
    };
  }
}

function readProviderError(body: Record<string, unknown>, status: number): string {
  if (isRecord(body.error) && typeof body.error.message === "string") {
    return `Google error ${status}: ${body.error.message}`;
  }

  return `Google error ${status}`;
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
