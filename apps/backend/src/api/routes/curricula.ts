import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate, requireTeacher } from "@api/middleware/auth";
import { parseParams, parseQuery } from "@api/validators/zod";
import {
  DeleteCurriculumUseCase,
  GenerateCurriculumUseCase,
  GetCurriculumUseCase,
  ListCurriculaUseCase,
  UpdateCurriculumUseCase
} from "@app/curricula/curriculum-management.use-case";
import { AuditService } from "@infra/audit/audit.service";
import { DrizzleAssessmentRepository } from "@infra/repositories/drizzle-assessment.repository";

const repository = new DrizzleAssessmentRepository();
const audit = new AuditService();

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  type: z.string().trim().min(1).optional(),
  subject: z.string().trim().min(1).optional()
});

const idParamsSchema = z.object({
  id: z.string().uuid()
});

export const curriculumRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/curricula/generate", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const result = await new GenerateCurriculumUseCase(repository).execute({
      userId,
      payload: request.body as Record<string, unknown>
    });
    await audit.log({ userId, action: "CREATE", entityType: "curriculum", entityId: result.id, description: `Generate curriculum ${result.id}`, request });
    return reply.status(201).success(result, "Kurikulum berhasil dibuat", "CURRICULUM_GENERATED");
  });

  fastify.get("/curricula", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const query = parseQuery(request, querySchema);
    const result = await new ListCurriculaUseCase(repository).execute({
      userId,
      ...(query.page ? { page: query.page } : {}),
      ...(query.limit ? { limit: query.limit } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.subject ? { subject: query.subject } : {})
    });
    return reply.success(result, "Daftar kurikulum", "CURRICULA_LIST");
  });

  fastify.get("/curricula/:id", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id } = parseParams(request, idParamsSchema);
    const result = await new GetCurriculumUseCase(repository).execute({ id, userId });
    return reply.success(result, "Detail kurikulum", "CURRICULUM_DETAIL");
  });

  fastify.put("/curricula/:id", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id } = parseParams(request, idParamsSchema);
    const result = await new UpdateCurriculumUseCase(repository).execute({
      id,
      userId,
      payload: request.body as Record<string, unknown>
    });
    await audit.log({ userId, action: "UPDATE", entityType: "curriculum", entityId: id, description: `Update curriculum ${id}`, request });
    return reply.success(result, "Kurikulum diperbarui", "CURRICULUM_UPDATED");
  });

  fastify.delete("/curricula/:id", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id } = parseParams(request, idParamsSchema);
    const result = await new DeleteCurriculumUseCase(repository).execute({ id, userId });
    await audit.log({ userId, action: "DELETE", entityType: "curriculum", entityId: id, description: `Delete curriculum ${id}`, request });
    return reply.success(result, "Kurikulum dihapus", "CURRICULUM_DELETED");
  });
};
