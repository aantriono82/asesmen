import { describe, expect, it, vi } from "vitest";

const listMock = vi.fn();
const getActiveProviderMock = vi.fn();
const setActiveProviderMock = vi.fn();

vi.mock("../src/infrastructure/ai/ai-provider.registry", () => ({
  AIProviderRegistry: vi.fn().mockImplementation(() => ({
    list: listMock,
    getActiveProvider: getActiveProviderMock,
    setActiveProvider: setActiveProviderMock
  }))
}));

describe("ai routes", () => {
  it("lists providers and switches active provider to deepseek", async () => {
    listMock.mockResolvedValue([
      { name: "openai", model: "gpt-4o", available: false },
      { name: "anthropic", model: "claude-sonnet-4-6", available: false },
      { name: "google", model: "gemini-1.5-pro", available: false },
      { name: "deepseek", model: "deepseek-chat", available: true }
    ]);
    getActiveProviderMock.mockResolvedValue({
      name: "deepseek",
      model: "deepseek-chat",
      isAvailable: vi.fn().mockResolvedValue(true)
    });
    setActiveProviderMock.mockResolvedValue({
      name: "deepseek",
      model: "deepseek-chat",
      available: true
    });

    const { aiRoutes } = await import("../src/api/routes/ai");
    type RouteHandler = (request: Record<string, unknown>, reply: Record<string, unknown>) => unknown;
    const routeMap = new Map<string, RouteHandler>();

    const fastify = {
      get(path: string, optionsOrHandler: unknown, handler?: unknown) {
        routeMap.set(path, (typeof handler === "function" ? handler : optionsOrHandler) as RouteHandler);
      },
      put(path: string, optionsOrHandler: unknown, handler?: unknown) {
        routeMap.set(`PUT ${path}`, (typeof handler === "function" ? handler : optionsOrHandler) as RouteHandler);
      }
    };

    await aiRoutes(fastify as never);

    const listHandler = routeMap.get("/ai/providers");
    const activeHandler = routeMap.get("/ai/providers/active");
    const switchHandler = routeMap.get("PUT /ai/providers/active");

    const success = vi.fn();

    await listHandler?.({}, { success });
    await activeHandler?.({}, { success });
    await switchHandler?.({ body: { provider: "deepseek" } }, { success });

    expect(listMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(setActiveProviderMock).toHaveBeenCalledWith("deepseek");
  });
});
