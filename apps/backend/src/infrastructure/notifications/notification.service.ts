import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@infra/database/client";
import { notifications, type Notification } from "@infra/database/schema";
import { resolvePagination, toPaginatedResult, type PaginatedResult } from "@lib/pagination";

export type NotificationType = "skill_completed" | "skill_failed" | "document_processed" | "system";

interface CreateNotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

function isDatabaseSchemaError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as { code?: unknown };
  return candidate.code === "42P01" || candidate.code === "42703";
}

export class NotificationService {
  public async create(options: CreateNotificationOptions): Promise<void> {
    try {
      await db.insert(notifications).values({
        userId: options.userId,
        type: options.type,
        title: options.title,
        message: options.message ?? null,
        metadata: options.metadata ?? {}
      });
    } catch (error: unknown) {
      if (isDatabaseSchemaError(error)) {
        return;
      }

      throw error;
    }
  }

  public async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
    } catch (error: unknown) {
      if (isDatabaseSchemaError(error)) {
        return;
      }

      throw error;
    }
  }

  public async markAllAsRead(userId: string): Promise<void> {
    try {
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
    } catch (error: unknown) {
      if (isDatabaseSchemaError(error)) {
        return;
      }

      throw error;
    }
  }

  public async getUnreadCount(userId: string): Promise<number> {
    try {
      const result = await db
        .select({ value: count() })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

      return result[0]?.value ?? 0;
    } catch (error: unknown) {
      void error;
      return 0;
    }
  }

  public async list(userId: string, page?: number, limit?: number): Promise<PaginatedResult<Notification>> {
    const pagination = resolvePagination(page, limit);
    try {
      const [items, totalResult] = await Promise.all([
        db.query.notifications.findMany({
          where: eq(notifications.userId, userId),
          orderBy: [desc(notifications.createdAt)],
          limit: pagination.limit,
          offset: (pagination.page - 1) * pagination.limit
        }),
        db.select({ value: count() }).from(notifications).where(eq(notifications.userId, userId))
      ]);

      return toPaginatedResult(items, totalResult[0]?.value ?? 0, pagination);
    } catch (error: unknown) {
      void error;
      return toPaginatedResult([], 0, pagination);
    }
  }

  public async latest(userId: string, limit = 5): Promise<Notification[]> {
    try {
      return await db.query.notifications.findMany({
        where: eq(notifications.userId, userId),
        orderBy: [desc(notifications.createdAt)],
        limit
      });
    } catch (error: unknown) {
      void error;
      return [];
    }
  }

  public async delete(notificationId: string, userId: string): Promise<void> {
    try {
      await db.delete(notifications).where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
    } catch (error: unknown) {
      if (isDatabaseSchemaError(error)) {
        return;
      }

      throw error;
    }
  }
}
