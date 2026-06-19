import type { AIProvider } from "./providers/base.provider";
import { AnthropicProvider } from "./providers/anthropic.provider";
import { DeepSeekProvider } from "./providers/deepseek.provider";
import { GoogleProvider } from "./providers/google.provider";
import { OpenAIProvider } from "./providers/openai.provider";

export type AIProviderName = "openai" | "anthropic" | "google" | "deepseek";

export class AIProviderFactory {
  public create(name: AIProviderName): AIProvider {
    switch (name) {
      case "openai":
        return new OpenAIProvider();
      case "anthropic":
        return new AnthropicProvider();
      case "google":
        return new GoogleProvider();
      case "deepseek":
        return new DeepSeekProvider();
      default: {
        const exhaustive: never = name;
        throw new Error(`Provider tidak dikenali: ${exhaustive}`);
      }
    }
  }

  public createAll(): AIProvider[] {
    return (["openai", "anthropic", "google", "deepseek"] as AIProviderName[]).map((name) => this.create(name));
  }
}
