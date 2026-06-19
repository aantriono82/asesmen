import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate, requireTeacher } from "@api/middleware/auth";
import { parseBody, parseParams, parseQuery } from "@api/validators/zod";
import { AddKnowledgeTagsUseCase, ListKnowledgeTagsUseCase, SearchKnowledgeUseCase } from "@app/knowledge/knowledge.use-case";
import { ContextBuilder } from "@infra/documents/context-builder";
import { RetrievalService } from "@infra/documents/retrieval.service";
import { DrizzleDocumentRepository } from "@infra/repositories/drizzle-document.repository";
import { DrizzleAssessmentRepository } from "@infra/repositories/drizzle-assessment.repository";
import { AppError } from "@lib/errors";

const repository = new DrizzleAssessmentRepository();
const documents = new DrizzleDocumentRepository();
const retrieval = new RetrievalService();
const contextBuilder = new ContextBuilder();

const searchQuerySchema = z.object({
  q: z.string().trim().min(1),
  type: z.string().trim().min(1).optional(),
  subject: z.string().trim().min(1).optional()
});

const knowledgeBaseBodySchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2_000).optional()
});

const knowledgeBaseIdParamsSchema = z.object({
  id: z.string().uuid(),
  docId: z.string().uuid().optional()
});

const attachDocumentsSchema = z.object({
  document_ids: z.array(z.string().uuid()).min(1).max(100)
});

const semanticSearchSchema = z.object({
  query: z.string().trim().min(1),
  top_k: z.number().int().positive().max(20).optional(),
  threshold: z.number().min(0).max(1).optional()
});

export const knowledgeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/knowledge-bases", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const body = parseBody(request, knowledgeBaseBodySchema);
    const result = await documents.createKnowledgeBase({
      userId,
      name: body.name,
      description: body.description ?? null,
      deletedAt: null
    });
    return reply.status(201).success(result, "Knowledge base dibuat", "KNOWLEDGE_BASE_CREATED");
  });

  fastify.get("/knowledge-bases", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const result = await documents.listKnowledgeBases(userId);
    return reply.success(result, "Daftar knowledge base", "KNOWLEDGE_BASE_LIST");
  });

  fastify.get("/knowledge-bases/:id", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id } = parseParams(request, knowledgeBaseIdParamsSchema);
    const result = await documents.getKnowledgeBase(id, userId);
    if (!result) {
      throw new AppError("Knowledge base tidak ditemukan", "KNOWLEDGE_BASE_NOT_FOUND", 404);
    }
    return reply.success(result, "Detail knowledge base", "KNOWLEDGE_BASE_DETAIL");
  });

  fastify.delete("/knowledge-bases/:id", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id } = parseParams(request, knowledgeBaseIdParamsSchema);
    const deleted = await documents.softDeleteKnowledgeBase(id, userId);
    if (!deleted) {
      throw new AppError("Knowledge base tidak ditemukan", "KNOWLEDGE_BASE_NOT_FOUND", 404);
    }
    return reply.success({ deleted: true }, "Knowledge base dihapus", "KNOWLEDGE_BASE_DELETED");
  });

  fastify.post("/knowledge-bases/:id/documents", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id } = parseParams(request, knowledgeBaseIdParamsSchema);
    const body = parseBody(request, attachDocumentsSchema);
    const knowledgeBase = await documents.getKnowledgeBase(id, userId);
    if (!knowledgeBase) {
      throw new AppError("Knowledge base tidak ditemukan", "KNOWLEDGE_BASE_NOT_FOUND", 404);
    }

    const ownedDocuments = await documents.listDocumentsByIds(body.document_ids, userId);
    if (ownedDocuments.length !== body.document_ids.length) {
      throw new AppError("Ada dokumen yang tidak valid atau bukan milik user", "DOCUMENT_NOT_FOUND", 400);
    }

    await documents.attachDocumentsToKnowledgeBase(id, body.document_ids);
    return reply.success({ attached: body.document_ids.length }, "Dokumen ditambahkan ke knowledge base", "KNOWLEDGE_BASE_DOCUMENTS_ADDED");
  });

  fastify.delete("/knowledge-bases/:id/documents/:docId", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id, docId } = parseParams(request, knowledgeBaseIdParamsSchema);
    const knowledgeBase = await documents.getKnowledgeBase(id, userId);
    if (!knowledgeBase) {
      throw new AppError("Knowledge base tidak ditemukan", "KNOWLEDGE_BASE_NOT_FOUND", 404);
    }

    await documents.detachDocumentFromKnowledgeBase(id, z.string().uuid().parse(docId));
    return reply.success({ deleted: true }, "Dokumen dilepas dari knowledge base", "KNOWLEDGE_BASE_DOCUMENT_REMOVED");
  });

  fastify.post("/knowledge-bases/:id/search", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id } = parseParams(request, knowledgeBaseIdParamsSchema);
    const body = parseBody(request, semanticSearchSchema);
    const knowledgeBase = await documents.getKnowledgeBase(id, userId);
    if (!knowledgeBase) {
      throw new AppError("Knowledge base tidak ditemukan", "KNOWLEDGE_BASE_NOT_FOUND", 404);
    }

    const result = await retrieval.search(body.query, {
      knowledge_base_id: id,
      ...(body.top_k ? { top_k: body.top_k } : {}),
      ...(typeof body.threshold === "number" ? { threshold: body.threshold } : {})
    });

    return reply.success(
      {
        items: result,
        context: contextBuilder.build(
          result.map((item) => ({
            documentTitle: item.documentTitle,
            content: item.content,
            pageNumber: item.pageNumber,
            score: item.score,
            tokenCount: item.tokenCount
          })),
          { format: "markdown" }
        )
      },
      "Hasil semantic search",
      "KNOWLEDGE_BASE_SEARCH"
    );
  });

  fastify.get("/knowledge/search", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const query = parseQuery(request, searchQuerySchema);
    const result = await new SearchKnowledgeUseCase(repository).execute({
      userId,
      q: query.q,
      ...(query.type ? { type: query.type } : {}),
      ...(query.subject ? { subject: query.subject } : {})
    });
    return reply.success(result, "Hasil pencarian knowledge", "KNOWLEDGE_SEARCH");
  });

  fastify.post("/knowledge/tags", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const result = await new AddKnowledgeTagsUseCase(repository).execute({ userId, payload: parseBody(request, z.record(z.unknown())) });
    return reply.success(result, "Tag berhasil ditambahkan", "KNOWLEDGE_TAGS_UPDATED");
  });

  fastify.get("/knowledge/tags", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const result = await new ListKnowledgeTagsUseCase(repository).execute(userId);
    return reply.success(result, "Daftar tag knowledge", "KNOWLEDGE_TAGS_LIST");
  });
};
