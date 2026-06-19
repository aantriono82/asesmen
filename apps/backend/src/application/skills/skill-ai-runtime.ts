import type { SkillDefinition } from "@domain/entities/skill";
import { PromptTemplate } from "@infra/ai/prompt-template";
import type { AIProvider, CompletionResult } from "@infra/ai/providers/base.provider";
import { AppError } from "@lib/errors";
import { buildSkillPrompt, simulateSkillOutput } from "./skill-runtime";
import { resolveModel } from "./skill-model-routing";

export interface SkillAIExecutionResult {
  prompt: string;
  completion: CompletionResult;
  output: Record<string, unknown> | unknown[];
}

export async function executeSkillWithAI(
  provider: AIProvider,
  skill: SkillDefinition,
  input: Record<string, unknown>
): Promise<SkillAIExecutionResult> {
  const basePrompt = buildSkillPrompt(skill, input);
  const selectedModel = resolveModel(skill, provider.name);
  const hasSourceContext = typeof input.sourceContext === "string" && input.sourceContext.trim().length > 0;
  const template = new PromptTemplate({
    system: [
      "Anda adalah engine skill ATIGA Assessment AI.",
      `Skill: ${skill.name}`,
      "Kembalikan output JSON valid yang sesuai schema output.",
      ...(hasSourceContext
        ? [
            "SourceContext tersedia dan wajib dijadikan dasar fakta.",
            "Gunakan istilah, nama metode, nama bahan, angka, rentang, dan parameter spesifik dari sourceContext secara eksplisit bila relevan.",
            "Jangan menurunkan istilah spesifik menjadi istilah generik jika sourceContext sudah menyediakan istilah yang lebih presisi.",
            "Jangan mengarang fakta di luar sourceContext jika konteks spesifik sudah tersedia."
          ]
        : [])
    ].join("\n"),
    user: "{{prompt}}"
  });

  const rendered = template.renderPrompts({
    input,
    skill_name: skill.name,
    skill_slug: skill.slug,
    category: skill.category,
    output_schema: skill.outputSchema,
    workflow: skill.sections.workflow,
    examples: skill.sections.examples,
    prompt: basePrompt
  });

  if (process.env.NODE_ENV !== "test") {
    console.info(
      JSON.stringify({
        event: "skill_model_routing",
        skillSlug: skill.slug,
        provider: provider.name,
        model: selectedModel ?? provider.model
      })
    );
  }

  const completion = await provider.complete(
    [
      {
        role: "user",
        content: rendered.userPrompt
      }
    ],
    {
      systemPrompt: rendered.systemPrompt,
      maxTokens: 1_024,
      temperature: 0.2,
      ...(selectedModel ? { model: selectedModel } : {})
    }
  );

  const parsedOutput = tryParseJsonValue(completion.text);
  const output = parsedOutput ?? simulateSkillOutput(skill, input, basePrompt);

  if (!isStructuredOutput(output)) {
    throw new AppError("Output AI skill tidak valid", "SKILL_AI_INVALID_OUTPUT", 502);
  }

  return {
    prompt: rendered.userPrompt,
    completion,
    output
  };
}

function tryParseJsonValue(value: string): Record<string, unknown> | unknown[] | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const normalized = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;

  try {
    const parsed = JSON.parse(normalized) as unknown;
    return unwrapSkillJsonValue(parsed);
  } catch {
    return null;
  }
}

function unwrapSkillJsonValue(value: unknown): Record<string, unknown> | unknown[] | null {
  if (Array.isArray(value)) {
    return value;
  }

  if (!isRecord(value)) {
    return null;
  }

  const directArrays = ["questions", "items", "data", "output", "result", "response"] as const;
  for (const key of directArrays) {
    const candidate = value[key];
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  const nestedObjects = ["output", "result", "response", "data", "payload"] as const;
  for (const key of nestedObjects) {
    const candidate = value[key];
    if (Array.isArray(candidate)) {
      return candidate;
    }
    if (isRecord(candidate)) {
      const nested = unwrapSkillJsonValue(candidate);
      if (nested) {
        return nested;
      }
    }
  }

  return value;
}

function isStructuredOutput(value: unknown): value is Record<string, unknown> | unknown[] {
  return Array.isArray(value) || isRecord(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
