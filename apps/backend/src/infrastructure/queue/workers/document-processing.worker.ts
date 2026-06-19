import { getQueue, queueNames } from "../queue";
import { AppError } from "@lib/errors";
import { DocumentProcessorService } from "@infra/documents/document-processor.service";
import { documentProcessingDurationSeconds, queueJobDurationSeconds } from "@infra/monitoring/metrics";

const processor = new DocumentProcessorService();

export async function startDocumentProcessingWorker(): Promise<void> {
  const boss = getQueue();
  await boss.work(queueNames.documentProcessing, async (jobs) => {
    const job = jobs[0];
    if (!job) {
      return;
    }

    const started = Date.now();
    try {
      await processor.process(readPayload(job.data));
      documentProcessingDurationSeconds.observe({ status: "completed" }, (Date.now() - started) / 1000);
      queueJobDurationSeconds.observe({ queue: queueNames.documentProcessing, status: "completed" }, (Date.now() - started) / 1000);
    } catch (error) {
      documentProcessingDurationSeconds.observe({ status: "failed" }, (Date.now() - started) / 1000);
      queueJobDurationSeconds.observe({ queue: queueNames.documentProcessing, status: "failed" }, (Date.now() - started) / 1000);
      throw error;
    }
  });
}

function readPayload(data: unknown): { documentId: string; userId: string } {
  if (typeof data !== "object" || data === null) {
    throw new AppError("Payload document job tidak valid", "JOB_INVALID", 400);
  }

  const documentId = (data as Record<string, unknown>).documentId;
  const userId = (data as Record<string, unknown>).userId;
  if (typeof documentId !== "string" || typeof userId !== "string") {
    throw new AppError("documentId dan userId wajib diisi", "JOB_INVALID", 400);
  }

  return { documentId, userId };
}
