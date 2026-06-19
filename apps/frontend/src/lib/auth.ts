import type { User } from "./types";

export const ACCESS_TOKEN_KEY = "atiga_access_token";
export const REFRESH_TOKEN_KEY = "atiga_refresh_token";
export const USER_KEY = "atiga_user";

export function isAdmin(user: Pick<User, "role"> | null): boolean {
  return user?.role === "admin";
}

export function isTeacher(user: Pick<User, "role"> | null): boolean {
  return user?.role === "teacher" || user?.role === "admin";
}

export function saveAuth(accessToken: string, refreshToken: string, user: User): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return parseStoredUser(JSON.parse(raw));
  } catch {
    return null;
  }
}

function parseStoredUser(value: unknown): User | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const data = value as Record<string, unknown>;
  const role = data.role;
  if (role !== "admin" && role !== "teacher") {
    return null;
  }

  return {
    id: typeof data.id === "string" ? data.id : "",
    name: typeof data.name === "string" ? data.name : "",
    email: typeof data.email === "string" ? data.email : "",
    role,
    isActive: data.isActive === true
  };
}
