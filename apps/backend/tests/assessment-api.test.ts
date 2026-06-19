import { describe, expect, it, vi } from "vitest";

const generateMock = vi.fn();
const listMock = vi.fn();
const detailMock = vi.fn();
const statusMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const addQuestionMock = vi.fn();
const updateQuestionMock = vi.fn();
const deleteQuestionMock = vi.fn();
const reorderMock = vi.fn();
const fromBankMock = vi.fn();
const auditLogMock = vi.fn();

vi.mock("../src/application/assessments/generate-assessment.use-case", () => ({
  GenerateAssessmentUseCase: vi.fn().mockImplementation(() => ({ execute: generateMock }))
}));

vi.mock("../src/application/assessments/assessment-management.use-case", () => ({
  ListAssessmentsUseCase: vi.fn().mockImplementation(() => ({ execute: listMock })),
  GetAssessmentUseCase: vi.fn().mockImplementation(() => ({ execute: detailMock })),
  GetAssessmentStatusUseCase: vi.fn().mockImplementation(() => ({ execute: statusMock })),
  UpdateAssessmentUseCase: vi.fn().mockImplementation(() => ({ execute: updateMock })),
  DeleteAssessmentUseCase: vi.fn().mockImplementation(() => ({ execute: deleteMock })),
  AddQuestionUseCase: vi.fn().mockImplementation(() => ({ execute: addQuestionMock })),
  UpdateQuestionUseCase: vi.fn().mockImplementation(() => ({ execute: updateQuestionMock })),
  DeleteQuestionUseCase: vi.fn().mockImplementation(() => ({ execute: deleteQuestionMock })),
  ReorderQuestionsUseCase: vi.fn().mockImplementation(() => ({ execute: reorderMock })),
  AddQuestionsFromBankUseCase: vi.fn().mockImplementation(() => ({ execute: fromBankMock }))
}));

vi.mock("../src/infrastructure/audit/audit.service", () => ({
  AuditService: vi.fn().mockImplementation(() => ({ log: auditLogMock }))
}));

describe("assessment api", () => {
  it("supports CRUD and generate routes", async () => {
    generateMock.mockResolvedValue({ assessmentId: "assessment-id", status: "draft" });
    listMock.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10, totalPages: 1 });
    detailMock.mockResolvedValue({ id: "assessment-id", questions: [] });
    statusMock.mockResolvedValue({ id: "assessment-id", status: "draft" });
    updateMock.mockResolvedValue({ id: "assessment-id" });
    deleteMock.mockResolvedValue({ deleted: true });
    addQuestionMock.mockResolvedValue({ id: "q1" });
    updateQuestionMock.mockResolvedValue({ id: "q1" });
    deleteQuestionMock.mockResolvedValue({ deleted: true });
    reorderMock.mockResolvedValue({ updated: true });
    fromBankMock.mockResolvedValue([]);

    const { assessmentRoutes } = await import("../src/api/routes/assessments");
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

    await assessmentRoutes(fastify as never);
    const success = vi.fn();
    const status = vi.fn().mockReturnValue({ success });

    await routeMap.get("POST /assessments/generate")?.(
      {
        body: {
          title: "Assessment IPA",
          subject: "IPA",
          grade_level: "VIII",
          assessment_type: "latihan",
          topic: "Fotosintesis",
          config: {
            total_questions: 1,
            question_types: [{ skill_slug: "generate-soal-pilihan-ganda", count: 1, score: 1 }],
            difficulty_mix: { mudah: 100, sedang: 0, sulit: 0 },
            cognitive_levels: ["C1"]
          }
        },
        user: { id: "550e8400-e29b-41d4-a716-446655440000" },
        headers: {}
      },
      { success, status }
    );
    await routeMap.get("/assessments")?.({ query: {}, user: { id: "550e8400-e29b-41d4-a716-446655440000" }, headers: {} }, { success, status });
    await routeMap.get("/assessments/:id")?.({ params: { id: "550e8400-e29b-41d4-a716-446655440001" }, user: { id: "550e8400-e29b-41d4-a716-446655440000" }, headers: {} }, { success, status });
    await routeMap.get("/assessments/:id/status")?.({ params: { id: "550e8400-e29b-41d4-a716-446655440001" }, user: { id: "550e8400-e29b-41d4-a716-446655440000" }, headers: {} }, { success, status });

    expect(generateMock).toHaveBeenCalledTimes(1);
    expect(listMock).toHaveBeenCalledTimes(1);
    expect(detailMock).toHaveBeenCalledTimes(1);
    expect(statusMock).toHaveBeenCalledTimes(1);
  });
});
