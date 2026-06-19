import { readFile } from "node:fs/promises";

export interface PromptTemplateSource {
  system?: string;
  user?: string;
}

export interface RenderedPrompt {
  systemPrompt: string;
  userPrompt: string;
}

export class PromptTemplate {
  public constructor(private readonly source: PromptTemplateSource) {}

  public static fromString(template: string): PromptTemplate {
    return new PromptTemplate({
      user: template
    });
  }

  public static async fromFile(filePath: string): Promise<PromptTemplate> {
    const content = await readFile(filePath, "utf8");
    return PromptTemplate.fromString(content);
  }

  public render(variables: Record<string, unknown>): string {
    return interpolateTemplate(this.source.user ?? "", variables);
  }

  public renderPrompts(variables: Record<string, unknown>): RenderedPrompt {
    return {
      systemPrompt: interpolateTemplate(this.source.system ?? "", variables),
      userPrompt: interpolateTemplate(this.source.user ?? "", variables)
    };
  }
}

export function interpolateTemplate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = variables[key];

    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }

    if (value === null || value === undefined) {
      return "";
    }

    return JSON.stringify(value);
  });
}
