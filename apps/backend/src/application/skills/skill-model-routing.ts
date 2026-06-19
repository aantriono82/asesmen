import type { SkillDefinition } from "@domain/entities/skill";

export function resolveModel(skill: Pick<SkillDefinition, "preferredModel">, activeProvider: string): string | undefined {
  if (activeProvider !== "deepseek") {
    return undefined;
  }

  if (typeof skill.preferredModel === "string" && skill.preferredModel.trim().length > 0) {
    return skill.preferredModel;
  }

  return undefined;
}
