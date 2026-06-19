import { and, eq } from "drizzle-orm";
import type {
  WorkflowRecord,
  WorkflowRunRecord,
  WorkflowStep,
  WorkflowStore
} from "@app/workflows/workflow-planner.use-case";
import { db } from "@infra/database/client";
import { workflowRuns, workflows } from "@infra/database/schema";
import { withSoftDelete } from "@infra/database/soft-delete";

export class DrizzleWorkflowStore implements WorkflowStore {
  public async createWorkflow(input: {
    userId: string;
    name: string;
    description: string;
    steps: WorkflowStep[];
    status: WorkflowRecord["status"];
  }): Promise<WorkflowRecord> {
    const [record] = await db
      .insert(workflows)
      .values({
        userId: input.userId,
        name: input.name,
        description: input.description,
        steps: input.steps,
        status: input.status
      })
      .returning();

    if (!record) {
      throw new Error("Failed to create workflow");
    }

    return mapWorkflow(record);
  }

  public async listWorkflows(userId: string): Promise<WorkflowRecord[]> {
    const rows = await db.query.workflows.findMany({
      where: withSoftDelete(workflows, eq(workflows.userId, userId)),
      orderBy: (table, { desc }) => [desc(table.createdAt)]
    });

    return rows.map(mapWorkflow);
  }

  public async getWorkflow(id: string, userId: string): Promise<WorkflowRecord | null> {
    const row = await db.query.workflows.findFirst({
      where: withSoftDelete(workflows, and(eq(workflows.id, id), eq(workflows.userId, userId)))
    });

    return row ? mapWorkflow(row) : null;
  }

  public async createRun(input: { workflowId: string; userId: string; input: Record<string, unknown> }): Promise<WorkflowRunRecord> {
    const [record] = await db
      .insert(workflowRuns)
      .values({
        workflowId: input.workflowId,
        userId: input.userId,
        input: input.input,
        status: "pending",
        currentStep: 0
      })
      .returning();

    if (!record) {
      throw new Error("Failed to create workflow run");
    }

    return mapRun(record);
  }

  public async updateRun(
    id: string,
    patch: Partial<Pick<WorkflowRunRecord, "status" | "output" | "error" | "currentStep" | "startedAt" | "completedAt">>
  ): Promise<WorkflowRunRecord | null> {
    const [updated] = await db
      .update(workflowRuns)
      .set({
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.output ? { output: patch.output } : {}),
        ...(typeof patch.error === "string" ? { error: patch.error } : {}),
        ...(typeof patch.currentStep === "number" ? { currentStep: patch.currentStep } : {}),
        ...(patch.startedAt ? { startedAt: patch.startedAt } : {}),
        ...(patch.completedAt ? { completedAt: patch.completedAt } : {})
      })
      .where(eq(workflowRuns.id, id))
      .returning();

    return updated ? mapRun(updated) : null;
  }

  public async getRun(id: string, userId?: string): Promise<WorkflowRunRecord | null> {
    const condition = userId ? and(eq(workflowRuns.id, id), eq(workflowRuns.userId, userId)) : eq(workflowRuns.id, id);
    const row = await db.query.workflowRuns.findFirst({ where: condition });
    return row ? mapRun(row) : null;
  }

  public async listRuns(workflowId: string, userId: string): Promise<WorkflowRunRecord[]> {
    const rows = await db.query.workflowRuns.findMany({
      where: and(eq(workflowRuns.workflowId, workflowId), eq(workflowRuns.userId, userId)),
      orderBy: (table, { desc }) => [desc(table.createdAt)]
    });

    return rows.map(mapRun);
  }
}

function mapWorkflow(record: typeof workflows.$inferSelect): WorkflowRecord {
  return {
    id: record.id,
    userId: record.userId,
    name: record.name,
    description: record.description,
    steps: Array.isArray(record.steps) ? (record.steps as WorkflowStep[]) : [],
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function mapRun(record: typeof workflowRuns.$inferSelect): WorkflowRunRecord {
  return {
    id: record.id,
    workflowId: record.workflowId,
    userId: record.userId,
    input: record.input as Record<string, unknown>,
    output: (record.output as Record<string, unknown> | null) ?? null,
    status: record.status,
    currentStep: record.currentStep,
    error: record.error,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    createdAt: record.createdAt
  };
}
