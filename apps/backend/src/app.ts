import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import Fastify from "fastify";
import { pool } from "@infra/database/connection";
import { responsePlugin } from "@api/plugins/response";
import { registerErrorHandler } from "@api/plugins/error-handler";
import { PgRateLimitStore } from "@api/plugins/rate-limit-store";
import { registerRequestLogger } from "@api/middleware/request-logger";
import { adminRoutes } from "@api/routes/admin";
import { assessmentRoutes } from "@api/routes/assessments";
import { aiRoutes } from "@api/routes/ai";
import { authRoutes } from "@api/routes/auth";
import { chatRoutes } from "@api/routes/chat";
import { curriculumRoutes } from "@api/routes/curricula";
import { documentRoutes } from "@api/routes/documents";
import { exportRoutes } from "@api/routes/export";
import { healthRoutes } from "@api/routes/health";
import { knowledgeRoutes } from "@api/routes/knowledge";
import { metricsRoutes } from "@api/routes/metrics";
import { notificationRoutes } from "@api/routes/notifications";
import { questionBankRoutes } from "@api/routes/question-bank";
import { skillRoutes } from "@api/routes/skills";
import { usageRoutes } from "@api/routes/usage";
import { workflowRoutes } from "@api/routes/workflows";
import { initSentry } from "@infra/monitoring/sentry";
import { env } from "@lib/env";

export async function buildApp() {
  const fastify = Fastify({
    maxParamLength: 2048,
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "password",
          "refreshToken",
          "token",
          "api_key",
          "apiKey"
        ],
        censor: "[REDACTED]"
      }
    }
  });
  initSentry();

  registerErrorHandler(fastify);
  registerRequestLogger(fastify);

  PgRateLimitStore.configure(pool, 60_000);
  await PgRateLimitStore.init(pool);

  await fastify.register(sensible);
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        fontSrc: ["'self'", "data:"],
        connectSrc: ["'self'"]
      }
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: "deny" },
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
  });
  const fastifyMultipart = (await import("@fastify/multipart")).default;
  await fastify.register(fastifyMultipart, {
    attachFieldsToBody: false,
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 5
    }
  });
  await fastify.register(cors, {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed"), false);
    },
    credentials: true
  });
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    store: PgRateLimitStore
  });
  await fastify.register(responsePlugin);

  await fastify.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(authRoutes);
      await api.register(aiRoutes);
      await api.register(chatRoutes);
      await api.register(skillRoutes);
      await api.register(usageRoutes);
      await api.register(workflowRoutes);
      await api.register(notificationRoutes);
      await api.register(assessmentRoutes);
      await api.register(questionBankRoutes);
      await api.register(curriculumRoutes);
      await api.register(documentRoutes);
      await api.register(exportRoutes);
      await api.register(knowledgeRoutes);
      await api.register(adminRoutes);
      await api.register(metricsRoutes);
    },
    { prefix: "/api" }
  );

  return fastify;
}

function isAllowedOrigin(origin: string): boolean {
  if (origin === env.FRONTEND_URL) {
    return true;
  }

  if (env.NODE_ENV !== "production") {
    return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  }

  return false;
}
