import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate, requireTeacher } from "@api/middleware/auth";
import { parseBody, parseParams, parseQuery } from "@api/validators/zod";
import {
  AddQuestionUseCase,
  AddQuestionsFromBankUseCase,
  DeleteAssessmentUseCase,
  DeleteQuestionUseCase,
  GetAssessmentStatusUseCase,
  GetAssessmentUseCase,
  ListAssessmentsUseCase,
  ReorderQuestionsUseCase,
  UpdateAssessmentUseCase,
  UpdateQuestionUseCase
} from "@app/assessments/assessment-management.use-case";
import { generateAssessmentInputSchema, questionPayloadSchema } from "@app/assessments/assessment.schemas";
import { GenerateAssessmentUseCase } from "@app/assessments/generate-assessment.use-case";
import { AuditService } from "@infra/audit/audit.service";
import { getQueue } from "@infra/queue/queue";
import { DrizzleDocumentRepository } from "@infra/repositories/drizzle-document.repository";
import { DrizzleAssessmentRepository } from "@infra/repositories/drizzle-assessment.repository";
import { DrizzleSkillRepository } from "@infra/repositories/drizzle-skill-repository";
import { AppError } from "@lib/errors";

const repository = new DrizzleAssessmentRepository();
const skills = new DrizzleSkillRepository();
const documents = new DrizzleDocumentRepository();
const audit = new AuditService();

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  subject: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1).optional()
});

const idParamsSchema = z.object({
  id: z.string().uuid()
});

const questionParamsSchema = z.object({
  id: z.string().uuid(),
  qid: z.string().uuid()
});

const fromBankBodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1)
});

export const assessmentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/assessments/generate", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const payload = parseBody(request, generateAssessmentInputSchema);
    if (payload.knowledge_base_id) {
      const knowledgeBase = await documents.getKnowledgeBase(payload.knowledge_base_id, userId);
      if (!knowledgeBase) {
        throw new AppError("Knowledge base tidak ditemukan", "KNOWLEDGE_BASE_NOT_FOUND", 404);
      }
      const hasDocuments = await documents.knowledgeBaseHasCompletedDocuments(payload.knowledge_base_id, userId);
      if (!hasDocuments) {
        throw new AppError(
          "Knowledge base harus memiliki minimal satu dokumen berstatus completed",
          "KNOWLEDGE_BASE_EMPTY",
          400
        );
      }
    }

    const useCase = new GenerateAssessmentUseCase(skills, repository, {
      async send(jobName, body) {
        return getQueue().send(jobName, body);
      }
    });
    const result = await useCase.execute({ userId, payload });
    await audit.log({
      userId,
      action: "CREATE",
      entityType: "assessment",
      entityId: result.assessmentId,
      description: `Queue generate assessment ${payload.title}`,
      metadata: payload,
      request
    });
    return reply.status(201).success(result, "Assessment masuk antrean", "ASSESSMENT_GENERATION_QUEUED");
  });

  fastify.get("/assessments", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const query = parseQuery(request, listQuerySchema);
    const result = await new ListAssessmentsUseCase(repository).execute({
      userId,
      ...(query.page ? { page: query.page } : {}),
      ...(query.limit ? { limit: query.limit } : {}),
      ...(query.subject ? { subject: query.subject } : {}),
      ...(query.status ? { status: query.status } : {})
    });
    return reply.success(result, "Daftar assessment", "ASSESSMENTS_LIST");
  });

  fastify.get("/assessments/:id", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id } = parseParams(request, idParamsSchema);
    const result = await new GetAssessmentUseCase(repository).execute({ assessmentId: id, userId });
    return reply.success(result, "Detail assessment", "ASSESSMENT_DETAIL");
  });

  fastify.get("/assessments/:id/status", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id } = parseParams(request, idParamsSchema);
    const result = await new GetAssessmentStatusUseCase(repository).execute({ assessmentId: id, userId });
    return reply.success(result, "Status assessment", "ASSESSMENT_STATUS");
  });

  fastify.put("/assessments/:id", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id } = parseParams(request, idParamsSchema);
    const result = await new UpdateAssessmentUseCase(repository).execute({
      assessmentId: id,
      userId,
      payload: request.body as Record<string, unknown>
    });
    await audit.log({ userId, action: "UPDATE", entityType: "assessment", entityId: id, description: `Update assessment ${id}`, request });
    return reply.success(result, "Assessment diperbarui", "ASSESSMENT_UPDATED");
  });

  fastify.delete("/assessments/:id", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id } = parseParams(request, idParamsSchema);
    const result = await new DeleteAssessmentUseCase(repository).execute({ assessmentId: id, userId });
    await audit.log({ userId, action: "DELETE", entityType: "assessment", entityId: id, description: `Delete assessment ${id}`, request });
    return reply.success(result, "Assessment dihapus", "ASSESSMENT_DELETED");
  });

  fastify.post("/assessments/:id/questions", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id } = parseParams(request, idParamsSchema);
    const payload = parseBody(request, questionPayloadSchema);
    const result = await new AddQuestionUseCase(repository).execute({ assessmentId: id, userId, payload });
    await audit.log({ userId, action: "CREATE", entityType: "question", entityId: result.id, description: `Tambah soal ke assessment ${id}`, request });
    return reply.status(201).success(result, "Soal ditambahkan", "ASSESSMENT_QUESTION_CREATED");
  });

  fastify.put("/assessments/:id/questions/:qid", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id, qid } = parseParams(request, questionParamsSchema);
    const result = await new UpdateQuestionUseCase(repository).execute({
      assessmentId: id,
      questionId: qid,
      userId,
      payload: request.body as Record<string, unknown>
    });
    await audit.log({ userId, action: "UPDATE", entityType: "question", entityId: qid, description: `Update soal ${qid}`, request });
    return reply.success(result, "Soal diperbarui", "ASSESSMENT_QUESTION_UPDATED");
  });

  fastify.delete("/assessments/:id/questions/:qid", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id, qid } = parseParams(request, questionParamsSchema);
    const result = await new DeleteQuestionUseCase(repository).execute({ assessmentId: id, questionId: qid, userId });
    await audit.log({ userId, action: "DELETE", entityType: "question", entityId: qid, description: `Hapus soal ${qid}`, request });
    return reply.success(result, "Soal dihapus", "ASSESSMENT_QUESTION_DELETED");
  });

  fastify.post("/assessments/:id/questions/reorder", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id } = parseParams(request, idParamsSchema);
    const result = await new ReorderQuestionsUseCase(repository).execute({
      assessmentId: id,
      userId,
      payload: request.body
    });
    await audit.log({ userId, action: "UPDATE", entityType: "assessment", entityId: id, description: `Reorder soal assessment ${id}`, request });
    return reply.success(result, "Urutan soal diperbarui", "ASSESSMENT_QUESTIONS_REORDERED");
  });

  fastify.post("/assessments/:id/questions/from-bank", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id } = parseParams(request, idParamsSchema);
    const payload = parseBody(request, fromBankBodySchema);
    const result = await new AddQuestionsFromBankUseCase(repository).execute({
      assessmentId: id,
      userId,
      questionBankIds: payload.ids
    });
    await audit.log({ userId, action: "CREATE", entityType: "assessment", entityId: id, description: `Tambahkan soal bank ke assessment ${id}`, request });
    return reply.success(result, "Soal bank ditambahkan", "ASSESSMENT_QUESTIONS_FROM_BANK");
  });
};
