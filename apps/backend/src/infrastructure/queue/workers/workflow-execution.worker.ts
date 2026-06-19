import { AppError } from "@lib/errors";
import { getQueue, queueNames } from "../queue";
import { DrizzleWorkflowStore } from "@infra/repositories/drizzle-workflow-store";
import { runWorkflowSteps } from "@app/workflows/workflow-planner.use-case";

const workflows = new DrizzleWorkflowStore();

export async function startWorkflowExecutionWorker(): Promise<void> {
  const boss = getQueue();

  await boss.work(queueNames.workflowExecution, async (jobs) => {
    const job = jobs[0];
    if (!job) {
      return;
    }

    await processWorkflowExecutionJob(readWorkflowRunId(job.data), workflows);
  });
}

export async function processWorkflowExecutionJob(
  workflowRunId: string,
  workflowStore = workflows
): Promise<void> {
  const run = await workflowStore.getRun(workflowRunId);
  if (!run) {
    throw new AppError("Workflow run tidak ditemukan", "WORKFLOW_RUN_NOT_FOUND", 404);
  }

  const workflow = await workflowStore.getWorkflow(run.workflowId, run.userId);
  if (!workflow) {
    throw new AppError("Workflow tidak ditemukan", "WORKFLOW_NOT_FOUND", 404);
  }

  await workflowStore.updateRun(run.id, { status: "running", startedAt: new Date(), currentStep: 0 });

  try {
    const runtime = await runWorkflowSteps({
      workflow,
      initialInput: run.input
    });

    await workflowStore.updateRun(run.id, {
      status: "completed",
      output: runtime.output,
      currentStep: workflow.steps.length,
      completedAt: new Date()
    });
  } catch (error: unknown) {
    await workflowStore.updateRun(run.id, {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      completedAt: new Date()
    });
    throw error;
  }
}

function readWorkflowRunId(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) {
    throw new AppError("Payload job tidak valid", "JOB_INVALID", 400);
  }

  const workflowRunId = (payload as Record<string, unknown>).workflowRunId;
  if (typeof workflowRunId !== "string" || workflowRunId.length === 0) {
    throw new AppError("workflowRunId wajib diisi", "JOB_INVALID", 400);
  }

  return workflowRunId;
}
