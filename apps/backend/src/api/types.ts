import type { UserRole } from "@domain/entities/user";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  code: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}
