import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";

const createDocumentMock = vi.fn();
const queueSendMock = vi.fn();
const rateLimiterConsumeMock = vi.fn();
const uploadStreamMock = vi.fn().mockImplementation(async (stream: NodeJS.ReadableStream) => {
  for await (const chunk of stream) {
    // consume the stream so ByteCounterTransform captures signature bytes
    void chunk;
  }
  return { path: "documents/u/doc.pdf", url: "http://local/doc.pdf" };
});
const auditLogMock = vi.fn();

vi.mock("../src/infrastructure/repositories/drizzle-document.repository", () => ({
  DrizzleDocumentRepository: vi.fn().mockImplementation(() => ({
    createDocument: createDocumentMock
  }))
}));

vi.mock("../src/infrastructure/storage", () => ({
  getFileStorage: () => ({
    uploadStream: uploadStreamMock
  })
}));

vi.mock("../src/infrastructure/queue/queue", () => ({
  getQueue: () => ({ send: queueSendMock })
}));

vi.mock("../src/infrastructure/rate-limit/pg-rate-limiter", () => ({
  PgRateLimiter: vi.fn().mockImplementation(() => ({ consume: rateLimiterConsumeMock })),
  rateLimitPolicies: {
    upload: { name: "upload", limit: 5, windowMs: 60_000, scope: "user" }
  }
}));

vi.mock("../src/infrastructure/audit/audit.service", () => ({
  AuditService: vi.fn().mockImplementation(() => ({ log: auditLogMock }))
}));

describe("document upload api", () => {
  it("queues uploaded files for processing", async () => {
    createDocumentMock.mockResolvedValue({ id: "doc-1" });
    const { documentRoutes } = await import("../src/api/routes/documents");
    const routeMap = new Map<string, (request: unknown, reply: { success: (...args: unknown[]) => unknown; status: (code: number) => { success: (...args: unknown[]) => unknown } }) => Promise<unknown>>();
    const fastify = {
      post(path: string, optionsOrHandler: unknown, handler?: never) {
        routeMap.set(`POST ${path}`, (handler ?? optionsOrHandler) as never);
      },
      get() {},
      delete() {}
    };

    await documentRoutes(fastify as never);
    const success = vi.fn();
    const status = vi.fn().mockReturnValue({ success });
    const handler = routeMap.get("POST /documents/upload");

    await handler?.(
      {
        user: { id: "550e8400-e29b-41d4-a716-446655440000" },
        parts: async function* () {
          const validPdfBuffer = Buffer.from("%PDF-1.4\n%EOF", "utf-8");
          yield {
            type: "file",
            filename: "materi.pdf",
            mimetype: "application/pdf",
            file: ReadableFrom.from(validPdfBuffer)
          };
        }
      },
      { success, status }
    );

    expect(uploadStreamMock).toHaveBeenCalledTimes(1);
    expect(rateLimiterConsumeMock).toHaveBeenCalledTimes(1);
    expect(createDocumentMock).toHaveBeenCalledTimes(1);
    expect(queueSendMock).toHaveBeenCalledWith("document-processing", expect.any(Object));
  });
});

class ReadableFrom {
  public static from(buffer: Buffer): NodeJS.ReadableStream {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
  }
}
