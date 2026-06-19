import { loadSkillsFromDirectory } from "@infra/skills/skill-loader";

export interface SkillDiscoveryInput {
  query?: string;
  category?: string;
  limit?: number;
}

export interface SkillDiscoveryResult {
  skills: Array<
    Awaited<ReturnType<typeof loadSkillsFromDirectory>>[number] & {
      relevance: number;
    }
  >;
  total: number;
}

export class SkillDiscoveryUseCase {
  public async execute(input: SkillDiscoveryInput): Promise<SkillDiscoveryResult> {
    const skills = await loadSkillsFromDirectory();
    const category = input.category?.trim().toLowerCase();
    const query = input.query?.trim().toLowerCase();
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const ranked = skills
      .filter((skill) => (category ? skill.category.toLowerCase() === category : true))
      .map((skill) => ({
        ...skill,
        relevance: scoreSkill(skill, query)
      }))
      .filter((skill) => (query ? skill.relevance > 0 : true))
      .sort((a, b) => {
        if (b.relevance !== a.relevance) {
          return b.relevance - a.relevance;
        }

        return a.name.localeCompare(b.name);
      });

    return {
      skills: ranked.slice(0, limit),
      total: ranked.length
    };
  }
}

function scoreSkill(
  skill: Awaited<ReturnType<typeof loadSkillsFromDirectory>>[number],
  query: string | undefined
): number {
  if (!query) {
    return 1;
  }

  const tokens = query.split(/\s+/).filter(Boolean);
  const haystack = [
    skill.name,
    skill.description,
    skill.category,
    skill.tags.join(" "),
    skill.sections.description,
    skill.sections.workflow,
    skill.sections.examples,
    skill.sections.prompt
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) {
      score += 2;
    }

    if (skill.name.toLowerCase().includes(token)) {
      score += 3;
    }

    if (skill.tags.some((tag) => tag.toLowerCase().includes(token))) {
      score += 2;
    }
  }

  return score;
}
