import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate, requireTeacher } from "@api/middleware/auth";
import { parseParams, parseQuery } from "@api/validators/zod";
import {
  CreateQuestionBankUseCase,
  DeleteQuestionBankUseCase,
  GetQuestionBankUseCase,
  ListQuestionBankUseCase,
  SearchQuestionBankUseCase,
  UpdateQuestionBankUseCase
} from "@app/question-bank/question-bank.use-case";
import { AuditService } from "@infra/audit/audit.service";
import { DrizzleAssessmentRepository } from "@infra/repositories/drizzle-assessment.repository";

const repository = new DrizzleAssessmentRepository();
const audit = new AuditService();

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  subject: z.string().trim().min(1).optional(),
  grade_level: z.string().trim().min(1).optional(),
  type: z.string().trim().min(1).optional(),
  difficulty: z.string().trim().min(1).optional(),
  tags: z.string().trim().min(1).optional()
});

const idParamsSchema = z.object({
  id: z.string().uuid()
});

export const questionBankRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/question-bank", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const query = parseQuery(request, querySchema);
    const result = await new ListQuestionBankUseCase(repository).execute({
      userId,
      ...(query.page ? { page: query.page } : {}),
      ...(query.limit ? { limit: query.limit } : {}),
      ...(query.subject ? { subject: query.subject } : {}),
      ...(query.grade_level ? { gradeLevel: query.grade_level } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.difficulty ? { difficulty: query.difficulty } : {}),
      ...(query.tags ? { tags: query.tags.split(",").map((item) => item.trim()).filter(Boolean) } : {})
    });
    return reply.success(result, "Daftar bank soal", "QUESTION_BANK_LIST");
  });

  fastify.post("/question-bank", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const result = await new CreateQuestionBankUseCase(repository).execute({
      userId,
      payload: request.body as Record<string, unknown>
    });
    await audit.log({ userId, action: "CREATE", entityType: "question_bank", entityId: result.id, description: `Simpan soal ke bank ${result.id}`, request });
    return reply.status(201).success(result, "Soal disimpan ke bank", "QUESTION_BANK_CREATED");
  });

  fastify.get("/question-bank/:id", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id } = parseParams(request, idParamsSchema);
    const result = await new GetQuestionBankUseCase(repository).execute({ id, userId });
    return reply.success(result, "Detail bank soal", "QUESTION_BANK_DETAIL");
  });

  fastify.put("/question-bank/:id", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id } = parseParams(request, idParamsSchema);
    const result = await new UpdateQuestionBankUseCase(repository).execute({
      id,
      userId,
      payload: request.body as Record<string, unknown>
    });
    await audit.log({ userId, action: "UPDATE", entityType: "question_bank", entityId: id, description: `Update bank soal ${id}`, request });
    return reply.success(result, "Bank soal diperbarui", "QUESTION_BANK_UPDATED");
  });

  fastify.delete("/question-bank/:id", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id } = parseParams(request, idParamsSchema);
    const result = await new DeleteQuestionBankUseCase(repository).execute({ id, userId });
    await audit.log({ userId, action: "DELETE", entityType: "question_bank", entityId: id, description: `Hapus bank soal ${id}`, request });
    return reply.success(result, "Bank soal dihapus", "QUESTION_BANK_DELETED");
  });

  fastify.post("/question-bank/search", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const result = await new SearchQuestionBankUseCase(repository).execute({
      userId,
      payload: request.body as Record<string, unknown>
    });
    return reply.success(result, "Hasil pencarian bank soal", "QUESTION_BANK_SEARCH");
  });
};
