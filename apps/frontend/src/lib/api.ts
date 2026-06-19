import { getAccessToken } from "./auth";
import { env } from "./env";
import type { ApiResponse } from "./types";

const API_URL = env.NEXT_PUBLIC_API_URL;

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (typeof window !== "undefined") {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers
  });

  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok) {
    throw new Error(payload.message);
  }

  return payload;
}
