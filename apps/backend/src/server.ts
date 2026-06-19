import { buildApp } from "./app";
import { shutdownDatabase } from "@infra/database/client";
import { shutdownQueue, startQueue } from "@infra/queue/queue";
import { startQueueWorkers } from "@infra/queue/workers";
import { SyncSkillsUseCase } from "@app/use-cases/skill-use-cases";
import { DrizzleSkillRepository } from "@infra/repositories/drizzle-skill-repository";
import { env } from "@lib/env";

async function main(): Promise<void> {
  const app = await buildApp();
  await startQueue();
  await startQueueWorkers();
  await new SyncSkillsUseCase(new DrizzleSkillRepository()).execute();

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    app.log.info({ signal }, "shutting down");
    await app.close();
    await shutdownQueue();
    await shutdownDatabase();
    process.exit(0);
  };

  process.on("SIGINT", (signal) => {
    void shutdown(signal);
  });
  process.on("SIGTERM", (signal) => {
    void shutdown(signal);
  });

  await app.listen({ port: env.BACKEND_PORT, host: "0.0.0.0" });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
