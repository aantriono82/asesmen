import { eq } from "drizzle-orm";
import { db } from "@infra/database/client";
import { aiProviderSettings } from "@infra/database/schema";
import { env } from "@lib/env";
import { AppError } from "@lib/errors";
import { AIProviderFactory, type AIProviderName } from "./ai-provider.factory";
import type { AIProvider } from "./providers/base.provider";

const ACTIVE_PROVIDER_KEY = "active";

export interface ProviderStatus {
  name: AIProviderName;
  model: string;
  available: boolean;
}

export class AIProviderRegistry {
  public constructor(private readonly factory = new AIProviderFactory()) {}

  public async list(): Promise<ProviderStatus[]> {
    const providers = this.factory
      .createAll()
      .filter((provider) => provider.name !== "deepseek" || env.DEEPSEEK_API_KEY?.trim().length);
    const statuses = await Promise.all(
      providers.map(async (provider) => ({
        name: provider.name as AIProviderName,
        model: provider.model,
        available: await provider.isAvailable()
      }))
    );

    return statuses;
  }

  public async getActiveProviderName(): Promise<AIProviderName> {
    const record = await db.query.aiProviderSettings.findFirst({
      where: eq(aiProviderSettings.key, ACTIVE_PROVIDER_KEY)
    });

    return parseProviderName(record?.provider) ?? env.AI_DEFAULT_PROVIDER ?? "anthropic";
  }

  public async getActiveProvider(): Promise<AIProvider> {
    const providerName = await this.getActiveProviderName();
    return this.factory.create(providerName);
  }

  public async setActiveProvider(name: AIProviderName): Promise<ProviderStatus> {
    const provider = this.factory.create(name);
    const available = await provider.isAvailable();

    if (!available) {
      throw new AppError(`Provider ${name} belum siap digunakan`, "AI_PROVIDER_UNAVAILABLE", 400);
    }

    await db
      .insert(aiProviderSettings)
      .values({
        key: ACTIVE_PROVIDER_KEY,
        provider: name,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: aiProviderSettings.key,
        set: {
          provider: name,
          updatedAt: new Date()
        }
      });

    return {
      name,
      model: provider.model,
      available
    };
  }
}

function parseProviderName(value: string | undefined): AIProviderName | null {
  if (value === "openai" || value === "anthropic" || value === "google" || value === "deepseek") {
    return value;
  }

  return null;
}
