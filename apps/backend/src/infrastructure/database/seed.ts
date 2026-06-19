import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./client";
import { shutdownDatabase } from "./client";
import { skills, users } from "./schema";
import { loadSkillsFromDirectory } from "@infra/skills/skill-loader";

async function seed(): Promise<void> {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, "admin@atiga.id")
  });

  if (!existing) {
    const passwordHash = await bcrypt.hash("admin123", 12);
    await db.insert(users).values({
      name: "ATIGA Admin",
      email: "admin@atiga.id",
      passwordHash,
      role: "admin",
      isActive: true
    });
  }

  const fileSkills = await loadSkillsFromDirectory();
  for (const skill of fileSkills) {
    const existingSkill = await db.query.skills.findFirst({
      where: eq(skills.slug, skill.slug)
    });

    if (existingSkill) {
      continue;
    }

    await db.insert(skills).values({
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
      isActive: skill.isActive
    });
  }
}

seed()
  .then(async () => {
    await shutdownDatabase();
    console.log("Seed completed: admin@atiga.id / admin123");
  })
  .catch(async (error: unknown) => {
    await shutdownDatabase();
    console.error(error);
    process.exit(1);
  });
