import type { ChatMessage } from "@infra/ai/providers/base.provider";

const MODEL_LIMITS: Record<string, number> = {
  "gpt-4o": 128_000,
  "claude-sonnet-4-6": 200_000,
  "gemini-1.5-pro": 128_000
};

export class ContextManager {
  public constructor(private readonly modelLimits = MODEL_LIMITS) {}

  public async countMessagesTokens(
    messages: ChatMessage[],
    countTokens: (text: string) => Promise<number>
  ): Promise<number> {
    let total = 0;

    for (const message of messages) {
      total += await countTokens(message.content);
      total += 8;
    }

    return total;
  }

  public async truncate(
    model: string,
    messages: ChatMessage[],
    countTokens: (text: string) => Promise<number>,
    reservedOutputTokens = 2_048
  ): Promise<{ messages: ChatMessage[]; totalTokens: number; maxTokens: number }> {
    const maxTokens = this.modelLimits[model] ?? 32_000;
    const budget = Math.max(1, maxTokens - reservedOutputTokens);
    const systemMessages = messages.filter((message) => message.role === "system");
    const otherMessages = messages.filter((message) => message.role !== "system");
    const preserved: ChatMessage[] = [...systemMessages];
    let totalTokens = await this.countMessagesTokens(systemMessages, countTokens);

    const stack: ChatMessage[] = [];
    for (let index = otherMessages.length - 1; index >= 0; index -= 1) {
      const message = otherMessages[index];
      if (!message) {
        continue;
      }

      const messageTokens = (await countTokens(message.content)) + 8;
      if (totalTokens + messageTokens > budget) {
        continue;
      }

      totalTokens += messageTokens;
      stack.push(message);
    }

    preserved.push(...stack.reverse());

    return {
      messages: preserved,
      totalTokens,
      maxTokens
    };
  }
}

export const modelTokenLimits = MODEL_LIMITS;
