import { loadSkillBySlug } from "@infra/skills/skill-loader";
import { AIProviderRegistry } from "@infra/ai/ai-provider.registry";
import { buildSkillPrompt, simulateSkillOutput } from "@app/skills/skill-runtime";
import { executeSkillWithAI } from "@app/skills/skill-ai-runtime";
import { AppError } from "@lib/errors";
import { validateGeneratedQuestions } from "./question-validator";

const providers = new AIProviderRegistry();

export async function generateQuestionsFromSkill(input: {
  skillSlug: string;
  payload: Record<string, unknown>;
}) {
  const skill = await loadSkillBySlug(input.skillSlug);
  if (!skill || !skill.isActive) {
    throw new AppError(`Skill ${input.skillSlug} tidak ditemukan`, "ASSESSMENT_SKILL_NOT_FOUND", 404);
  }

  const prompt = buildSkillPrompt(skill, input.payload);
  let output: Record<string, unknown> | unknown[] = simulateSkillOutput(skill, input.payload, prompt);
  try {
    const provider = await providers.getActiveProvider();
    if (await provider.isAvailable()) {
      output = (await executeSkillWithAI(provider, skill, input.payload)).output;
    }
  } catch {
    // fall back to local simulated output for test and unconfigured provider environments
  }

  try {
    return validateGeneratedQuestions(input.skillSlug, output);
  } catch (firstError: unknown) {
    const provider = await providers.getActiveProvider();
    if (!(await provider.isAvailable())) {
      throw enrichQuestionValidationError(firstError, output);
    }
    const retryOutput = (await executeSkillWithAI(provider, skill, input.payload)).output;
    try {
      return validateGeneratedQuestions(input.skillSlug, retryOutput);
    } catch (retryError: unknown) {
      throw enrichQuestionValidationError(retryError, retryOutput);
    }
  }
}

function enrichQuestionValidationError(error: unknown, rawOutput: unknown): unknown {
  if (!(error instanceof AppError)) {
    return error;
  }

  const preview = safeJsonPreview(rawOutput);
  return new AppError(`${error.message}. Raw output: ${preview}`, error.code, error.statusCode);
}

function safeJsonPreview(value: unknown): string {
  try {
    const serialized = JSON.stringify(value);
    if (!serialized) {
      return "<empty>";
    }
    return serialized.length > 500 ? `${serialized.slice(0, 500)}...` : serialized;
  } catch {
    return "<unserializable>";
  }
}
