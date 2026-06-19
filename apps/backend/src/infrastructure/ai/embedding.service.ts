import OpenAI from "openai";
import { env } from "@lib/env";
import { AppError } from "@lib/errors";

const EMBEDDING_BATCH_SIZE = 100;

export class EmbeddingService {
  private readonly openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

  public async embedTexts(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    if (!this.openai) {
      throw new AppError(
        "Fitur RAG memerlukan OPENAI_API_KEY untuk membuat embedding dokumen.",
        "EMBEDDING_PROVIDER_UNAVAILABLE",
        400
      );
    }

    const results: number[][] = [];
    for (let index = 0; index < texts.length; index += EMBEDDING_BATCH_SIZE) {
      const batch = texts.slice(index, index + EMBEDDING_BATCH_SIZE);
      const vectors = await withBackoff(async () => {
        const response = await this.openai!.embeddings.create({
          model: env.OPENAI_EMBEDDING_MODEL,
          input: batch
        });
        return response.data.map((item) => item.embedding);
      });
      results.push(...vectors);
    }

    return results;
  }

  public async embedQuery(text: string): Promise<number[]> {
    const [vector] = await this.embedTexts([text]);
    return vector ?? [];
  }
}

async function withBackoff<T>(callback: () => Promise<T>, attempt = 0): Promise<T> {
  try {
    return await callback();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const shouldRetry = message.includes("rate limit") || message.includes("429");
    if (!shouldRetry || attempt >= 4) {
      throw error;
    }

    const delayMs = 500 * 2 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return withBackoff(callback, attempt + 1);
  }
}
