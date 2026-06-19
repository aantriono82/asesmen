import type { SkillDefinition } from "@domain/entities/skill";
import type { SkillRepository } from "@domain/repositories/skill-repository";
import { AppError } from "@lib/errors";
import { loadSkillBySlug } from "@infra/skills/skill-loader";
import { buildSkillPrompt, simulateSkillOutput, validateSkillInput } from "./skill-runtime";

export interface SkillExecutionRecord {
  id: string;
  userId: string;
  skillId: string;
  skillSlug: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | unknown[] | null;
  status: "pending" | "running" | "completed" | "failed";
  durationMs: number | null;
  error: string | null;
  createdAt: Date;
}

export interface SkillExecutionStore {
  createPending(input: {
    userId: string;
    skillId: string;
    skillSlug: string;
    input: Record<string, unknown>;
  }): Promise<SkillExecutionRecord>;
  updateStatus(
    id: string,
    patch: Partial<Pick<SkillExecutionRecord, "status" | "output" | "error" | "durationMs">>
  ): Promise<SkillExecutionRecord | null>;
  findById(id: string, userId?: string): Promise<SkillExecutionRecord | null>;
  listByUserId(input: {
    userId: string;
    status?: SkillExecutionRecord["status"];
    skillSlug?: string;
    after?: string;
    before?: string;
    page: number;
    limit: number;
  }): Promise<{ items: SkillExecutionRecord[]; total: number }>;
  deleteById(id: string, userId?: string): Promise<boolean>;
}

export interface SkillExecutionQueue {
  send(jobName: string, payload: { executionId: string }): Promise<unknown>;
}

export class ExecuteSkillUseCase {
  public constructor(
    private readonly skills: SkillRepository,
    private readonly executions: SkillExecutionStore,
    private readonly queue: SkillExecutionQueue
  ) {}

  public async execute(input: {
    userId: string;
    slug: string;
    input: Record<string, unknown>;
  }): Promise<{ executionId: string; status: "pending" }> {
    const skill = await this.skills.findActiveBySlug(input.slug);
    if (!skill) {
      throw new AppError("Skill tidak ditemukan", "SKILL_NOT_FOUND", 404);
    }

    const fileSkill = await loadSkillBySlug(input.slug);
    if (!fileSkill || !fileSkill.isActive) {
      throw new AppError("Skill tidak ditemukan", "SKILL_NOT_FOUND", 404);
    }

    validateSkillInput(fileSkill.inputSchema, input.input);

    const record = await this.executions.createPending({
      userId: input.userId,
      skillId: skill.id,
      skillSlug: skill.slug,
      input: input.input
    });

    await this.queue.send("skill-execution", {
      executionId: record.id
    });

    return {
      executionId: record.id,
      status: "pending"
    };
  }
}

export class GetExecutionUseCase {
  public constructor(private readonly executions: SkillExecutionStore) {}

  public async execute(input: { executionId: string; userId: string }): Promise<SkillExecutionRecord> {
    const execution = await this.executions.findById(input.executionId, input.userId);
    if (!execution) {
      throw new AppError("Execution tidak ditemukan", "EXECUTION_NOT_FOUND", 404);
    }

    return execution;
  }
}

export class ListExecutionsUseCase {
  public constructor(private readonly executions: SkillExecutionStore) {}

  public async execute(input: {
    userId: string;
    page: number;
    limit: number;
    status?: SkillExecutionRecord["status"];
    skillSlug?: string;
    after?: string;
    before?: string;
  }): Promise<{ items: SkillExecutionRecord[]; total: number; page: number; limit: number; totalPages: number }> {
    const result = await this.executions.listByUserId(input);
    return {
      ...result,
      page: input.page,
      limit: input.limit,
      totalPages: Math.max(1, Math.ceil(result.total / input.limit))
    };
  }
}

export class DeleteExecutionUseCase {
  public constructor(private readonly executions: SkillExecutionStore) {}

  public async execute(input: { executionId: string; userId: string }): Promise<void> {
    const deleted = await this.executions.deleteById(input.executionId, input.userId);
    if (!deleted) {
      throw new AppError("Execution tidak ditemukan", "EXECUTION_NOT_FOUND", 404);
    }
  }
}

export interface SkillRuntimeExecution {
  skill: SkillDefinition;
  prompt: string;
  output: Record<string, unknown>;
}

export async function runSkillRuntime(skill: SkillDefinition, input: Record<string, unknown>): Promise<SkillRuntimeExecution> {
  const prompt = buildSkillPrompt(skill, input);
  const output = simulateSkillOutput(skill, input, prompt);

  return {
    skill,
    prompt,
    output
  };
}
