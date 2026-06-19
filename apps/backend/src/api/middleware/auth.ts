import type { FastifyRequest } from "fastify";
import { JwtTokenService } from "@infra/auth/jwt-token-service";
import { ForbiddenError, UnauthorizedError } from "@lib/errors";

const tokenService = new JwtTokenService();

export async function authenticate(request: FastifyRequest): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Token tidak ditemukan");
  }

  const token = header.slice("Bearer ".length);
  const payload = await tokenService.verifyAccessToken(token);
  request.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role
  };
}

export async function requireAdmin(request: FastifyRequest): Promise<void> {
  if (!request.user) {
    throw new UnauthorizedError();
  }

  if (request.user.role !== "admin") {
    throw new ForbiddenError("Akses admin diperlukan");
  }
}

export async function requireTeacher(request: FastifyRequest): Promise<void> {
  if (!request.user) {
    throw new UnauthorizedError();
  }

  if (request.user.role !== "teacher" && request.user.role !== "admin") {
    throw new ForbiddenError("Akses teacher diperlukan");
  }
}
