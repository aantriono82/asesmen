import { describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const listMock = vi.fn();
const detailMock = vi.fn();
const runMock = vi.fn();
const runsMock = vi.fn();
const runDetailMock = vi.fn();

vi.mock("../src/application/workflows/workflow-planner.use-case", () => ({
  WorkflowPlannerUseCase: vi.fn().mockImplementation(() => ({
    create: createMock,
    list: listMock,
    detail: detailMock
  })),
  RunWorkflowUseCase: vi.fn().mockImplementation(() => ({
    execute: runMock
  })),
  ListWorkflowRunsUseCase: vi.fn().mockImplementation(() => ({
    execute: runsMock
  })),
  GetWorkflowRunUseCase: vi.fn().mockImplementation(() => ({
    execute: runDetailMock
  }))
}));

describe("workflow api", () => {
  it("creates and runs workflows", async () => {
    const userId = "550e8400-e29b-41d4-a716-446655440000";
    createMock.mockResolvedValue({
      id: "workflow-id",
      userId,
      name: "Workflow Demo",
      description: "",
      steps: [],
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    listMock.mockResolvedValue([]);
    detailMock.mockResolvedValue({
      id: "workflow-id",
      userId,
      name: "Workflow Demo",
      description: "",
      steps: [],
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    runMock.mockResolvedValue({
      id: "run-id",
      workflowId: "workflow-id",
      userId,
      input: {},
      output: null,
      status: "pending",
      currentStep: 0,
      error: null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date()
    });
    runsMock.mockResolvedValue([]);
    runDetailMock.mockResolvedValue({
      id: "run-id",
      workflowId: "workflow-id",
      userId,
      input: {},
      output: null,
      status: "pending",
      currentStep: 0,
      error: null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date()
    });

    const { workflowRoutes } = await import("../src/api/routes/workflows");
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
      delete() {
        return undefined;
      }
    };

    await workflowRoutes(fastify as never);

    const createHandler = routeMap.get("POST /workflows");
    const runHandler = routeMap.get("POST /workflows/:id/run");
    const detailHandler = routeMap.get("/workflows/:id");
    const runsHandler = routeMap.get("/workflows/:id/runs");

    const success = vi.fn();
    const status = vi.fn().mockReturnValue({ success });

    await createHandler?.(
      {
        body: {
          name: "Workflow Demo",
          description: "",
          steps: [
            {
              skill_slug: "generate-soal-pilihan-ganda",
              input_mapping: { topic: "input.topic" },
              output_key: "questions"
            }
          ]
        },
        user: { id: userId }
      },
      { success, status }
    );
    await runHandler?.({ params: { id: "550e8400-e29b-41d4-a716-446655440001" }, body: { input: {} }, user: { id: userId } }, { success, status });
    await detailHandler?.({ params: { id: "550e8400-e29b-41d4-a716-446655440001" }, user: { id: userId } }, { success, status });
    await runsHandler?.({ params: { id: "550e8400-e29b-41d4-a716-446655440001" }, user: { id: userId } }, { success, status });

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(runMock).toHaveBeenCalledWith({
      workflowId: "550e8400-e29b-41d4-a716-446655440001",
      userId,
      input: {}
    });
    expect(detailMock).toHaveBeenCalledTimes(1);
    expect(runsMock).toHaveBeenCalledWith({
      workflowId: "550e8400-e29b-41d4-a716-446655440001",
      userId
    });
  });
});
