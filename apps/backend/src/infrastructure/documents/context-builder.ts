import { estimateTokenCount } from "./chunker";

export interface ContextChunk {
  documentTitle: string;
  content: string;
  pageNumber: number | null;
  score: number;
  tokenCount?: number;
}

export type ContextFormat = "plain" | "markdown" | "xml";

export class ContextBuilder {
  public build(
    chunks: ContextChunk[],
    options: { maxTokens?: number; format?: ContextFormat } = {}
  ): string {
    const maxTokens = options.maxTokens ?? 4_000;
    const format = options.format ?? "plain";
    const selected: ContextChunk[] = [];
    let usedTokens = 0;

    for (const chunk of chunks) {
      const chunkTokens = chunk.tokenCount ?? estimateTokenCount(chunk.content);
      if (selected.length > 0 && usedTokens + chunkTokens > maxTokens) {
        break;
      }
      selected.push(chunk);
      usedTokens += chunkTokens;
    }

    if (format === "markdown") {
      return selected
        .map(
          (chunk, index) =>
            `### Referensi ${index + 1}\nDokumen: ${chunk.documentTitle}\nHalaman: ${chunk.pageNumber ?? "-"}\nSkor: ${chunk.score.toFixed(3)}\n\n${chunk.content}`
        )
        .join("\n\n");
    }

    if (format === "xml") {
      return [
        "<context>",
        ...selected.map(
          (chunk, index) =>
            `  <chunk index="${index + 1}" document="${escapeXml(chunk.documentTitle)}" page="${chunk.pageNumber ?? ""}" score="${chunk.score.toFixed(3)}">${escapeXml(chunk.content)}</chunk>`
        ),
        "</context>"
      ].join("\n");
    }

    return selected
      .map(
        (chunk, index) =>
          `[Referensi ${index + 1}] Dokumen: ${chunk.documentTitle} | Halaman: ${chunk.pageNumber ?? "-"} | Skor: ${chunk.score.toFixed(3)}\n${chunk.content}`
      )
      .join("\n\n");
  }
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
