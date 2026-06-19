import { describe, expect, it } from "vitest";
import { ContextBuilder } from "../src/infrastructure/documents/context-builder";

describe("context builder", () => {
  it("builds markdown context within token budget", () => {
    const builder = new ContextBuilder();
    const context = builder.build(
      [
        { documentTitle: "Doc A", content: "Isi A", pageNumber: 1, score: 0.9, tokenCount: 2 },
        { documentTitle: "Doc B", content: "Isi B", pageNumber: 2, score: 0.8, tokenCount: 2 }
      ],
      { format: "markdown", maxTokens: 3 }
    );

    expect(context).toContain("Referensi 1");
    expect(context).not.toContain("Referensi 2");
  });
});
