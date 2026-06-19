import { describe, expect, it, vi } from "vitest";

const createKnowledgeBaseMock = vi.fn();
const listKnowledgeBasesMock = vi.fn();
const getKnowledgeBaseMock = vi.fn();

vi.mock("../src/infrastructure/repositories/drizzle-document.repository", () => ({
  DrizzleDocumentRepository: vi.fn().mockImplementation(() => ({
    createKnowledgeBase: createKnowledgeBaseMock,
    listKnowledgeBases: listKnowledgeBasesMock,
    getKnowledgeBase: getKnowledgeBaseMock,
    listDocumentsByIds: vi.fn().mockResolvedValue([]),
    attachDocumentsToKnowledgeBase: vi.fn().mockResolvedValue(undefined),
    detachDocumentFromKnowledgeBase: vi.fn().mockResolvedValue(undefined),
    softDeleteKnowledgeBase: vi.fn().mockResolvedValue(true)
  }))
}));

vi.mock("../src/infrastructure/documents/retrieval.service", () => ({
  RetrievalService: vi.fn().mockImplementation(() => ({
    search: vi.fn().mockResolvedValue([])
  }))
}));

describe("knowledge base api", () => {
  it("supports create and list", async () => {
    createKnowledgeBaseMock.mockResolvedValue({ id: "kb-1", name: "KB IPA" });
    listKnowledgeBasesMock.mockResolvedValue([{ id: "kb-1", name: "KB IPA", documentCount: 1 }]);
    getKnowledgeBaseMock.mockResolvedValue({ id: "kb-1", name: "KB IPA", documents: [] });

    const { knowledgeRoutes } = await import("../src/api/routes/knowledge");
    const routeMap = new Map<string, (request: unknown, reply: { success: (...args: unknown[]) => unknown; status: (code: number) => { success: (...args: unknown[]) => unknown } }) => Promise<unknown>>();
    const fastify = {
      get(path: string, optionsOrHandler: unknown, handler?: never) {
        routeMap.set(path, (handler ?? optionsOrHandler) as never);
      },
      post(path: string, optionsOrHandler: unknown, handler?: never) {
        routeMap.set(`POST ${path}`, (handler ?? optionsOrHandler) as never);
      },
      delete(path: string, optionsOrHandler: unknown, handler?: never) {
        routeMap.set(`DELETE ${path}`, (handler ?? optionsOrHandler) as never);
      }
    };

    await knowledgeRoutes(fastify as never);
    const success = vi.fn();
    const status = vi.fn().mockReturnValue({ success });

    await routeMap.get("POST /knowledge-bases")?.(
      { user: { id: "550e8400-e29b-41d4-a716-446655440000" }, body: { name: "KB IPA" } },
      { success, status }
    );
    await routeMap.get("/knowledge-bases")?.(
      { user: { id: "550e8400-e29b-41d4-a716-446655440000" } },
      { success, status }
    );

    expect(createKnowledgeBaseMock).toHaveBeenCalledTimes(1);
    expect(listKnowledgeBasesMock).toHaveBeenCalledTimes(1);
  });
});
