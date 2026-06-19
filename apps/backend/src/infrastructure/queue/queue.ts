import PgBoss from "pg-boss";
import { env } from "@lib/env";

export const queueNames = {
  skillExecution: "skill-execution",
  workflowExecution: "workflow-execution",
  documentProcessing: "document-processing",
  assessmentGeneration: "assessment-generation",
  exportCleanup: "export-cleanup",
  rateLimitCleanup: "rate-limit-cleanup"
} as const;

let boss: PgBoss | null = null;

export async function startQueue(): Promise<PgBoss> {
  if (boss) {
    return boss;
  }

  boss = new PgBoss({
    connectionString: env.DATABASE_URL,
    application_name: "atiga-assessment-ai"
  });

  boss.on("error", (error: Error) => {
    console.error({ error }, "pg-boss error");
  });

  await boss.start();
  for (const queueName of Object.values(queueNames)) {
    await boss.createQueue(queueName);
  }
  await boss.schedule(queueNames.exportCleanup, "0 2 * * *", {});
  await boss.schedule(queueNames.rateLimitCleanup, "15 2 * * *", {});
  return boss;
}

export function getQueue(): PgBoss {
  if (!boss) {
    throw new Error("Queue has not been started");
  }

  return boss;
}

export async function queueHealthCheck(): Promise<"ok" | "error"> {
  try {
    const activeBoss = boss ?? (await startQueue());
    await activeBoss.getQueueSize(queueNames.skillExecution);
    await activeBoss.getQueueSize(queueNames.workflowExecution);
    return "ok";
  } catch {
    return "error";
  }
}

export async function shutdownQueue(): Promise<void> {
  if (!boss) {
    return;
  }

  await boss.stop({ graceful: true });
  boss = null;
}
