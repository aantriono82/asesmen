import type { SkillDefinition } from "@domain/entities/skill";
import { AppError } from "@lib/errors";
import { loadSkillBySlug } from "@infra/skills/skill-loader";
import { buildSkillPrompt, simulateSkillOutput, validateSkillInput } from "@app/skills/skill-runtime";

export interface WorkflowStep {
  skillSlug: string;
  inputMapping: Record<string, string>;
  outputKey: string;
}

export interface WorkflowRecord {
  id: string;
  userId: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  status: "draft" | "active" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowRunRecord {
  id: string;
  workflowId: string;
  userId: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  status: "pending" | "running" | "completed" | "failed";
  currentStep: number;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface WorkflowStore {
  createWorkflow(input: {
    userId: string;
    name: string;
    description: string;
    steps: WorkflowStep[];
    status: WorkflowRecord["status"];
  }): Promise<WorkflowRecord>;
  listWorkflows(userId: string): Promise<WorkflowRecord[]>;
  getWorkflow(id: string, userId: string): Promise<WorkflowRecord | null>;
  createRun(input: { workflowId: string; userId: string; input: Record<string, unknown> }): Promise<WorkflowRunRecord>;
  updateRun(
    id: string,
    patch: Partial<Pick<WorkflowRunRecord, "status" | "output" | "error" | "currentStep" | "startedAt" | "completedAt">>
  ): Promise<WorkflowRunRecord | null>;
  getRun(id: string, userId?: string): Promise<WorkflowRunRecord | null>;
  listRuns(workflowId: string, userId: string): Promise<WorkflowRunRecord[]>;
}

export interface WorkflowQueue {
  send(jobName: string, payload: { workflowRunId: string }): Promise<unknown>;
}

export class WorkflowPlannerUseCase {
  public constructor(private readonly store: WorkflowStore) {}

  public async create(input: {
    userId: string;
    name: string;
    description: string;
    steps: WorkflowStep[];
    status?: WorkflowRecord["status"];
  }): Promise<WorkflowRecord> {
    if (input.steps.length === 0) {
      throw new AppError("Workflow harus memiliki minimal satu langkah", "WORKFLOW_INVALID", 400);
    }

    return this.store.createWorkflow({
      userId: input.userId,
      name: input.name,
      description: input.description,
      steps: input.steps,
      status: input.status ?? "draft"
    });
  }

  public async list(userId: string): Promise<WorkflowRecord[]> {
    return this.store.listWorkflows(userId);
  }

  public async detail(input: { workflowId: string; userId: string }): Promise<WorkflowRecord> {
    const workflow = await this.store.getWorkflow(input.workflowId, input.userId);
    if (!workflow) {
      throw new AppError("Workflow tidak ditemukan", "WORKFLOW_NOT_FOUND", 404);
    }

    return workflow;
  }
}

export class RunWorkflowUseCase {
  public constructor(
    private readonly store: WorkflowStore,
    private readonly queue: WorkflowQueue
  ) {}

  public async execute(input: { workflowId: string; userId: string; input: Record<string, unknown> }): Promise<WorkflowRunRecord> {
    const workflow = await this.store.getWorkflow(input.workflowId, input.userId);
    if (!workflow) {
      throw new AppError("Workflow tidak ditemukan", "WORKFLOW_NOT_FOUND", 404);
    }

    const run = await this.store.createRun({
      workflowId: workflow.id,
      userId: input.userId,
      input: input.input
    });

    await this.queue.send("workflow-execution", { workflowRunId: run.id });
    return run;
  }
}

export class GetWorkflowRunUseCase {
  public constructor(private readonly store: WorkflowStore) {}

  public async execute(input: { workflowRunId: string; userId: string }): Promise<WorkflowRunRecord> {
    const run = await this.store.getRun(input.workflowRunId, input.userId);
    if (!run) {
      throw new AppError("Workflow run tidak ditemukan", "WORKFLOW_RUN_NOT_FOUND", 404);
    }

    return run;
  }
}

export class ListWorkflowRunsUseCase {
  public constructor(private readonly store: WorkflowStore) {}

  public async execute(input: { workflowId: string; userId: string }): Promise<WorkflowRunRecord[]> {
    return this.store.listRuns(input.workflowId, input.userId);
  }
}

export interface WorkflowRuntimeResult {
  output: Record<string, unknown>;
  steps: Array<{
    skillSlug: string;
    outputKey: string;
    input: Record<string, unknown>;
    prompt: string;
    output: Record<string, unknown>;
  }>;
}

export async function runWorkflowSteps(input: {
  workflow: WorkflowRecord;
  initialInput: Record<string, unknown>;
}): Promise<WorkflowRuntimeResult> {
  const accumulatedOutputs: Record<string, Record<string, unknown>> = {};
  const stepsResult: WorkflowRuntimeResult["steps"] = [];

  for (const step of input.workflow.steps) {
    const skill = await loadActiveSkill(step.skillSlug);
    const resolvedInput = resolveStepInput(step.inputMapping, input.initialInput, accumulatedOutputs);
    validateSkillInput(skill.inputSchema, resolvedInput);

    const prompt = buildSkillPrompt(skill, resolvedInput);
    const output = simulateSkillOutput(skill, resolvedInput, prompt);
    accumulatedOutputs[step.outputKey] = output;
    stepsResult.push({
      skillSlug: step.skillSlug,
      outputKey: step.outputKey,
      input: resolvedInput,
      prompt,
      output
    });
  }

  return {
    output: {
      steps: accumulatedOutputs,
      result: stepsResult.at(-1)?.output ?? {}
    },
    steps: stepsResult
  };
}

async function loadActiveSkill(slug: string): Promise<SkillDefinition> {
  const skill = await loadSkillBySlug(slug);
  if (!skill || !skill.isActive) {
    throw new AppError(`Skill ${slug} tidak ditemukan`, "SKILL_NOT_FOUND", 404);
  }

  return skill;
}

function resolveStepInput(
  mapping: Record<string, string>,
  initialInput: Record<string, unknown>,
  accumulatedOutputs: Record<string, Record<string, unknown>>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const [targetKey, sourcePath] of Object.entries(mapping)) {
    resolved[targetKey] = resolvePath(sourcePath, initialInput, accumulatedOutputs);
  }

  return resolved;
}

function resolvePath(
  pathExpression: string,
  initialInput: Record<string, unknown>,
  accumulatedOutputs: Record<string, Record<string, unknown>>
): unknown {
  const normalizedPath = pathExpression
    .replace(/\[(\d+)\]/g, ".$1")
    .replace(/\[\]/g, ".*");
  const segments = normalizedPath.split(".").filter(Boolean);
  if (segments.length === 0) {
    return undefined;
  }

  const [root, ...rest] = segments;
  const lastOutputKey = Object.keys(accumulatedOutputs).at(-1);
  const source =
    root === "input"
      ? initialInput
      : root === "previous"
        ? (lastOutputKey ? accumulatedOutputs[lastOutputKey] : undefined)
        : root
          ? accumulatedOutputs[root]
          : undefined;

  return readPathValue(source, rest);
}

function readPathValue(current: unknown, segments: string[]): unknown {
  if (segments.length === 0) {
    return current;
  }

  const [segment, ...rest] = segments;
  if (!segment) {
    return current;
  }

  if (segment === "*") {
    if (!Array.isArray(current)) {
      return undefined;
    }

    return current
      .map((item) => readPathValue(item, rest))
      .filter((item) => item !== undefined);
  }

  if (Array.isArray(current)) {
    const index = Number(segment);
    if (!Number.isInteger(index)) {
      return undefined;
    }

    return readPathValue(current[index], rest);
  }

  if (typeof current !== "object" || current === null) {
    return undefined;
  }

  return readPathValue((current as Record<string, unknown>)[segment], rest);
}
