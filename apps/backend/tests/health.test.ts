import { describe, expect, it, vi } from "vitest";

vi.mock("@infra/database/client", () => ({
  databaseHealthCheck: vi.fn().mockResolvedValue("ok")
}));

vi.mock("@infra/queue/queue", () => ({
  queueHealthCheck: vi.fn().mockResolvedValue("ok")
}));

describe("health route", () => {
  it("returns ok payload shape", async () => {
    const { healthRoutes } = await import("../src/api/routes/health");

    const routeMap = new Map<string, (request: unknown, reply: { success: (...args: unknown[]) => unknown }) => Promise<unknown>>();
    const fastify = {
      get(path: string, handler: (request: unknown, reply: { success: (...args: unknown[]) => unknown }) => Promise<unknown>) {
        routeMap.set(path, handler);
      }
    };

    await healthRoutes(fastify as never);
    const handler = routeMap.get("/health");

    const success = vi.fn();
    await handler?.({}, { success });

    expect(success).toHaveBeenCalledTimes(1);
    expect(success.mock.calls[0]?.[0]).toMatchObject({
      status: "ok",
      services: {
        database: "ok",
        queue: "ok"
      }
    });
  });
});
