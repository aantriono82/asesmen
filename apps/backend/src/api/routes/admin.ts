import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { SyncSkillsUseCase } from "@app/use-cases/skill-use-cases";
import { authenticate, requireAdmin } from "@api/middleware/auth";
import { parseParams, parseQuery } from "@api/validators/zod";
import { AuditService } from "@infra/audit/audit.service";
import { db } from "@infra/database/client";
import { assessments, chatSessions, documents, rateLimits, skillExecutions, skills, tokenUsage, users } from "@infra/database/schema";
import { queueHealthCheck } from "@infra/queue/queue";
import { activeChatSessions } from "@infra/monitoring/metrics";
import { DrizzleSkillRepository } from "@infra/repositories/drizzle-skill-repository";

const auditService = new AuditService();
const skillRepository = new DrizzleSkillRepository();

const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  action: z.enum(["LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE", "EXECUTE"]).optional(),
  userId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

const hardDeleteParamsSchema = z.object({
  entity: z.enum(["users", "skills", "documents", "skill-executions"]),
  id: z.string().uuid()
});

const updateUserParamsSchema = z.object({
  id: z.string().uuid()
});

const updateUserBodySchema = z.object({
  role: z.enum(["admin", "teacher"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional()
});

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/admin/summary", { preHandler: [authenticate, requireAdmin] }, async (_request, reply) => {
    const [userCount, assessmentCount, documentCount, tokenSummary, recentErrors, recentUsers, dbStatus, queueStatus, chatCount] =
      await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(users),
        db.select({ count: sql<number>`count(*)` }).from(assessments),
        db.select({ count: sql<number>`count(*)` }).from(documents),
        db.select({
          tokens: sql<number>`coalesce(sum(${tokenUsage.tokensIn} + ${tokenUsage.tokensOut}), 0)`
        }).from(tokenUsage),
        db
          .select({ id: skillExecutions.id, error: skillExecutions.error, createdAt: skillExecutions.createdAt })
          .from(skillExecutions)
          .where(sql`${skillExecutions.error} is not null`)
          .orderBy(desc(skillExecutions.createdAt))
          .limit(5),
        db.select().from(users).orderBy(desc(users.createdAt)).limit(5),
        db.execute(sql`select 1`),
        queueHealthCheck(),
        db.select({ count: sql<number>`count(*)` }).from(chatSessions)
      ]);
    activeChatSessions.set(Number(chatCount[0]?.count ?? 0));
    return reply.success(
      {
        totals: {
          users: Number(userCount[0]?.count ?? 0),
          assessments: Number(assessmentCount[0]?.count ?? 0),
          documents: Number(documentCount[0]?.count ?? 0),
          tokensToday: Number(tokenSummary[0]?.tokens ?? 0)
        },
        systemHealth: {
          database: dbStatus ? "ok" : "error",
          queue: queueStatus
        },
        recentErrors,
        recentUsers
      },
      "Ringkasan admin",
      "ADMIN_SUMMARY"
    );
  });

  fastify.get("/admin/metrics/overview", { preHandler: [authenticate, requireAdmin] }, async (_request, reply) => {
    const [requestsByStatus, queueDepth, rateLimitKeys] = await Promise.all([
      db
        .select({
          status: skillExecutions.status,
          count: sql<number>`count(*)`
        })
        .from(skillExecutions)
        .groupBy(skillExecutions.status),
      Promise.all([
        db.execute(sql`select count(*)::int as pending from pgboss.job where state = 'created'`),
        db.execute(sql`select count(*)::int as active from pgboss.job where state = 'active'`)
      ]),
      db.select({ count: sql<number>`count(*)` }).from(rateLimits)
    ]);

    return reply.success(
      {
        skillExecutions: requestsByStatus,
        queueDepth: {
          pending: Number((queueDepth[0].rows[0] as { pending?: number } | undefined)?.pending ?? 0),
          active: Number((queueDepth[1].rows[0] as { active?: number } | undefined)?.active ?? 0)
        },
        activeRateLimitKeys: Number(rateLimitKeys[0]?.count ?? 0)
      },
      "Metrik admin",
      "ADMIN_METRICS"
    );
  });

  fastify.get("/admin/users", { preHandler: [authenticate, requireAdmin] }, async (_request, reply) => {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return reply.success(rows, "Daftar user", "ADMIN_USERS_LIST");
  });

  fastify.patch("/admin/users/:id", { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const { id } = parseParams(request, updateUserParamsSchema);
    const body = request.body as Record<string, unknown>;
    const parsed = updateUserBodySchema.parse(body);
    const patch: Record<string, unknown> = {};
    if (parsed.role) {
      patch.role = parsed.role;
    }
    if (typeof parsed.isActive === "boolean") {
      patch.isActive = parsed.isActive;
    }
    if (parsed.password) {
      patch.passwordHash = await bcrypt.hash(parsed.password, 12);
    }
    const [updated] = await db.update(users).set(patch).where(eq(users.id, id)).returning();
    return reply.success(updated ?? null, "User diperbarui", "ADMIN_USER_UPDATED");
  });

  fastify.get("/admin/audit-logs", { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const query = parseQuery(request, auditLogQuerySchema);
    const result = await auditService.list({
      ...(query.action ? { action: query.action } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.startDate ? { startDate: query.startDate } : {}),
      ...(query.endDate ? { endDate: query.endDate } : {}),
      ...(query.page ? { page: query.page } : {}),
      ...(query.limit ? { limit: query.limit } : {})
    });

    return reply.success(result, "Daftar audit log", "AUDIT_LOGS_LIST");
  });

  fastify.post("/admin/skills/sync", { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const useCase = new SyncSkillsUseCase(skillRepository);
    const synced = await useCase.execute();

    void auditService
      .log({
        action: "UPDATE",
        entityType: "skill",
        description: "Admin sync skill",
        metadata: { total: synced.length },
        ...(request.user?.id ? { userId: request.user.id } : {}),
        request
      })
      .catch((error: unknown) => {
        request.log.error({ error }, "audit log sync failed");
      });

    return reply.success({ total: synced.length, items: synced }, "Sinkronisasi skill selesai", "SKILLS_SYNCED");
  });

  fastify.delete("/admin/:entity/:id/hard", { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const { entity, id } = parseParams(request, hardDeleteParamsSchema);

    if (entity === "users") {
      await db.delete(users).where(eq(users.id, id));
    } else if (entity === "skills") {
      await db.delete(skills).where(eq(skills.id, id));
    } else if (entity === "documents") {
      await db.delete(documents).where(eq(documents.id, id));
    } else {
      await db.delete(skillExecutions).where(eq(skillExecutions.id, id));
    }

    void auditService
      .log({
        action: "DELETE",
        entityType: entity,
        entityId: id,
        description: `Hard delete ${entity}`,
        ...(request.user?.id ? { userId: request.user.id } : {}),
        request
      })
      .catch((error: unknown) => {
        request.log.error({ error }, "audit log hard delete failed");
      });

    return reply.success({ deleted: true }, "Hard delete berhasil", "ADMIN_HARD_DELETE");
  });
};
