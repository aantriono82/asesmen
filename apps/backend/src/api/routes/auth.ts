import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  GetCurrentUserUseCase,
  LoginUserUseCase,
  LogoutUseCase,
  RevokeSessionsUseCase,
  RefreshTokenUseCase,
  RegisterUserUseCase
} from "@app/use-cases/auth-use-cases";
import {
  loginInputSchema,
  logoutInputSchema,
  refreshInputSchema,
  registerInputSchema
} from "@app/dto/auth-dto";
import { DrizzleSessionRepository } from "@infra/repositories/drizzle-session-repository";
import { DrizzleUserRepository } from "@infra/repositories/drizzle-user-repository";
import { JwtTokenService } from "@infra/auth/jwt-token-service";
import { AuditService } from "@infra/audit/audit.service";
import { authenticate } from "@api/middleware/auth";
import { parseBody } from "@api/validators/zod";
import { PgRateLimiter, rateLimitPolicies } from "@infra/rate-limit/pg-rate-limiter";

const users = new DrizzleUserRepository();
const sessions = new DrizzleSessionRepository();
const tokens = new JwtTokenService();
const auditService = new AuditService();
const rateLimiter = new PgRateLimiter();

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/auth/register", async (request, reply) => {
    await rateLimiter.consume(request, reply, rateLimitPolicies.auth);
    const input = parseBody(request, registerInputSchema);
    const useCase = new RegisterUserUseCase(users, sessions, tokens);
    const result = await useCase.execute(input, {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"]
    });
    setRefreshCookie(reply, result.tokens.refreshToken);
    void auditService
      .log({
        userId: result.user.id,
        action: "CREATE",
        entityType: "user",
        entityId: result.user.id,
        description: "Register user baru",
        metadata: { email: result.user.email },
        request
      })
      .catch((error: unknown) => {
        request.log.error({ error }, "audit log register failed");
      });

    return reply.status(201).success(result, "Registrasi berhasil", "AUTH_REGISTERED");
  });

  fastify.post("/auth/login", async (request, reply) => {
    await rateLimiter.consume(request, reply, rateLimitPolicies.auth);
    const input = parseBody(request, loginInputSchema);
    const useCase = new LoginUserUseCase(users, sessions, tokens);
    try {
      const result = await useCase.execute(input, {
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"]
      });
      setRefreshCookie(reply, result.tokens.refreshToken);
      void auditService
        .log({
          userId: result.user.id,
          action: "LOGIN",
          entityType: "user",
          entityId: result.user.id,
          description: "Login berhasil",
          metadata: { email: result.user.email },
          request
        })
        .catch((error: unknown) => {
          request.log.error({ error }, "audit log login success failed");
        });

      return reply.success(result, "Login berhasil", "AUTH_LOGGED_IN");
    } catch (error) {
      void auditService
        .log({
          action: "LOGIN",
          entityType: "user",
          description: "Login gagal",
          metadata: { email: input.email },
          request
        })
        .catch((auditError: unknown) => {
          request.log.error({ auditError }, "audit log login failed failed");
        });
      throw error;
    }
  });

  fastify.post("/auth/logout", async (request, reply) => {
    await rateLimiter.consume(request, reply, rateLimitPolicies.auth);
    const input = resolveTokenInput(parseBody(request, logoutInputSchema), request);
    const useCase = new LogoutUseCase(sessions, tokens);
    await useCase.execute(input);
    clearRefreshCookie(reply);
    const refreshPayload = await tokens.verifyRefreshToken(input.refreshToken).catch(() => null);
    void auditService
      .log({
        action: "LOGOUT",
        entityType: "user",
        description: "Logout berhasil",
        ...(refreshPayload?.sub ? { userId: refreshPayload.sub, entityId: refreshPayload.sub } : {}),
        request
      })
      .catch((error: unknown) => {
        request.log.error({ error }, "audit log logout failed");
      });

    return reply.success({ loggedOut: true }, "Logout berhasil", "AUTH_LOGGED_OUT");
  });

  fastify.post("/auth/refresh", async (request, reply) => {
    await rateLimiter.consume(request, reply, rateLimitPolicies.auth);
    const input = resolveTokenInput(parseBody(request, refreshInputSchema), request);
    const useCase = new RefreshTokenUseCase(users, sessions, tokens);
    const result = await useCase.execute(input, {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"]
    });
    setRefreshCookie(reply, result.refreshToken);

    return reply.success(result, "Token diperbarui", "AUTH_REFRESHED");
  });

  fastify.post("/auth/revoke", { preHandler: [authenticate] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    await new RevokeSessionsUseCase(sessions).execute(userId);
    clearRefreshCookie(reply);
    await auditService.log({
      userId,
      action: "LOGOUT",
      entityType: "session",
      description: "Revoke semua session user",
      request
    });
    return reply.success({ revoked: true }, "Semua session dicabut", "AUTH_REVOKED");
  });

  fastify.get("/auth/me", { preHandler: [authenticate] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const useCase = new GetCurrentUserUseCase(users);
    const user = await useCase.execute(userId);

    return reply.success(user, "User aktif", "AUTH_ME");
  });
};

function resolveTokenInput<T extends { refreshToken: string }>(input: T, request: FastifyRequest): T {
  const cookieToken = readCookie(request.headers.cookie, "refresh_token");
  if (cookieToken) {
    return { ...input, refreshToken: cookieToken };
  }

  return input;
}

function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}

function setRefreshCookie(reply: FastifyReply, token: string): void {
  reply.header(
    "Set-Cookie",
    `refresh_token=${encodeURIComponent(token)}; HttpOnly; Path=/api/auth; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );
}

function clearRefreshCookie(reply: FastifyReply): void {
  reply.header("Set-Cookie", "refresh_token=; HttpOnly; Path=/api/auth; Max-Age=0; SameSite=Lax");
}
