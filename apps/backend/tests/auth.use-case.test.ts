import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionRepository } from "../src/domain/repositories/session-repository";
import type { UserRepository } from "../src/domain/repositories/user-repository";
import type { TokenService } from "../src/application/interfaces/token-service";
import { LoginUserUseCase } from "../src/application/use-cases/auth-use-cases";

const { compareMock } = vi.hoisted(() => ({
  compareMock: vi.fn()
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: compareMock
  }
}));

describe("LoginUserUseCase", () => {
  const users: UserRepository = {
    create: vi.fn(),
    findByEmail: vi.fn(),
    findById: vi.fn()
  };

  const sessions: SessionRepository = {
    create: vi.fn(),
    findByTokenHash: vi.fn(),
    deleteByTokenHash: vi.fn()
  };

  const tokens: TokenService = {
    signAccessToken: vi.fn().mockResolvedValue("access-token"),
    signRefreshToken: vi.fn().mockResolvedValue("refresh-token"),
    verifyAccessToken: vi.fn(),
    verifyRefreshToken: vi.fn(),
    hashToken: vi.fn().mockReturnValue("hashed-refresh-token")
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user and tokens for valid credentials", async () => {
    vi.mocked(users.findByEmail).mockResolvedValue({
      id: "0f4f6a89-fb41-4f6e-973e-6c5469228562",
      name: "Guru ATIGA",
      email: "teacher@example.com",
      passwordHash: "hashed-password",
      role: "teacher",
      isActive: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    compareMock.mockResolvedValue(true);
    vi.mocked(sessions.create).mockResolvedValue({
      id: "session-id",
      userId: "0f4f6a89-fb41-4f6e-973e-6c5469228562",
      tokenHash: "hashed-refresh-token",
      expiresAt: new Date(Date.now() + 86_400_000),
      ipAddress: null,
      userAgent: null,
      createdAt: new Date()
    });

    const useCase = new LoginUserUseCase(users, sessions, tokens);
    const result = await useCase.execute(
      {
        email: "teacher@example.com",
        password: "secret-password"
      },
      {
        ipAddress: "127.0.0.1",
        userAgent: "vitest"
      }
    );

    expect(result.user.email).toBe("teacher@example.com");
    expect(result.tokens.accessToken).toBe("access-token");
    expect(result.tokens.refreshToken).toBe("refresh-token");
    expect(sessions.create).toHaveBeenCalledTimes(1);
  });
});
