import type { FastifyRequest } from "fastify";
import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@infra/database/client";
import { auditLogs, type AuditLog } from "@infra/database/schema";
import { resolvePagination, toPaginatedResult, type PaginatedResult } from "@lib/pagination";

export type AuditAction = "LOGIN" | "LOGOUT" | "CREATE" | "UPDATE" | "DELETE" | "EXECUTE";

interface LogOptions {
  userId?: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  request?: FastifyRequest;
}

interface ListAuditLogsOptions {
  action?: AuditAction;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export class AuditService {
  public async log(options: LogOptions): Promise<void> {
    await db.insert(auditLogs).values({
      userId: options.userId ?? null,
      action: options.action,
      entityType: options.entityType ?? null,
      entityId: options.entityId ?? null,
      description: options.description,
      metadata: options.metadata ?? {},
      ipAddress: options.request?.ip ?? null,
      userAgent: options.request?.headers["user-agent"] ?? null
    });
  }

  public async list(options: ListAuditLogsOptions): Promise<PaginatedResult<AuditLog>> {
    const pagination = resolvePagination(options.page, options.limit);
    try {
      const conditions = [
        options.action ? eq(auditLogs.action, options.action) : undefined,
        options.userId ? eq(auditLogs.userId, options.userId) : undefined,
        options.startDate ? gte(auditLogs.createdAt, new Date(options.startDate)) : undefined,
        options.endDate ? lte(auditLogs.createdAt, new Date(options.endDate)) : undefined
      ].filter(Boolean);

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const [items, totalResult] = await Promise.all([
        db.query.auditLogs.findMany({
          where,
          orderBy: [desc(auditLogs.createdAt)],
          limit: pagination.limit,
          offset: (pagination.page - 1) * pagination.limit
        }),
        db.select({ value: count() }).from(auditLogs).where(where)
      ]);

      return toPaginatedResult(items, totalResult[0]?.value ?? 0, pagination);
    } catch (error: unknown) {
      void error;
      return toPaginatedResult([], 0, pagination);
    }
  }
}
