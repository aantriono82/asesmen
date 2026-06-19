import type { FastifyPluginAsync } from "fastify";
import { databaseHealthCheck } from "@infra/database/client";
import { queueHealthCheck } from "@infra/queue/queue";

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/health", async (_request, reply) => {
    const [database, queue] = await Promise.all([databaseHealthCheck(), queueHealthCheck()]);
    const status = database === "ok" && queue === "ok" ? "ok" : "degraded";

    return reply.success(
      {
        status,
        timestamp: new Date().toISOString(),
        services: {
          database,
          queue
        }
      },
      "Health check completed"
    );
  });
};
