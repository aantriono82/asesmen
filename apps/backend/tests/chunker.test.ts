import { describe, expect, it } from "vitest";
import { ChunkingEngine } from "../src/infrastructure/documents/chunker";

describe("chunker", () => {
  it("creates sliding window chunks with overlap metadata", () => {
    const engine = new ChunkingEngine();
    const chunks = engine.chunk({
      documentId: "doc-1",
      text: "Kalimat satu. Kalimat dua. Kalimat tiga. Kalimat empat.",
      chunkSize: 6,
      overlap: 2
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.metadata.documentId).toBe("doc-1");
    expect(chunks[1]?.content).toContain("Kalimat");
  });
});
