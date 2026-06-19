import { z } from "zod";

export const registerInputSchema = z.object({
  name: z.string().min(2).max(160),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128)
});

export const loginInputSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128)
});

export const refreshInputSchema = z.object({
  refreshToken: z.string().min(20).optional().default("")
});

export const logoutInputSchema = z.object({
  refreshToken: z.string().min(20).optional().default("")
});

export type RegisterInput = z.infer<typeof registerInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type RefreshInput = z.infer<typeof refreshInputSchema>;
export type LogoutInput = z.infer<typeof logoutInputSchema>;
