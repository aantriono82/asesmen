import type { FastifyPluginAsync } from "fastify";
import { authenticate, requireAdmin } from "@api/middleware/auth";
import { metricsRegistry } from "@infra/monitoring/metrics";

export const metricsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/metrics", { preHandler: [authenticate, requireAdmin] }, async (_request, reply) => {
    reply.header("Content-Type", metricsRegistry.contentType);
    return reply.send(await metricsRegistry.metrics());
  });
};
