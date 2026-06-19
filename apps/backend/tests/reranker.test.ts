import { describe, expect, it } from "vitest";
import { Reranker } from "../src/infrastructure/documents/reranker";

describe("reranker", () => {
  it("prioritizes similarity and keyword matches", () => {
    const reranker = new Reranker();
    const ranked = reranker.rerank("fotosintesis klorofil", [
      {
        id: "a",
        content: "Klorofil penting untuk fotosintesis pada tumbuhan.",
        similarity: 0.8,
        createdAt: new Date().toISOString()
      },
      {
        id: "b",
        content: "Materi lain tanpa kata kunci.",
        similarity: 0.82,
        createdAt: new Date(Date.now() - 400 * 86_400_000).toISOString()
      }
    ]);

    expect(ranked[0]?.id).toBe("a");
    expect(ranked[0]?.finalScore).toBeGreaterThan(ranked[1]?.finalScore ?? 0);
  });
});
