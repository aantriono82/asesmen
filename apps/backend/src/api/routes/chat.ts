import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate, requireTeacher } from "@api/middleware/auth";
import { parseBody, parseParams, parseQuery } from "@api/validators/zod";
import { ChatService } from "@app/chat/chat.service";
import { DrizzleDocumentRepository } from "@infra/repositories/drizzle-document.repository";
import { AppError } from "@lib/errors";

const chatService = new ChatService();
const documents = new DrizzleDocumentRepository();

const createSessionSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  systemPrompt: z.string().trim().max(4_000).optional(),
  knowledgeBaseId: z.string().uuid().optional()
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional()
});

const sessionParamsSchema = z.object({
  id: z.string().uuid()
});

const messageBodySchema = z.object({
  content: z.string().trim().min(1).max(20_000)
});

export const chatRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/chat/sessions", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const body = parseBody(request, createSessionSchema);
    if (body.knowledgeBaseId) {
      const knowledgeBase = await documents.getKnowledgeBase(body.knowledgeBaseId, userId);
      if (!knowledgeBase) {
        throw new AppError("Knowledge base tidak ditemukan", "KNOWLEDGE_BASE_NOT_FOUND", 404);
      }
    }
    const session = await chatService.createSession({
      userId,
      ...(body.title ? { title: body.title } : {}),
      ...(body.systemPrompt ? { systemPrompt: body.systemPrompt } : {}),
      ...(body.knowledgeBaseId ? { knowledgeBaseId: body.knowledgeBaseId } : {})
    });

    return reply.status(201).success(session, "Chat session dibuat", "CHAT_SESSION_CREATED");
  });

  fastify.get("/chat/sessions", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const query = parseQuery(request, paginationSchema);
    const result = await chatService.listSessions(userId, query.page ?? 1, query.limit ?? 10);

    return reply.success(result, "Daftar chat session", "CHAT_SESSIONS_LIST");
  });

  fastify.get("/chat/sessions/:id", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id } = parseParams(request, sessionParamsSchema);
    const result = await chatService.getSession(id, userId);

    return reply.success(result, "Detail chat session", "CHAT_SESSION_DETAIL");
  });

  fastify.delete("/chat/sessions/:id", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id } = parseParams(request, sessionParamsSchema);
    await chatService.deleteSession(id, userId);

    return reply.success({ deleted: true }, "Chat session dihapus", "CHAT_SESSION_DELETED");
  });

  fastify.post(
    "/chat/sessions/:id/messages",
    {
      preHandler: [authenticate, requireTeacher],
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute"
        }
      }
    },
    async (request, reply) => {
      const userId = z.string().uuid().parse(request.user?.id);
      const { id } = parseParams(request, sessionParamsSchema);
      const body = parseBody(request, messageBodySchema);

      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      });

      for await (const event of chatService.sendMessage({
        sessionId: id,
        userId,
        content: body.content
      })) {
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
        if (event.type === "error" || event.type === "done") {
          break;
        }
      }

      reply.raw.end();
      return reply;
    }
  );
};
