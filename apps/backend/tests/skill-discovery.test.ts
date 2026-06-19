import { describe, expect, it, vi } from "vitest";
import { SkillDiscoveryUseCase } from "../src/application/skills/skill-discovery.use-case";

vi.mock("../src/infrastructure/skills/skill-loader", () => ({
  loadSkillsFromDirectory: vi.fn()
}));

describe("SkillDiscoveryUseCase", () => {
  it("ranks skills by query relevance", async () => {
    const { loadSkillsFromDirectory } = await import("../src/infrastructure/skills/skill-loader");
    vi.mocked(loadSkillsFromDirectory).mockResolvedValue([
      {
        name: "Generate Soal Pilihan Ganda",
        slug: "generate-soal-pilihan-ganda",
        version: "1.0.0",
        category: "assessment",
        description: "Membuat soal pilihan ganda matematika",
        author: "ATIGA",
        tags: ["matematika", "pilihan-ganda"],
        isActive: true,
        filePath: "/skills/a/skill.md",
        inputSchema: {},
        outputSchema: {},
        promptTemplate: "",
        sections: {
          description: "",
          inputs: "",
          outputs: "",
          workflow: "",
          examples: "",
          prompt: ""
        }
      },
      {
        name: "Generate Rubrik",
        slug: "generate-rubrik",
        version: "1.0.0",
        category: "assessment",
        description: "Membuat rubrik penilaian",
        author: "ATIGA",
        tags: ["rubrik"],
        isActive: true,
        filePath: "/skills/b/skill.md",
        inputSchema: {},
        outputSchema: {},
        promptTemplate: "",
        sections: {
          description: "",
          inputs: "",
          outputs: "",
          workflow: "",
          examples: "",
          prompt: ""
        }
      }
    ]);

    const useCase = new SkillDiscoveryUseCase();
    const result = await useCase.execute({
      query: "soal pilihan ganda matematika",
      category: "assessment",
      limit: 10
    });

    expect(result.total).toBe(1);
    expect(result.skills[0]?.slug).toBe("generate-soal-pilihan-ganda");
  });
});
