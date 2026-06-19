import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { captureServerError } from "@infra/monitoring/sentry";
import { AppError } from "@lib/errors";

export function registerErrorHandler(fastify: FastifyInstance): void {
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        message: "Validasi request gagal",
        data: { issues: error.issues },
        code: "VALIDATION_ERROR"
      });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        message: error.message,
        data: null,
        code: error.code
      });
    }

    request.log.error({ error }, "Unhandled error");
    captureServerError(error, {
      requestId: request.id,
      ...(request.user?.id ? { userId: request.user.id } : {}),
      ...(request.user?.email ? { email: request.user.email } : {})
    });
    return reply.status(500).send({
      success: false,
      message: "Internal server error",
      data: null,
      code: "INTERNAL_SERVER_ERROR"
    });
  });
}
