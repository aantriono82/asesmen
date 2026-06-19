import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
  TokenService
} from "@app/interfaces/token-service";
import { UnauthorizedError } from "@lib/errors";
import { env } from "@lib/env";

export class JwtTokenService implements TokenService {
  public async signAccessToken(payload: AccessTokenPayload): Promise<string> {
    const expiresIn = env.JWT_ACCESS_EXPIRES_IN as NonNullable<SignOptions["expiresIn"]>;
    const options: SignOptions = { expiresIn };
    return jwt.sign(payload, env.JWT_SECRET, options);
  }

  public async signRefreshToken(payload: RefreshTokenPayload): Promise<string> {
    const expiresIn = env.JWT_REFRESH_EXPIRES_IN as NonNullable<SignOptions["expiresIn"]>;
    const options: SignOptions = { expiresIn };
    return jwt.sign(payload, env.JWT_SECRET, options);
  }

  public async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      if (!isAccessTokenPayload(decoded)) {
        throw new UnauthorizedError("Invalid access token");
      }

      return decoded;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError("Invalid access token");
    }
  }

  public async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      if (!isRefreshTokenPayload(decoded)) {
        throw new UnauthorizedError("Invalid refresh token");
      }

      return decoded;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError("Invalid refresh token");
    }
  }

  public hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}

function isAccessTokenPayload(value: unknown): value is AccessTokenPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return (
    typeof payload.sub === "string" &&
    typeof payload.email === "string" &&
    (payload.role === "admin" || payload.role === "teacher")
  );
}

function isRefreshTokenPayload(value: unknown): value is RefreshTokenPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return typeof payload.sub === "string" && typeof payload.sid === "string";
}
