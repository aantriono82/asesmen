import { describe, expect, it, vi } from "vitest";

const sendMessageMock = vi.fn();

vi.mock("../src/application/chat/chat.service", () => ({
  ChatService: vi.fn().mockImplementation(() => ({
    createSession: vi.fn(),
    listSessions: vi.fn(),
    getSession: vi.fn(),
    deleteSession: vi.fn(),
    sendMessage: sendMessageMock
  }))
}));

describe("chat streaming", () => {
  it("writes SSE error event and closes stream", async () => {
    const userId = "550e8400-e29b-41d4-a716-446655440000";
    sendMessageMock.mockImplementation(async function* () {
      yield { type: "error", message: "Provider timeout" };
    });

    const { chatRoutes } = await import("../src/api/routes/chat");
    type RouteHandler = (request: Record<string, unknown>, reply: Record<string, unknown>) => unknown;
    const routeMap = new Map<string, RouteHandler>();
    const fastify = {
      get() {
        return undefined;
      },
      post(path: string, optionsOrHandler: unknown, handler?: unknown) {
        routeMap.set(`POST ${path}`, (typeof handler === "function" ? handler : optionsOrHandler) as RouteHandler);
      },
      delete() {
        return undefined;
      }
    };

    await chatRoutes(fastify as never);
    const sendHandler = routeMap.get("POST /chat/sessions/:id/messages");

    const raw = {
      writeHead: vi.fn(),
      write: vi.fn(),
      end: vi.fn()
    };

    await sendHandler?.(
      {
        params: { id: "550e8400-e29b-41d4-a716-446655440001" },
        body: { content: "Tes" },
        user: { id: userId }
      },
      { raw }
    );

    expect(raw.writeHead).toHaveBeenCalledWith(
      200,
      expect.objectContaining({
        "Content-Type": "text/event-stream"
      })
    );
    expect(raw.write).toHaveBeenCalledWith('data: {"type":"error","message":"Provider timeout"}\n\n');
    expect(raw.end).toHaveBeenCalledTimes(1);
  });
});
