import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate } from "@api/middleware/auth";
import { parseParams, parseQuery } from "@api/validators/zod";
import { NotificationService } from "@infra/notifications/notification.service";

const notificationService = new NotificationService();

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional()
});

const notificationParamsSchema = z.object({
  id: z.string().uuid()
});

export const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/notifications", { preHandler: [authenticate] }, async (request, reply) => {
    const { page, limit } = parseQuery(request, paginationSchema);
    const userId = z.string().uuid().parse(request.user?.id);
    const notifications = await notificationService.list(userId, page, limit);

    return reply.success(notifications, "Daftar notifikasi", "NOTIFICATIONS_LIST");
  });

  fastify.get("/notifications/latest", { preHandler: [authenticate] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const items = await notificationService.latest(userId, 5);

    return reply.success(items, "Notifikasi terbaru", "NOTIFICATIONS_LATEST");
  });

  fastify.get("/notifications/unread-count", { preHandler: [authenticate] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const unreadCount = await notificationService.getUnreadCount(userId);

    return reply.success({ unreadCount }, "Jumlah notifikasi belum dibaca", "NOTIFICATIONS_UNREAD_COUNT");
  });

  fastify.put("/notifications/:id/read", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = parseParams(request, notificationParamsSchema);
    const userId = z.string().uuid().parse(request.user?.id);

    await notificationService.markAsRead(id, userId);
    return reply.success({ updated: true }, "Notifikasi ditandai dibaca", "NOTIFICATION_READ");
  });

  fastify.put("/notifications/read-all", { preHandler: [authenticate] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);

    await notificationService.markAllAsRead(userId);
    return reply.success({ updated: true }, "Semua notifikasi ditandai dibaca", "NOTIFICATIONS_READ_ALL");
  });

  fastify.delete("/notifications/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = parseParams(request, notificationParamsSchema);
    const userId = z.string().uuid().parse(request.user?.id);

    await notificationService.delete(id, userId);
    return reply.success({ deleted: true }, "Notifikasi dihapus", "NOTIFICATION_DELETED");
  });
};
