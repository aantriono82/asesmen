import type { SkillDefinition } from "@domain/entities/skill";
import type { SkillRepository } from "@domain/repositories/skill-repository";
import { AppError } from "@lib/errors";
import { loadSkillBySlug, loadSkillsFromDirectory } from "@infra/skills/skill-loader";

export class ListSkillsUseCase {
  public constructor(private readonly skills: SkillRepository) {}

  public async execute(input?: { category?: string; search?: string }): Promise<SkillDefinition[]> {
    const dbSkills = await this.skills.findActive();
    const fileSkills = await loadSkillsFromDirectory();
    const activeSlugs = new Set(dbSkills.map((skill) => skill.slug));
    const category = input?.category?.trim().toLowerCase();
    const search = input?.search?.trim().toLowerCase();

    return fileSkills
      .filter((skill) => activeSlugs.size === 0 || activeSlugs.has(skill.slug))
      .filter((skill) => (category ? skill.category.toLowerCase() === category : true))
      .filter((skill) => {
        if (!search) {
          return true;
        }

        const searchable = [
          skill.name,
          skill.description,
          skill.category,
          skill.tags.join(" "),
          skill.promptTemplate,
          skill.sections.description,
          skill.sections.inputs,
          skill.sections.outputs,
          skill.sections.workflow,
          skill.sections.examples
        ]
          .join(" ")
          .toLowerCase();

        return searchable.includes(search);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}

export class GetSkillBySlugUseCase {
  public constructor(private readonly skills: SkillRepository) {}

  public async execute(slug: string): Promise<SkillDefinition> {
    const dbSkill = await this.skills.findActiveBySlug(slug);
    const fileSkill = await loadSkillBySlug(slug);

    if (!fileSkill || !fileSkill.isActive) {
      throw new AppError("Skill tidak ditemukan", "SKILL_NOT_FOUND", 404);
    }

    if (dbSkill && !dbSkill.isActive) {
      throw new AppError("Skill tidak aktif", "SKILL_NOT_FOUND", 404);
    }

    return fileSkill;
  }
}

export class SyncSkillsUseCase {
  public constructor(private readonly skills: SkillRepository) {}

  public async execute(): Promise<SkillDefinition[]> {
    const fileSkills = await loadSkillsFromDirectory();
    const activeSlugs = fileSkills.map((skill) => skill.slug);

    await Promise.all(
      fileSkills.map((skill) =>
        this.skills.syncSkill({
          name: skill.name,
          slug: skill.slug,
          description: skill.description,
          filePath: skill.filePath,
          version: skill.version,
          category: skill.category,
          tags: skill.tags,
          inputSchema: skill.inputSchema,
          outputSchema: skill.outputSchema,
          promptTemplate: skill.promptTemplate,
          preferredModel: skill.preferredModel,
          isActive: skill.isActive
        })
      )
    );

    await this.skills.deactivateMissing(activeSlugs);

    return fileSkills;
  }
}
