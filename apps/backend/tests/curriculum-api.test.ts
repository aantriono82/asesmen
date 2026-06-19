import { describe, expect, it, vi } from "vitest";

const generateMock = vi.fn();
const listMock = vi.fn();
const getMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const auditLogMock = vi.fn();

vi.mock("../src/application/curricula/curriculum-management.use-case", () => ({
  GenerateCurriculumUseCase: vi.fn().mockImplementation(() => ({ execute: generateMock })),
  ListCurriculaUseCase: vi.fn().mockImplementation(() => ({ execute: listMock })),
  GetCurriculumUseCase: vi.fn().mockImplementation(() => ({ execute: getMock })),
  UpdateCurriculumUseCase: vi.fn().mockImplementation(() => ({ execute: updateMock })),
  DeleteCurriculumUseCase: vi.fn().mockImplementation(() => ({ execute: deleteMock }))
}));

vi.mock("../src/infrastructure/audit/audit.service", () => ({
  AuditService: vi.fn().mockImplementation(() => ({ log: auditLogMock }))
}));

describe("curriculum api", () => {
  it("supports generate and CRUD routes", async () => {
    generateMock.mockResolvedValue({ id: "curriculum-id", type: "rpp" });
    listMock.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10, totalPages: 1 });
    getMock.mockResolvedValue({ id: "curriculum-id" });
    updateMock.mockResolvedValue({ id: "curriculum-id" });
    deleteMock.mockResolvedValue({ deleted: true });

    const { curriculumRoutes } = await import("../src/api/routes/curricula");
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

    await curriculumRoutes(fastify as never);
    const success = vi.fn();
    const status = vi.fn().mockReturnValue({ success });
    await routeMap.get("POST /curricula/generate")?.(
      { body: { type: "rpp", subject: "IPA", grade_level: "VIII", config: { kd: "3.5", materi: "Fotosintesis", alokasi_waktu: "2 x 40 menit", metode_pembelajaran: "Diskusi" } }, user: { id: "550e8400-e29b-41d4-a716-446655440000" }, headers: {} },
      { success, status }
    );
    await routeMap.get("/curricula")?.({ query: {}, user: { id: "550e8400-e29b-41d4-a716-446655440000" }, headers: {} }, { success, status });

    expect(generateMock).toHaveBeenCalledTimes(1);
    expect(listMock).toHaveBeenCalledTimes(1);
  });
});
