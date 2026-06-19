import { eq } from "drizzle-orm";
import type {
  CreateSessionInput,
  SessionEntity,
  SessionRepository
} from "@domain/repositories/session-repository";
import { db } from "@infra/database/client";
import { sessions } from "@infra/database/schema";

export class DrizzleSessionRepository implements SessionRepository {
  public async create(input: CreateSessionInput): Promise<SessionEntity> {
    const [created] = await db
      .insert(sessions)
      .values({
        sessionId: input.sessionId,
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create session");
    }

    return created;
  }

  public async findByTokenHash(tokenHash: string): Promise<SessionEntity | null> {
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.tokenHash, tokenHash)
    });

    return session ?? null;
  }

  public async findBySessionId(sessionId: string): Promise<SessionEntity | null> {
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.sessionId, sessionId)
    });

    return session ?? null;
  }

  public async deleteByTokenHash(tokenHash: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }

  public async deleteBySessionId(sessionId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.sessionId, sessionId));
  }

  public async deleteByUserId(userId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }
}
