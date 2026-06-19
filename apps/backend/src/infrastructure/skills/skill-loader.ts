import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { SkillDefinition } from "@domain/entities/skill";

interface Frontmatter {
  name: string;
  slug: string;
  version: string;
  category: string;
  description: string;
  author: string;
  tags: string[];
  preferred_model: string | null;
  is_active: boolean;
}

const headingMap = {
  Description: "description",
  Inputs: "inputs",
  Outputs: "outputs",
  Workflow: "workflow",
  Examples: "examples",
  Prompt: "prompt"
} as const;

type SectionKey = (typeof headingMap)[keyof typeof headingMap];

export async function loadSkillsFromDirectory(skillsDirectory = resolveSkillsDirectory()): Promise<SkillDefinition[]> {
  const entries = await readdir(skillsDirectory, { withFileTypes: true });
  const skills: SkillDefinition[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const filePath = path.join(skillsDirectory, entry.name, "skill.md");
    const fileStat = await stat(filePath).catch(() => null);
    if (!fileStat?.isFile()) {
      continue;
    }

    skills.push(await parseSkillFile(filePath));
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadSkillBySlug(slug: string): Promise<SkillDefinition | null> {
  const skills = await loadSkillsFromDirectory();
  return skills.find((skill) => skill.slug === slug) ?? null;
}

async function parseSkillFile(filePath: string): Promise<SkillDefinition> {
  const content = await readFile(filePath, "utf8");
  const { frontmatter, body } = parseFrontmatter(content);
  const sections = parseSections(body);

  return {
    name: frontmatter.name,
    slug: frontmatter.slug,
    version: frontmatter.version,
    category: frontmatter.category,
    description: frontmatter.description,
    author: frontmatter.author,
    tags: frontmatter.tags,
    preferredModel: frontmatter.preferred_model,
    isActive: frontmatter.is_active,
    filePath,
    inputSchema: parseJsonSection(sections.inputs),
    outputSchema: parseJsonSection(sections.outputs),
    promptTemplate: sections.prompt.trim(),
    sections
  };
}

function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(content);
  if (!match) {
    throw new Error("Skill file must contain YAML frontmatter");
  }

  const rawFrontmatter = match[1];
  const body = match[2] ?? "";
  if (!rawFrontmatter) {
    throw new Error("Skill file frontmatter is empty");
  }
  const values = new Map<string, string | boolean | string[]>();

  for (const line of rawFrontmatter.split("\n")) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    if (key === "tags") {
      values.set(key, rawValue.length > 0 ? rawValue.split(",").map((tag) => tag.trim()).filter(Boolean) : []);
      continue;
    }

    values.set(key, rawValue === "true" ? true : rawValue === "false" ? false : rawValue);
  }

  return {
    frontmatter: {
      name: readString(values, "name"),
      slug: readString(values, "slug"),
      version: readString(values, "version"),
      category: readString(values, "category"),
      description: readString(values, "description"),
      author: readString(values, "author"),
      tags: readTags(values, "tags"),
      preferred_model: readOptionalString(values, "preferred_model"),
      is_active: readBoolean(values, "is_active")
    },
    body
  };
}

function parseSections(body: string): SkillDefinition["sections"] {
  const sections: Record<SectionKey, string> = {
    description: "",
    inputs: "",
    outputs: "",
    workflow: "",
    examples: "",
    prompt: ""
  };

  const parts = body.split(/^##\s+/m).filter(Boolean);
  for (const part of parts) {
    const [firstLine, ...rest] = part.split("\n");
    const heading = firstLine?.trim();
    if (!heading || !(heading in headingMap)) {
      continue;
    }

    const key = headingMap[heading as keyof typeof headingMap];
    sections[key] = rest.join("\n").trim();
  }

  return sections;
}

function parseJsonSection(section: string): Record<string, unknown> {
  const trimmed = section.trim();
  if (trimmed.length === 0) {
    return {};
  }

  const fencedMatch = /```(?:json)?\n([\s\S]*?)```/m.exec(trimmed);
  const candidate = fencedMatch?.[1] ?? trimmed;

  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function readString(values: Map<string, string | boolean | string[]>, key: keyof Frontmatter): string {
  const value = values.get(key);
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing string frontmatter value: ${key}`);
  }

  return value;
}

function readBoolean(values: Map<string, string | boolean | string[]>, key: keyof Frontmatter): boolean {
  const value = values.get(key);
  if (typeof value !== "boolean") {
    throw new Error(`Missing boolean frontmatter value: ${key}`);
  }

  return value;
}

function readTags(values: Map<string, string | boolean | string[]>, key: keyof Frontmatter): string[] {
  const value = values.get(key);
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((tag): tag is string => typeof tag === "string" && tag.length > 0);
}

function readOptionalString(values: Map<string, string | boolean | string[]>, key: keyof Frontmatter): string | null {
  const value = values.get(key);
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return value;
}

function resolveSkillsDirectory(): string {
  const fromBackend = path.resolve(process.cwd(), "../../skills");
  const fromRoot = path.resolve(process.cwd(), "skills");
  return process.cwd().endsWith(path.join("apps", "backend")) ? fromBackend : fromRoot;
}
