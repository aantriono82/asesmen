import type { FastifyRequest } from "fastify";
import type { z } from "zod";

export function parseBody<TSchema extends z.ZodType>(request: FastifyRequest, schema: TSchema): z.infer<TSchema> {
  return schema.parse(request.body);
}

export function parseParams<TSchema extends z.ZodType>(request: FastifyRequest, schema: TSchema): z.infer<TSchema> {
  return schema.parse(request.params);
}

export function parseQuery<TSchema extends z.ZodType>(request: FastifyRequest, schema: TSchema): z.infer<TSchema> {
  return schema.parse(request.query);
}
