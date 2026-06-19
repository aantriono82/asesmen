import { describe, expect, it, vi } from "vitest";

const listMock = vi.fn();
const createMock = vi.fn();
const getMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const searchMock = vi.fn();

vi.mock("../src/application/question-bank/question-bank.use-case", () => ({
  ListQuestionBankUseCase: vi.fn().mockImplementation(() => ({ execute: listMock })),
  CreateQuestionBankUseCase: vi.fn().mockImplementation(() => ({ execute: createMock })),
  GetQuestionBankUseCase: vi.fn().mockImplementation(() => ({ execute: getMock })),
  UpdateQuestionBankUseCase: vi.fn().mockImplementation(() => ({ execute: updateMock })),
  DeleteQuestionBankUseCase: vi.fn().mockImplementation(() => ({ execute: deleteMock })),
  SearchQuestionBankUseCase: vi.fn().mockImplementation(() => ({ execute: searchMock }))
}));

describe("question bank api", () => {
  it("supports CRUD and search routes", async () => {
    listMock.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10, totalPages: 1 });
    createMock.mockResolvedValue({ id: "bank-id", usageCount: 0 });
    getMock.mockResolvedValue({ id: "bank-id", usageCount: 1 });
    updateMock.mockResolvedValue({ id: "bank-id", usageCount: 2 });
    deleteMock.mockResolvedValue({ deleted: true });
    searchMock.mockResolvedValue([{ id: "bank-id", usageCount: 3 }]);

    const { questionBankRoutes } = await import("../src/api/routes/question-bank");
    const routeMap = new Map<string, (request: unknown, reply: { success: (...args: unknown[]) => unknown; status: (code: number) => { success: (...args: unknown[]) => unknown } }) => Promise<unknown>>();
    const fastify = {
      get(path: string, optionsOrHandler: unknown, handler?: never) {
        routeMap.set(path, (handler ?? optionsOrHandler) as never);
      },
      post(path: string, optionsOrHandler: unknown, handler?: never) {
        routeMap.set(`POST ${path}`, (handler ?? optionsOrHandler) as never);
      },
      put(path: string, optionsOrHandler: unknown, handler?: never) {
        routeMap.set(`PUT ${path}`, (handler ?? optionsOrHandler) as never);
      },
      delete(path: string, optionsOrHandler: unknown, handler?: never) {
        routeMap.set(`DELETE ${path}`, (handler ?? optionsOrHandler) as never);
      }
    };

    await questionBankRoutes(fastify as never);
    const success = vi.fn();
    const status = vi.fn().mockReturnValue({ success });

    await routeMap.get("/question-bank")?.({ query: {}, user: { id: "550e8400-e29b-41d4-a716-446655440000" } }, { success, status });
    await routeMap.get("POST /question-bank/search")?.({ body: { query: "klorofil" }, user: { id: "550e8400-e29b-41d4-a716-446655440000" } }, { success, status });

    expect(listMock).toHaveBeenCalledTimes(1);
    expect(searchMock).toHaveBeenCalledTimes(1);
  });
});
