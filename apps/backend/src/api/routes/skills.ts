import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate, requireTeacher } from "@api/middleware/auth";
import { parseBody, parseParams, parseQuery } from "@api/validators/zod";
import { SkillDiscoveryUseCase } from "@app/skills/skill-discovery.use-case";
import {
  DeleteExecutionUseCase,
  ExecuteSkillUseCase,
  GetExecutionUseCase,
  ListExecutionsUseCase
} from "@app/skills/skill-execution.use-case";
import { GetSkillBySlugUseCase, ListSkillsUseCase } from "@app/use-cases/skill-use-cases";
import { DrizzleSkillExecutionStore } from "@infra/repositories/drizzle-skill-execution-store";
import { DrizzleSkillRepository } from "@infra/repositories/drizzle-skill-repository";
import { getQueue } from "@infra/queue/queue";

const skillRepository = new DrizzleSkillRepository();
const executionStore = new DrizzleSkillExecutionStore();

const skillListQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional()
});

const skillDiscoverySchema = z.object({
  query: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().max(50).optional()
});

const executionParamsSchema = z.object({
  slug: z.string().min(2).max(180).regex(/^[a-z0-9-]+$/)
});

const executionHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.enum(["pending", "running", "completed", "failed"]).optional(),
  skillSlug: z.string().trim().min(1).optional(),
  after: z.string().trim().min(1).optional(),
  before: z.string().trim().min(1).optional()
});

const executionBodySchema = z.object({
  input: z.record(z.unknown())
});

const executionIdParamsSchema = z.object({
  id: z.string().uuid()
});

export const skillRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/skills", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const query = parseQuery(request, skillListQuerySchema);
    const useCase = new ListSkillsUseCase(skillRepository);
    const skills = await useCase.execute({
      ...(query.category ? { category: query.category } : {}),
      ...(query.search ? { search: query.search } : {})
    });

    return reply.success(skills, "Daftar skill aktif", "SKILLS_LIST");
  });

  fastify.get("/skills/categories", { preHandler: [authenticate, requireTeacher] }, async (_request, reply) => {
    const useCase = new ListSkillsUseCase(skillRepository);
    const skills = await useCase.execute();
    const categories = [...new Set(skills.map((skill) => skill.category))].sort((a, b) => a.localeCompare(b));

    return reply.success({ categories }, "Daftar kategori skill", "SKILLS_CATEGORIES_LIST");
  });

  fastify.get("/skills/:slug", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const { slug } = parseParams(request, executionParamsSchema);
    const useCase = new GetSkillBySlugUseCase(skillRepository);
    const skill = await useCase.execute(slug);

    const { preferredModel, ...rest } = skill;
    return reply.success({ ...rest, preferred_model: preferredModel ?? null }, "Detail skill", "SKILL_DETAIL");
  });

  fastify.post("/skills/discover", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const body = parseBody(request, skillDiscoverySchema);
    const useCase = new SkillDiscoveryUseCase();
    const result = await useCase.execute({
      ...(body.query ? { query: body.query } : {}),
      ...(body.category ? { category: body.category } : {}),
      ...(typeof body.limit === "number" ? { limit: body.limit } : {})
    });

    return reply.success(result, "Discovery skill selesai", "SKILL_DISCOVERY");
  });

  fastify.post("/skills/:slug/execute", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const { slug } = parseParams(request, executionParamsSchema);
    const body = parseBody(request, executionBodySchema);
    const userId = z.string().uuid().parse(request.user?.id);

    const useCase = new ExecuteSkillUseCase(skillRepository, executionStore, {
      async send(jobName, payload) {
        return getQueue().send(jobName, payload);
      }
    });

    const result = await useCase.execute({
      userId,
      slug,
      input: body.input
    });

    return reply.status(201).success(result, "Skill masuk antrean", "SKILL_EXECUTION_QUEUED");
  });

  fastify.get("/executions/:id", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const { id } = parseParams(request, executionIdParamsSchema);
    const userId = z.string().uuid().parse(request.user?.id);
    const useCase = new GetExecutionUseCase(executionStore);
    const execution = await useCase.execute({ executionId: id, userId });

    return reply.success(execution, "Detail eksekusi", "EXECUTION_DETAIL");
  });

  fastify.get("/executions", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const query = parseQuery(request, executionHistoryQuerySchema);
    const userId = z.string().uuid().parse(request.user?.id);
    const useCase = new ListExecutionsUseCase(executionStore);
    const result = await useCase.execute({
      userId,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      ...(query.status ? { status: query.status } : {}),
      ...(query.skillSlug ? { skillSlug: query.skillSlug } : {}),
      ...(query.after ? { after: query.after } : {}),
      ...(query.before ? { before: query.before } : {})
    });

    return reply.success(result, "Riwayat eksekusi", "EXECUTIONS_LIST");
  });

  fastify.delete("/executions/:id", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const { id } = parseParams(request, executionIdParamsSchema);
    const userId = z.string().uuid().parse(request.user?.id);
    const useCase = new DeleteExecutionUseCase(executionStore);
    await useCase.execute({ executionId: id, userId });

    return reply.success({ deleted: true }, "Eksekusi dihapus", "EXECUTION_DELETED");
  });
};
