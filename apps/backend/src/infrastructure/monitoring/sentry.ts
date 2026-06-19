import * as Sentry from "@sentry/node";
import { env } from "@lib/env";

let initialized = false;

export function initSentry(): void {
  if (initialized || !env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 0
  });
  initialized = true;
}

export function captureServerError(error: unknown, context?: { requestId?: string; userId?: string; email?: string }): void {
  if (!initialized) {
    return;
  }

  Sentry.withScope((scope: { setTag: (key: string, value: string) => void; setUser: (user: { id?: string; email?: string }) => void }) => {
    if (context?.requestId) {
      scope.setTag("request_id", context.requestId);
    }
    if (context?.userId) {
      scope.setUser({
        id: context.userId,
        ...(context.email ? { email: context.email } : {})
      });
    }
    Sentry.captureException(error);
  });
}
