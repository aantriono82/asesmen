import { describe, expect, it, vi } from "vitest";

const executeMock = vi.fn();
const getExecutionMock = vi.fn();
const listExecutionsMock = vi.fn();

vi.mock("../src/application/skills/skill-execution.use-case", () => ({
  ExecuteSkillUseCase: vi.fn().mockImplementation(() => ({
    execute: executeMock
  })),
  GetExecutionUseCase: vi.fn().mockImplementation(() => ({
    execute: getExecutionMock
  })),
  ListExecutionsUseCase: vi.fn().mockImplementation(() => ({
    execute: listExecutionsMock
  })),
  DeleteExecutionUseCase: vi.fn().mockImplementation(() => ({
    execute: vi.fn()
  }))
}));

describe("execution api", () => {
  it("queues an execution and returns execution status", async () => {
    const userId = "550e8400-e29b-41d4-a716-446655440000";
    executeMock.mockResolvedValue({
      executionId: "execution-id",
      status: "pending"
    });
    getExecutionMock.mockResolvedValue({
      id: "execution-id",
      userId: "user-id",
      skillId: "skill-id",
      skillSlug: "generate-soal-pilihan-ganda",
      input: { topic: "Fotosintesis" },
      output: null,
      status: "pending",
      durationMs: null,
      error: null,
      createdAt: new Date()
    });
    listExecutionsMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1
    });

    const { skillRoutes } = await import("../src/api/routes/skills");
    const routeMap = new Map<string, (request: unknown, reply: { success: (...args: unknown[]) => unknown; status: (code: number) => { success: (...args: unknown[]) => unknown } }) => Promise<unknown>>();

    const fastify = {
      get(
        path: string,
        optionsOrHandler:
          | ((request: unknown, reply: { success: (...args: unknown[]) => unknown; status: (code: number) => { success: (...args: unknown[]) => unknown } }) => Promise<unknown>)
          | Record<string, unknown>,
        handler?: (request: unknown, reply: { success: (...args: unknown[]) => unknown; status: (code: number) => { success: (...args: unknown[]) => unknown } }) => Promise<unknown>
      ) {
        routeMap.set(path, (typeof handler === "function" ? handler : optionsOrHandler) as never);
      },
      post(
        path: string,
        optionsOrHandler:
          | ((request: unknown, reply: { success: (...args: unknown[]) => unknown; status: (code: number) => { success: (...args: unknown[]) => unknown } }) => Promise<unknown>)
          | Record<string, unknown>,
        handler?: (request: unknown, reply: { success: (...args: unknown[]) => unknown; status: (code: number) => { success: (...args: unknown[]) => unknown } }) => Promise<unknown>
      ) {
        routeMap.set(`POST ${path}`, (typeof handler === "function" ? handler : optionsOrHandler) as never);
      },
      delete(
        path: string,
        optionsOrHandler:
          | ((request: unknown, reply: { success: (...args: unknown[]) => unknown; status: (code: number) => { success: (...args: unknown[]) => unknown } }) => Promise<unknown>)
          | Record<string, unknown>,
        handler?: (request: unknown, reply: { success: (...args: unknown[]) => unknown; status: (code: number) => { success: (...args: unknown[]) => unknown } }) => Promise<unknown>
      ) {
        routeMap.set(`DELETE ${path}`, (typeof handler === "function" ? handler : optionsOrHandler) as never);
      }
    };

    await skillRoutes(fastify as never);

    const executeHandler = routeMap.get("POST /skills/:slug/execute");
    const detailHandler = routeMap.get("/executions/:id");
    const listHandler = routeMap.get("/executions");

    const success = vi.fn();
    const status = vi.fn().mockReturnValue({ success });

    await executeHandler?.(
      { params: { slug: "generate-soal-pilihan-ganda" }, body: { input: { topic: "Fotosintesis" } }, user: { id: userId } },
      { success, status }
    );
    await detailHandler?.({ params: { id: "550e8400-e29b-41d4-a716-446655440001" }, user: { id: userId } }, { success, status });
    await listHandler?.({ query: {}, user: { id: userId } }, { success, status });

    expect(executeMock).toHaveBeenCalledWith({
      userId,
      slug: "generate-soal-pilihan-ganda",
      input: { topic: "Fotosintesis" }
    });
    expect(getExecutionMock).toHaveBeenCalledWith({
      executionId: "550e8400-e29b-41d4-a716-446655440001",
      userId
    });
    expect(listExecutionsMock).toHaveBeenCalledTimes(1);
  });
});
