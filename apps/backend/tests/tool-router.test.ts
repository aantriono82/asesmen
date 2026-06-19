import { describe, expect, it, vi } from "vitest";

vi.mock("../src/infrastructure/skills/skill-loader", () => ({
  loadSkillsFromDirectory: vi.fn()
}));

vi.mock("../src/application/skills/skill-ai-runtime", () => ({
  executeSkillWithAI: vi.fn()
}));

describe("tool router", () => {
  it("maps active skills to tool definitions and executes tool", async () => {
    const { loadSkillsFromDirectory } = await import("../src/infrastructure/skills/skill-loader");
    const { executeSkillWithAI } = await import("../src/application/skills/skill-ai-runtime");

    vi.mocked(loadSkillsFromDirectory).mockResolvedValue([
      {
        name: "Generate Soal Pilihan Ganda",
        slug: "generate-soal-pilihan-ganda",
        version: "1.0.0",
        category: "assessment",
        description: "Membuat soal pilihan ganda",
        author: "ATIGA",
        tags: ["assessment"],
        isActive: true,
        filePath: "/skills/generate-soal-pilihan-ganda/skill.md",
        inputSchema: { type: "object", properties: { topic: { type: "string" } } },
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

    vi.mocked(executeSkillWithAI).mockResolvedValue({
      prompt: "prompt",
      completion: {
        text: "{}",
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 20 },
        toolCalls: []
      },
      output: { questions: [] }
    });

    const { ToolRouter } = await import("../src/application/chat/tool-router");
    const router = new ToolRouter({
      findActive: vi.fn().mockResolvedValue([{ slug: "generate-soal-pilihan-ganda", isActive: true }])
    } as never);

    const tools = await router.getToolDefinitions();
    const result = await router.executeTool(
      {
        name: "anthropic",
        model: "claude-sonnet-4-6",
        complete: vi.fn(),
        stream: vi.fn(),
        countTokens: vi.fn(),
        isAvailable: vi.fn()
      },
      "generate-soal-pilihan-ganda",
      { topic: "Fotosintesis" }
    );

    expect(tools).toEqual([
      {
        name: "generate-soal-pilihan-ganda",
        description: "Membuat soal pilihan ganda",
        inputSchema: { type: "object", properties: { topic: { type: "string" } } }
      }
    ]);
    expect(result).toEqual({
      name: "generate-soal-pilihan-ganda",
      output: { questions: [] }
    });
  });
});
