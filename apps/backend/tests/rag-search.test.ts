import { describe, expect, it, vi } from "vitest";
import { RetrievalService } from "../src/infrastructure/documents/retrieval.service";

describe("rag search", () => {
  it("returns reranked results from vector query", async () => {
    const service = new RetrievalService(
      { embedQuery: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]) } as never,
      { rerank: vi.fn().mockImplementation((_query, results) => results.map((item: { row: unknown }) => ({ ...item, finalScore: 0.9 }))) } as never
    );
    const poolModule = await import("../src/infrastructure/database/connection");
    const querySpy = vi.spyOn(poolModule.pool, "query").mockResolvedValue({
      rows: [
        {
          chunk_id: "chunk-1",
          document_id: "doc-1",
          document_title: "Modul",
          content: "Isi modul",
          page_number: 1,
          token_count: 10,
          similarity: 0.88,
          created_at: new Date()
        }
      ]
    } as never);

    const results = await service.search("isi modul", { document_ids: ["doc-1"] });
    expect(results[0]?.documentId).toBe("doc-1");
    querySpy.mockRestore();
  });
});
