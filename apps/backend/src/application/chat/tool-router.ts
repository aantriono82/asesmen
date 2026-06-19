import { loadSkillsFromDirectory } from "@infra/skills/skill-loader";
import type { ToolDefinition } from "@infra/ai/providers/base.provider";
import { DrizzleSkillRepository } from "@infra/repositories/drizzle-skill-repository";
import { executeSkillWithAI } from "@app/skills/skill-ai-runtime";
import type { AIProvider } from "@infra/ai/providers/base.provider";
import { AppError } from "@lib/errors";

const skillRepository = new DrizzleSkillRepository();

export interface ToolExecutionResult {
  name: string;
  output: Record<string, unknown> | unknown[];
}

export class ToolRouter {
  public constructor(private readonly skills = skillRepository) {}

  public async getToolDefinitions(): Promise<ToolDefinition[]> {
    const [dbSkills, fileSkills] = await Promise.all([this.skills.findActive(), loadSkillsFromDirectory()]);
    const activeSlugs = new Set(dbSkills.filter((skill) => skill.isActive).map((skill) => skill.slug));

    return fileSkills
      .filter((skill) => skill.isActive && activeSlugs.has(skill.slug))
      .map((skill) => ({
        name: skill.slug,
        description: skill.description,
        inputSchema: skill.inputSchema
      }));
  }

  public async executeTool(provider: AIProvider, toolName: string, input: Record<string, unknown>): Promise<ToolExecutionResult> {
    const skill = await loadSkillsFromDirectory().then((items) => items.find((item) => item.slug === toolName));
    if (!skill || !skill.isActive) {
      throw new AppError(`Tool ${toolName} tidak ditemukan`, "CHAT_TOOL_NOT_FOUND", 404);
    }

    const result = await executeSkillWithAI(provider, skill, input);

    return {
      name: toolName,
      output: result.output
    };
  }
}
