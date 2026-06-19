import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyReply } from "fastify";
import type { ApiResponse } from "@api/types";

declare module "fastify" {
  interface FastifyReply {
    success<T>(data: T, message?: string, code?: string): FastifyReply;
  }
}

export const responsePlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.decorateReply("success", function success<T>(
    this: FastifyReply,
    data: T,
    message = "Success",
    code = "SUCCESS"
  ) {
    const payload: ApiResponse<T> = {
      success: true,
      message,
      data,
      code
    };

    return this.send(payload);
  });
});
