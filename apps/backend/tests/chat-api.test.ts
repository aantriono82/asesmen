import { describe, expect, it, vi } from "vitest";

const createSessionMock = vi.fn();
const listSessionsMock = vi.fn();
const getSessionMock = vi.fn();
const deleteSessionMock = vi.fn();
const sendMessageMock = vi.fn();

vi.mock("../src/application/chat/chat.service", () => ({
  ChatService: vi.fn().mockImplementation(() => ({
    createSession: createSessionMock,
    listSessions: listSessionsMock,
    getSession: getSessionMock,
    deleteSession: deleteSessionMock,
    sendMessage: sendMessageMock
  }))
}));

describe("chat api", () => {
  it("supports session CRUD and message send", async () => {
    const userId = "550e8400-e29b-41d4-a716-446655440000";
    createSessionMock.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440001",
      userId,
      title: "Sesi Baru",
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      systemPrompt: "",
      knowledgeBaseId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    listSessionsMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1
    });
    getSessionMock.mockResolvedValue({
      session: {
        id: "550e8400-e29b-41d4-a716-446655440001",
        userId,
        title: "Sesi Baru"
      },
      messages: []
    });
    deleteSessionMock.mockResolvedValue(undefined);
    sendMessageMock.mockImplementation(async function* () {
      yield { type: "text", delta: "Halo" };
      yield { type: "done", tokens: { in: 10, out: 20 } };
    });

    const { chatRoutes } = await import("../src/api/routes/chat");
    type RouteHandler = (request: Record<string, unknown>, reply: Record<string, unknown>) => unknown;
    const routeMap = new Map<string, RouteHandler>();
    const fastify = {
      get(path: string, optionsOrHandler: unknown, handler?: unknown) {
        routeMap.set(path, (typeof handler === "function" ? handler : optionsOrHandler) as RouteHandler);
      },
      post(path: string, optionsOrHandler: unknown, handler?: unknown) {
        routeMap.set(`POST ${path}`, (typeof handler === "function" ? handler : optionsOrHandler) as RouteHandler);
      },
      delete(path: string, optionsOrHandler: unknown, handler?: unknown) {
        routeMap.set(`DELETE ${path}`, (typeof handler === "function" ? handler : optionsOrHandler) as RouteHandler);
      }
    };

    await chatRoutes(fastify as never);

    const createHandler = routeMap.get("POST /chat/sessions");
    const listHandler = routeMap.get("/chat/sessions");
    const detailHandler = routeMap.get("/chat/sessions/:id");
    const deleteHandler = routeMap.get("DELETE /chat/sessions/:id");
    const sendHandler = routeMap.get("POST /chat/sessions/:id/messages");

    const success = vi.fn();
    const status = vi.fn().mockReturnValue({ success });
    const raw = { writeHead: vi.fn(), write: vi.fn(), end: vi.fn() };

    await createHandler?.({ body: {}, user: { id: userId } }, { success, status });
    await listHandler?.({ query: {}, user: { id: userId } }, { success, status });
    await detailHandler?.({ params: { id: "550e8400-e29b-41d4-a716-446655440001" }, user: { id: userId } }, { success, status });
    await deleteHandler?.({ params: { id: "550e8400-e29b-41d4-a716-446655440001" }, user: { id: userId } }, { success, status });
    await sendHandler?.(
      {
        params: { id: "550e8400-e29b-41d4-a716-446655440001" },
        body: { content: "Halo" },
        user: { id: userId }
      },
      { success, status, raw }
    );

    expect(createSessionMock).toHaveBeenCalledWith({ userId });
    expect(listSessionsMock).toHaveBeenCalledWith(userId, 1, 10);
    expect(getSessionMock).toHaveBeenCalledWith("550e8400-e29b-41d4-a716-446655440001", userId);
    expect(deleteSessionMock).toHaveBeenCalledWith("550e8400-e29b-41d4-a716-446655440001", userId);
    expect(sendMessageMock).toHaveBeenCalledWith({
      sessionId: "550e8400-e29b-41d4-a716-446655440001",
      userId,
      content: "Halo"
    });
    expect(raw.write).toHaveBeenCalledWith('data: {"type":"text","delta":"Halo"}\n\n');
  });
});
