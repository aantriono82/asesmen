import { eq, lt } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "@infra/database/client";
import { rateLimits } from "@infra/database/schema";
import { AppError } from "@lib/errors";

export interface RateLimitPolicy {
  name: string;
  limit: number;
  windowMs: number;
  scope: "ip" | "user";
}

export class PgRateLimiter {
  public async consume(request: FastifyRequest, reply: FastifyReply, policy: RateLimitPolicy): Promise<void> {
    const identifier = policy.scope === "user" ? request.user?.id ?? request.ip : request.ip;
    const key = `${policy.name}:${identifier}`;
    const now = new Date();
    const windowStart = new Date(now.getTime() - policy.windowMs);
    const existing = await db.query.rateLimits.findFirst({
      where: eq(rateLimits.key, key)
    });

    if (!existing || existing.windowStart < windowStart) {
      await db
        .insert(rateLimits)
        .values({
          key,
          count: 1,
          windowStart: now
        })
        .onConflictDoUpdate({
          target: rateLimits.key,
          set: {
            count: 1,
            windowStart: now,
            updatedAt: now
          }
        });
      this.setHeaders(reply, policy.limit, policy.limit - 1);
      return;
    }

    if (existing.count >= policy.limit) {
      throw new AppError("Terlalu banyak request", "RATE_LIMITED", 429);
    }

    await db
      .update(rateLimits)
      .set({
        count: existing.count + 1,
        updatedAt: now
      })
      .where(eq(rateLimits.key, key));
    this.setHeaders(reply, policy.limit, Math.max(policy.limit - existing.count - 1, 0));
  }

  public async cleanup(expiredBefore: Date): Promise<number> {
    const deleted = await db.delete(rateLimits).where(lt(rateLimits.windowStart, expiredBefore)).returning({ key: rateLimits.key });
    return deleted.length;
  }

  private setHeaders(reply: FastifyReply, limit: number, remaining: number): void {
    if (typeof reply.header !== "function") {
      return;
    }

    reply.header("X-RateLimit-Limit", String(limit));
    reply.header("X-RateLimit-Remaining", String(remaining));
  }
}

export const rateLimitPolicies = {
  public: { name: "public", limit: 20, windowMs: 60_000, scope: "ip" },
  auth: { name: "auth", limit: 5, windowMs: 60_000, scope: "ip" },
  ai: { name: "ai", limit: 10, windowMs: 60_000, scope: "user" },
  upload: { name: "upload", limit: 5, windowMs: 60_000, scope: "user" },
  export: { name: "export", limit: 10, windowMs: 60_000, scope: "user" }
} as const satisfies Record<string, RateLimitPolicy>;

export async function cleanupRateLimitRecords(): Promise<number> {
  return new PgRateLimiter().cleanup(new Date(Date.now() - 24 * 60 * 60 * 1000));
}
