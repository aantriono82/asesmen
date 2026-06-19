export interface SessionEntity {
  id: string;
  sessionId: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSessionInput {
  sessionId: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  ipAddress: string | undefined;
  userAgent: string | undefined;
}

export interface SessionRepository {
  create(input: CreateSessionInput): Promise<SessionEntity>;
  findBySessionId(sessionId: string): Promise<SessionEntity | null>;
  findByTokenHash(tokenHash: string): Promise<SessionEntity | null>;
  deleteByTokenHash(tokenHash: string): Promise<void>;
  deleteBySessionId(sessionId: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}
