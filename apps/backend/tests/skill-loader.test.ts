import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadSkillsFromDirectory } from "../src/infrastructure/skills/skill-loader";

describe("skill-loader", () => {
  it("parses YAML frontmatter and sections", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "skill-loader-"));
    const skillDir = path.join(tempRoot, "demo-skill");
    await mkdir(skillDir, { recursive: true });

    await writeFile(
      path.join(skillDir, "skill.md"),
      `---
name: Demo Skill
slug: demo-skill
version: 1.0.0
category: assessment
description: Skill demo
author: ATIGA
tags: demo, test
is_active: true
---

## Inputs
\`\`\`json
{"type":"object","required":["topic"],"properties":{"topic":{"type":"string"}}}
\`\`\`

## Outputs
\`\`\`json
{"type":"object","required":["result"],"properties":{"result":{"type":"string"}}}
\`\`\`

## Prompt
Use the provided input.
`
    );

    const skills = await loadSkillsFromDirectory(tempRoot);
    expect(skills).toHaveLength(1);
    expect(skills[0]?.slug).toBe("demo-skill");
    expect(skills[0]?.tags).toEqual(["demo", "test"]);
    expect(skills[0]?.inputSchema).toMatchObject({ type: "object" });
    expect(skills[0]?.promptTemplate).toContain("Use the provided input");
  });
});
