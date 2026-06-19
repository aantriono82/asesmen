import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstMock = vi.fn();
const onConflictDoUpdateMock = vi.fn().mockResolvedValue(undefined);
const valuesMock = vi.fn(() => ({
  onConflictDoUpdate: onConflictDoUpdateMock
}));
const insertMock = vi.fn(() => ({
  values: valuesMock
}));

vi.mock("../src/infrastructure/database/client", () => ({
  db: {
    query: {
      aiProviderSettings: {
        findFirst: findFirstMock
      }
    },
    insert: insertMock
  }
}));

describe("ai provider", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
    insertMock.mockClear();
    valuesMock.mockClear();
    onConflictDoUpdateMock.mockClear();
  });

  it("creates provider instances from factory", async () => {
    const { AIProviderFactory } = await import("../src/infrastructure/ai/ai-provider.factory");
    const factory = new AIProviderFactory();

    expect(factory.create("openai").name).toBe("openai");
    expect(factory.create("anthropic").name).toBe("anthropic");
    expect(factory.create("google").name).toBe("google");
    expect(factory.create("deepseek").name).toBe("deepseek");
  });

  it("switches active provider in registry", async () => {
    const { AIProviderRegistry } = await import("../src/infrastructure/ai/ai-provider.registry");
    const registry = new AIProviderRegistry({
      create: vi.fn((name: "openai" | "anthropic" | "google" | "deepseek") => ({
        name,
        model: `${name}-model`,
        complete: vi.fn(),
        stream: vi.fn(),
        countTokens: vi.fn(),
        isAvailable: vi.fn().mockResolvedValue(true)
      })),
      createAll: vi.fn()
    } as never);

    const active = await registry.setActiveProvider("deepseek");

    expect(active).toEqual({
      name: "deepseek",
      model: "deepseek-model",
      available: true
    });
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(onConflictDoUpdateMock).toHaveBeenCalledTimes(1);
  });
});
