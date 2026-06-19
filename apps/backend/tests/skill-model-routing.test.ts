import { describe, expect, it } from "vitest";
import { resolveModel } from "../src/application/skills/skill-model-routing";

describe("skill model routing", () => {
  it("returns preferred model when provider is deepseek and skill defines it", () => {
    expect(resolveModel({ preferredModel: "deepseek-reasoner" }, "deepseek")).toBe("deepseek-reasoner");
  });

  it("returns undefined when provider is not deepseek", () => {
    expect(resolveModel({ preferredModel: "deepseek-reasoner" }, "openai")).toBeUndefined();
  });

  it("returns undefined when deepseek skill has no preferred model", () => {
    expect(resolveModel({ preferredModel: null }, "deepseek")).toBeUndefined();
  });
});
