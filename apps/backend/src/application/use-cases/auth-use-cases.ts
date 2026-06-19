import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import type { PublicUser } from "@domain/entities/user";
import { toPublicUser } from "@domain/entities/user";
import type { SessionRepository } from "@domain/repositories/session-repository";
import type { UserRepository } from "@domain/repositories/user-repository";
import type { LoginInput, LogoutInput, RefreshInput, RegisterInput } from "@app/dto/auth-dto";
import type { TokenPair, TokenService } from "@app/interfaces/token-service";
import { AppError, UnauthorizedError } from "@lib/errors";
import { env } from "@lib/env";

export interface AuthContext {
  ipAddress: string | undefined;
  userAgent: string | undefined;
}

export interface AuthResult {
  user: PublicUser;
  tokens: TokenPair;
}

export class RegisterUserUseCase {
  public constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly tokens: TokenService
  ) {}

  public async execute(input: RegisterInput, context: AuthContext): Promise<AuthResult> {
    const email = input.email.toLowerCase();
    const existing = await this.users.findByEmail(email);

    if (existing) {
      throw new AppError("Email sudah terdaftar", "EMAIL_ALREADY_REGISTERED", 409);
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.users.create({
      name: input.name,
      email,
      passwordHash,
      role: "teacher"
    });

    const tokenPair = await this.createTokenPair(user, context);
    return { user: toPublicUser(user), tokens: tokenPair };
  }

  private async createTokenPair(
    user: Parameters<typeof toPublicUser>[0],
    context: AuthContext
  ): Promise<TokenPair> {
    const sessionId = randomUUID();
    const accessToken = await this.tokens.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role
    });
    const refreshToken = await this.tokens.signRefreshToken({ sub: user.id, sid: sessionId });

    await this.sessions.create({
      sessionId,
      userId: user.id,
      tokenHash: this.tokens.hashToken(refreshToken),
      expiresAt: expiresAtFromDuration(env.JWT_REFRESH_EXPIRES_IN),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return { accessToken, refreshToken };
  }
}

export class LoginUserUseCase {
  public constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly tokens: TokenService
  ) {}

  public async execute(input: LoginInput, context: AuthContext): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email.toLowerCase());

    if (!user || !user.isActive) {
      throw new UnauthorizedError("Email atau password tidak valid");
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedError("Email atau password tidak valid");
    }

    const sessionId = randomUUID();
    const accessToken = await this.tokens.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role
    });
    const refreshToken = await this.tokens.signRefreshToken({ sub: user.id, sid: sessionId });

    await this.sessions.create({
      sessionId,
      userId: user.id,
      tokenHash: this.tokens.hashToken(refreshToken),
      expiresAt: expiresAtFromDuration(env.JWT_REFRESH_EXPIRES_IN),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return {
      user: toPublicUser(user),
      tokens: { accessToken, refreshToken }
    };
  }
}

export class RefreshTokenUseCase {
  public constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly tokens: TokenService
  ) {}

  public async execute(input: RefreshInput, context: AuthContext): Promise<TokenPair> {
    const payload = await this.tokens.verifyRefreshToken(input.refreshToken);
    const tokenHash = this.tokens.hashToken(input.refreshToken);
    const session = await this.sessions.findByTokenHash(tokenHash);

    if (!session || session.userId !== payload.sub || session.expiresAt <= new Date() || session.sessionId !== payload.sid) {
      throw new UnauthorizedError("Refresh token tidak valid");
    }

    const user = await this.users.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedError("User tidak aktif");
    }

    const accessToken = await this.tokens.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role
    });
    const newSessionId = randomUUID();
    const refreshToken = await this.tokens.signRefreshToken({ sub: user.id, sid: newSessionId });
    await this.sessions.deleteBySessionId(session.sessionId);
    await this.sessions.create({
      sessionId: newSessionId,
      userId: user.id,
      tokenHash: this.tokens.hashToken(refreshToken),
      expiresAt: expiresAtFromDuration(env.JWT_REFRESH_EXPIRES_IN),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return { accessToken, refreshToken };
  }
}

export class LogoutUseCase {
  public constructor(
    private readonly sessions: SessionRepository,
    private readonly tokens: TokenService
  ) {}

  public async execute(input: LogoutInput): Promise<void> {
    await this.sessions.deleteByTokenHash(this.tokens.hashToken(input.refreshToken));
  }
}

export class RevokeSessionsUseCase {
  public constructor(private readonly sessions: SessionRepository) {}

  public async execute(userId: string): Promise<void> {
    await this.sessions.deleteByUserId(userId);
  }
}

export class GetCurrentUserUseCase {
  public constructor(private readonly users: UserRepository) {}

  public async execute(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError("User tidak ditemukan");
    }

    return toPublicUser(user);
  }
}

function expiresAtFromDuration(duration: string): Date {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  const amount = Number(match[1] ?? 7);
  const unit = match[2] ?? "d";
  const multiplier = unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  return new Date(Date.now() + amount * multiplier);
}
