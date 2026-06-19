import type { SkillEntity } from "@domain/entities/skill";

export interface SkillRepository {
  findActive(): Promise<SkillEntity[]>;
  findAll(): Promise<SkillEntity[]>;
  findActiveBySlug(slug: string): Promise<SkillEntity | null>;
  findBySlug(slug: string): Promise<SkillEntity | null>;
  syncSkill(input: {
    name: string;
    slug: string;
    description: string;
    filePath: string;
    version: string;
    category: string;
    tags: string[];
    inputSchema: Record<string, unknown>;
    outputSchema: Record<string, unknown>;
    promptTemplate: string;
    preferredModel: string | null;
    isActive: boolean;
  }): Promise<SkillEntity>;
  deactivateMissing(activeSlugs: string[]): Promise<number>;
}
