import { beforeEach, describe, expect, it, vi } from "vitest";

const chatCreateMock = vi.fn();
const modelsListMock = vi.fn();
const openAiCtorMock = vi.fn();

vi.mock("../src/lib/env", () => ({
  env: {
    DEEPSEEK_API_KEY: "sk-test",
    DEEPSEEK_MODEL: "deepseek-chat"
  }
}));

vi.mock("openai", async () => {
  class MockOpenAI {
    public readonly chat = {
      completions: {
        create: chatCreateMock
      }
    };

    public readonly models = {
      list: modelsListMock
    };

    public constructor(options: Record<string, unknown>) {
      openAiCtorMock(options);
    }
  }

  class MockAPIError extends Error {
    public readonly status = 401;
  }

  return {
    default: MockOpenAI,
    APIError: MockAPIError
  };
});

describe("deepseek provider", () => {
  beforeEach(() => {
    chatCreateMock.mockReset();
    modelsListMock.mockReset();
    openAiCtorMock.mockReset();
  });

  it("uses the OpenAI SDK with DeepSeek baseURL and model override", async () => {
    chatCreateMock.mockResolvedValue({
      choices: [
        {
          finish_reason: "stop",
          message: {
            content: "halo",
            tool_calls: []
          }
        }
      ],
      usage: {
        prompt_tokens: 12,
        completion_tokens: 7
      }
    });

    const { DeepSeekProvider } = await import("../src/infrastructure/ai/providers/deepseek.provider");
    const provider = new DeepSeekProvider();

    const result = await provider.complete(
      [{ role: "user", content: "hai" }],
      { model: "deepseek-reasoner", maxTokens: 256 }
    );

    expect(openAiCtorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "sk-test",
        baseURL: "https://api.deepseek.com",
        timeout: 30000,
        maxRetries: 2
      })
    );
    expect(chatCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "deepseek-reasoner",
        max_tokens: 256,
        messages: [{ role: "user", content: "hai" }]
      })
    );
    expect(result).toEqual({
      text: "halo",
      finishReason: "stop",
      usage: {
        inputTokens: 12,
        outputTokens: 7
      },
      toolCalls: []
    });
  });

  it("pings DeepSeek availability and estimates tokens", async () => {
    modelsListMock.mockResolvedValue({});

    const { DeepSeekProvider } = await import("../src/infrastructure/ai/providers/deepseek.provider");
    const provider = new DeepSeekProvider();

    expect(await provider.isAvailable()).toBe(true);
    expect(await provider.countTokens("abcd")).toBe(1);
    expect(await provider.countTokens(" ".repeat(3))).toBe(0);
  });
});
