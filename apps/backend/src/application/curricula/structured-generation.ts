import { z } from "zod";
import { AIProviderRegistry } from "@infra/ai/ai-provider.registry";
import { AppError } from "@lib/errors";

const registry = new AIProviderRegistry();

export async function generateStructuredJson<TSchema extends z.ZodTypeAny>(input: {
  systemPrompt: string;
  userPrompt: string;
  schema: TSchema;
  maxTokens?: number;
  fallback?: () => z.infer<TSchema> | Promise<z.infer<TSchema>>;
}): Promise<z.infer<TSchema>> {
  const provider = await registry.getActiveProvider();
  const fullPrompt = `${input.userPrompt}\n\nKembalikan hanya JSON valid tanpa markdown.`;
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const completion = await provider.complete(
        [{ role: "user", content: fullPrompt }],
        {
          systemPrompt: input.systemPrompt,
          temperature: 0.2,
          maxTokens: input.maxTokens ?? 2_000
        }
      );
      const parsed = parseJsonObject(completion.text);
      return input.schema.parse(parsed);
    } catch (error: unknown) {
      lastError = error;
    }
  }

  const message =
    lastError instanceof z.ZodError
      ? lastError.issues.map((issue) => issue.message).join("; ")
      : lastError instanceof Error
        ? lastError.message
        : "Gagal menghasilkan JSON terstruktur";

  if (input.fallback) {
    return input.schema.parse(await input.fallback());
  }

  throw new AppError(message, "STRUCTURED_GENERATION_FAILED", 502);
}

function parseJsonObject(value: string): unknown {
  const trimmed = value.trim();
  const normalized = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;
  return JSON.parse(normalized);
}
