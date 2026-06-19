import { ExportService } from "@infra/export/export.service";
import { queueJobDurationSeconds } from "@infra/monitoring/metrics";
import { cleanupRateLimitRecords } from "@infra/rate-limit/pg-rate-limiter";
import { getQueue, queueNames } from "../queue";

const exportsService = new ExportService();

export async function startMaintenanceWorkers(): Promise<void> {
  const boss = getQueue();

  await boss.work(queueNames.exportCleanup, async () => {
    const started = Date.now();
    try {
      await exportsService.cleanupExpiredExports();
      queueJobDurationSeconds.observe({ queue: queueNames.exportCleanup, status: "completed" }, (Date.now() - started) / 1000);
    } catch (error) {
      queueJobDurationSeconds.observe({ queue: queueNames.exportCleanup, status: "failed" }, (Date.now() - started) / 1000);
      throw error;
    }
  });

  await boss.work(queueNames.rateLimitCleanup, async () => {
    const started = Date.now();
    try {
      await cleanupRateLimitRecords();
      queueJobDurationSeconds.observe({ queue: queueNames.rateLimitCleanup, status: "completed" }, (Date.now() - started) / 1000);
    } catch (error) {
      queueJobDurationSeconds.observe({ queue: queueNames.rateLimitCleanup, status: "failed" }, (Date.now() - started) / 1000);
      throw error;
    }
  });
}
