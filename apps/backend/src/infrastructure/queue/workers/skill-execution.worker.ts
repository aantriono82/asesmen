import { AppError } from "@lib/errors";
import { getQueue, queueNames } from "../queue";
import { DrizzleSkillExecutionStore } from "@infra/repositories/drizzle-skill-execution-store";
import { DrizzleSkillRepository } from "@infra/repositories/drizzle-skill-repository";
import { AIProviderRegistry } from "@infra/ai/ai-provider.registry";
import { loadSkillBySlug } from "@infra/skills/skill-loader";
import { buildSkillPrompt, simulateSkillOutput } from "@app/skills/skill-runtime";
import { executeSkillWithAI } from "@app/skills/skill-ai-runtime";
import { resolveModel } from "@app/skills/skill-model-routing";
import { queueJobDurationSeconds, skillExecutionsTotal } from "@infra/monitoring/metrics";

const executions = new DrizzleSkillExecutionStore();
const skills = new DrizzleSkillRepository();
const providers = new AIProviderRegistry();

export async function startSkillExecutionWorker(): Promise<void> {
  const boss = getQueue();

  await boss.work(queueNames.skillExecution, async (jobs) => {
    const job = jobs[0];
    if (!job) {
      return;
    }

    await processSkillExecutionJob(readExecutionId(job.data), executions, skills);
  });
}

export async function processSkillExecutionJob(
  executionId: string,
  executionStore = executions,
  skillRepository = skills
): Promise<void> {
  const started = Date.now();
  const execution = await executionStore.findById(executionId);
  if (!execution) {
    throw new AppError("Execution tidak ditemukan", "EXECUTION_NOT_FOUND", 404);
  }

  await executionStore.updateStatus(execution.id, { status: "running" });

  try {
    const skill = await skillRepository.findActiveBySlug(execution.skillSlug);
    const fileSkill = await loadSkillBySlug(execution.skillSlug);
    if (!skill || !fileSkill) {
      throw new AppError("Skill tidak ditemukan", "SKILL_NOT_FOUND", 404);
    }

    const prompt = buildSkillPrompt(fileSkill, execution.input);
    let output: Record<string, unknown> | unknown[] = simulateSkillOutput(fileSkill, execution.input, prompt);

    try {
      const provider = await providers.getActiveProvider();
      const selectedModel = resolveModel(fileSkill, provider.name);
      if (process.env.NODE_ENV !== "test") {
        console.info(
          JSON.stringify({
            event: "skill_model_routing",
            skillSlug: fileSkill.slug,
            provider: provider.name,
            model: selectedModel ?? provider.model
          })
        );
      }

      if (await provider.isAvailable()) {
        const generated = await executeSkillWithAI(provider, fileSkill, execution.input);
        output = generated.output;
      }
    } catch {
      // Keep Phase 2 fallback behavior when provider configuration is unavailable.
    }

    await executionStore.updateStatus(execution.id, {
      status: "completed",
      output,
      durationMs: 0
    });
    skillExecutionsTotal.inc({ skill: execution.skillSlug, status: "completed" });
    queueJobDurationSeconds.observe({ queue: queueNames.skillExecution, status: "completed" }, (Date.now() - started) / 1000);
  } catch (error: unknown) {
    await executionStore.updateStatus(execution.id, {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
    skillExecutionsTotal.inc({ skill: execution.skillSlug, status: "failed" });
    queueJobDurationSeconds.observe({ queue: queueNames.skillExecution, status: "failed" }, (Date.now() - started) / 1000);
    throw error;
  }
}

function readExecutionId(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) {
    throw new AppError("Payload job tidak valid", "JOB_INVALID", 400);
  }

  const executionId = (payload as Record<string, unknown>).executionId;
  if (typeof executionId !== "string" || executionId.length === 0) {
    throw new AppError("executionId wajib diisi", "JOB_INVALID", 400);
  }

  return executionId;
}
