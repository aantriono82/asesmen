import { describe, expect, it, vi } from "vitest";

const completeMock = vi.fn();

const provider = {
  name: "deepseek",
  model: "deepseek-chat",
  complete: completeMock,
  stream: vi.fn(),
  countTokens: vi.fn(),
  isAvailable: vi.fn()
};

const skill = {
  name: "Generate Soal Pilihan Ganda",
  slug: "generate-soal-pilihan-ganda",
  version: "1.0.0",
  category: "assessment",
  description: "Membuat soal",
  author: "ATIGA",
  tags: [],
  preferredModel: null,
  isActive: true,
  filePath: "/skills/generate-soal-pilihan-ganda/skill.md",
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
};

describe("skill ai runtime", () => {
  it("unwraps array output nested in common wrapper fields", async () => {
    completeMock.mockResolvedValue({
      text: JSON.stringify({
        result: {
          questions: [
            {
              content: "Organ utama sistem pernapasan adalah...",
              choices: [
                { key: "A", text: "Paru-paru" },
                { key: "B", text: "Jantung" },
                { key: "C", text: "Ginjal" },
                { key: "D", text: "Lambung" }
              ],
              answer: "A",
              rationale: "Paru-paru melakukan pertukaran gas."
            }
          ]
        }
      }),
      finishReason: "stop",
      usage: { inputTokens: 1, outputTokens: 1 },
      toolCalls: []
    });

    const { executeSkillWithAI } = await import("../src/application/skills/skill-ai-runtime");
    const result = await executeSkillWithAI(provider as never, skill as never, { topic: "Sistem Pernapasan" });

    expect(result.output).toEqual([
      {
        content: "Organ utama sistem pernapasan adalah...",
        choices: [
          { key: "A", text: "Paru-paru" },
          { key: "B", text: "Jantung" },
          { key: "C", text: "Ginjal" },
          { key: "D", text: "Lambung" }
        ],
        answer: "A",
        rationale: "Paru-paru melakukan pertukaran gas."
      }
    ]);
  });
});
