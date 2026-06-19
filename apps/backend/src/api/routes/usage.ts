import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate, requireTeacher } from "@api/middleware/auth";
import { parseQuery } from "@api/validators/zod";
import { DrizzleTokenUsageRepository } from "@infra/repositories/drizzle-token-usage-repository";

const usageRepository = new DrizzleTokenUsageRepository();

const usageHistoryQuerySchema = z.object({
  sessionId: z.string().uuid().optional()
});

export const usageRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/usage/summary", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const now = new Date();
    const fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
    const summary = await usageRepository.getMonthlySummary(userId, fromDate);

    return reply.success(summary, "Ringkasan token bulan ini", "USAGE_SUMMARY");
  });

  fastify.get("/usage/history", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const query = parseQuery(request, usageHistoryQuerySchema);
    const history = await usageRepository.getHistoryBySession(userId, query.sessionId);

    return reply.success(history, "Riwayat token usage", "USAGE_HISTORY");
  });
};
