import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { httpRequestDurationSeconds, httpRequestsTotal } from "@infra/monitoring/metrics";

export function registerRequestLogger(fastify: FastifyInstance): void {
  fastify.addHook("onRequest", async (request) => {
    request.startTime = Date.now();
    request.requestId = request.headers["x-request-id"]?.toString() ?? randomUUID();
    request.log = request.log.child({
      request_id: request.requestId,
      user_id: request.user?.id
    });
  });

  fastify.addHook("onResponse", async (request, reply) => {
    const durationMs = Date.now() - request.startTime;
    const path = request.routerPath ?? request.url;
    const status = String(reply.statusCode);
    httpRequestsTotal.inc({ method: request.method, path, status });
    httpRequestDurationSeconds.observe({ method: request.method, path, status }, durationMs / 1000);
    reply.header("X-Request-ID", request.requestId);
    request.log.info(
      {
        timestamp: new Date().toISOString(),
        level: "info",
        service: "backend",
        request_id: request.requestId,
        user_id: request.user?.id ?? null,
        method: request.method,
        path,
        status: reply.statusCode,
        durationMs
      },
      "request completed"
    );
  });
}

declare module "fastify" {
  interface FastifyRequest {
    startTime: number;
    requestId: string;
  }
}
