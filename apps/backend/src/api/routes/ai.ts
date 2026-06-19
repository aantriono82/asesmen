import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate, requireAdmin, requireTeacher } from "@api/middleware/auth";
import { parseBody } from "@api/validators/zod";
import { AIProviderRegistry } from "@infra/ai/ai-provider.registry";
import { PgRateLimiter, rateLimitPolicies } from "@infra/rate-limit/pg-rate-limiter";

const registry = new AIProviderRegistry();

const switchProviderSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google", "deepseek"])
});

export const aiRoutes: FastifyPluginAsync = async (fastify) => {
  const rateLimiter = new PgRateLimiter();

  fastify.get("/ai/providers", { preHandler: [authenticate, requireTeacher] }, async (_request, reply) => {
    await rateLimiter.consume(_request, reply, rateLimitPolicies.ai);
    const providers = await registry.list();
    return reply.success(providers, "Daftar AI provider", "AI_PROVIDERS_LIST");
  });

  fastify.get("/ai/providers/active", { preHandler: [authenticate, requireTeacher] }, async (_request, reply) => {
    await rateLimiter.consume(_request, reply, rateLimitPolicies.ai);
    const provider = await registry.getActiveProvider();
    return reply.success(
      {
        name: provider.name,
        model: provider.model,
        available: await provider.isAvailable()
      },
      "Provider aktif",
      "AI_PROVIDER_ACTIVE"
    );
  });

  fastify.put("/ai/providers/active", { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    await rateLimiter.consume(request, reply, rateLimitPolicies.ai);
    const body = parseBody(request, switchProviderSchema);
    const result = await registry.setActiveProvider(body.provider);
    return reply.success(result, "Provider aktif diperbarui", "AI_PROVIDER_UPDATED");
  });
};
