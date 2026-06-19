import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from "prom-client";

export const metricsRegistry = new Registry();
collectDefaultMetrics({ register: metricsRegistry, prefix: "atiga_" });

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "path", "status"] as const,
  registers: [metricsRegistry]
});

export const httpRequestDurationSeconds = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request latency",
  labelNames: ["method", "path", "status"] as const,
  buckets: [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [metricsRegistry]
});

export const skillExecutionsTotal = new Counter({
  name: "skill_executions_total",
  help: "Skill executions by status",
  labelNames: ["skill", "status"] as const,
  registers: [metricsRegistry]
});

export const aiTokensUsedTotal = new Counter({
  name: "ai_tokens_used_total",
  help: "AI tokens used",
  labelNames: ["provider", "model"] as const,
  registers: [metricsRegistry]
});

export const documentProcessingDurationSeconds = new Histogram({
  name: "document_processing_duration_seconds",
  help: "Document processing duration",
  labelNames: ["status"] as const,
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [metricsRegistry]
});

export const queueJobDurationSeconds = new Histogram({
  name: "queue_job_duration_seconds",
  help: "Queue job duration",
  labelNames: ["queue", "status"] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30],
  registers: [metricsRegistry]
});

export const activeChatSessions = new Gauge({
  name: "active_chat_sessions",
  help: "Approximate number of active chat sessions",
  registers: [metricsRegistry]
});
