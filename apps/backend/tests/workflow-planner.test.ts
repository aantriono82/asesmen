import { describe, expect, it, vi } from "vitest";
import { runWorkflowSteps } from "../src/application/workflows/workflow-planner.use-case";

vi.mock("../src/infrastructure/skills/skill-loader", () => ({
  loadSkillBySlug: vi.fn()
}));

describe("workflow planner", () => {
  it("maps output from one step into the next step input", async () => {
    const { loadSkillBySlug } = await import("../src/infrastructure/skills/skill-loader");
    vi.mocked(loadSkillBySlug).mockImplementation(async (slug: string) => {
      if (slug === "generate-soal-pilihan-ganda") {
        return {
          name: "Generate Soal Pilihan Ganda",
          slug,
          version: "1.0.0",
          category: "assessment",
          description: "Membuat soal",
          author: "ATIGA",
          tags: [],
          isActive: true,
          filePath: "/skills/a/skill.md",
          inputSchema: {
            type: "object",
            required: ["topic"],
            properties: {
              topic: { type: "string" }
            }
          },
          outputSchema: {
            type: "object",
            required: ["questions"],
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  required: ["question"],
                  properties: {
                    question: { type: "string" }
                  }
                }
              }
            }
          },
          promptTemplate: "",
          sections: {
            description: "",
            inputs: "",
            outputs: "",
            workflow: "",
            examples: "",
            prompt: ""
          }
        };
      }

      return {
        name: "Generate Rubrik",
        slug,
        version: "1.0.0",
        category: "assessment",
        description: "Membuat rubrik",
        author: "ATIGA",
        tags: [],
        isActive: true,
        filePath: "/skills/b/skill.md",
        inputSchema: {
          type: "object",
          required: ["questions"],
          properties: {
            questions: {
              type: "array",
              items: {
                type: "string"
              }
            }
          }
        },
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
      };
    });

    const result = await runWorkflowSteps({
      workflow: {
        id: "workflow-id",
        userId: "user-id",
        name: "Workflow Demo",
        description: "",
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
        steps: [
          {
            skillSlug: "generate-soal-pilihan-ganda",
            inputMapping: {
              topic: "input.topic"
            },
            outputKey: "questions"
          },
          {
            skillSlug: "generate-rubrik",
            inputMapping: {
              questions: "questions.questions.*.question"
            },
            outputKey: "rubric"
          }
        ]
      },
      initialInput: {
        topic: "Fotosintesis"
      }
    });

    expect(result.steps).toHaveLength(2);
    expect(result.steps[0]?.input.topic).toBe("Fotosintesis");
    expect(result.steps[1]?.input.questions).toEqual(["Pertanyaan contoh tentang Fotosintesis untuk umum."]);
    expect(result.output.steps).toHaveProperty("questions");
  });
});
