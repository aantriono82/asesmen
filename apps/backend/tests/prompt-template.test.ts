import { describe, expect, it } from "vitest";
import { PromptTemplate, interpolateTemplate } from "../src/infrastructure/ai/prompt-template";

describe("prompt template", () => {
  it("interpolates variables inside user prompt", () => {
    expect(interpolateTemplate("Halo {{name}}, topik {{topic}}", { name: "Guru", topic: "Fotosintesis" })).toBe(
      "Halo Guru, topik Fotosintesis"
    );
  });

  it("supports separate system and user prompts", () => {
    const template = new PromptTemplate({
      system: "Peran: {{role}}",
      user: "Buat soal untuk {{topic}}"
    });

    expect(template.renderPrompts({ role: "guru", topic: "asam basa" })).toEqual({
      systemPrompt: "Peran: guru",
      userPrompt: "Buat soal untuk asam basa"
    });
  });
});
