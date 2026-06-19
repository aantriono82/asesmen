export type ChunkStrategy = "sliding_window" | "by_paragraph" | "by_page" | "fixed_size";

export interface ChunkMetadata {
  documentId: string;
  pageNumber: number | null;
  chunkIndex: number;
  tokenCount: number;
}

export interface ChunkRecord {
  content: string;
  metadata: ChunkMetadata;
}

export interface ChunkInput {
  documentId: string;
  text: string;
  pages?: string[];
  strategy?: ChunkStrategy;
  chunkSize?: number;
  overlap?: number;
}

const DEFAULT_CHUNK_SIZE = 512;
const DEFAULT_OVERLAP = 50;

export class ChunkingEngine {
  public chunk(input: ChunkInput): ChunkRecord[] {
    const strategy = input.strategy ?? "sliding_window";
    const chunkSize = input.chunkSize ?? DEFAULT_CHUNK_SIZE;
    const overlap = input.overlap ?? DEFAULT_OVERLAP;

    if (strategy === "by_page" && input.pages?.length) {
      return input.pages.flatMap((page, index) =>
        this.buildSlidingWindowChunks(input.documentId, page, chunkSize, overlap, index + 1)
      );
    }

    if (strategy === "by_paragraph") {
      return input.text
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph, index) => ({
          content: paragraph,
          metadata: {
            documentId: input.documentId,
            pageNumber: null,
            chunkIndex: index,
            tokenCount: estimateTokenCount(paragraph)
          }
        }));
    }

    if (strategy === "fixed_size") {
      return this.buildFixedChunks(input.documentId, input.text, chunkSize);
    }

    return this.buildSlidingWindowChunks(input.documentId, input.text, chunkSize, overlap, null);
  }

  private buildSlidingWindowChunks(
    documentId: string,
    text: string,
    chunkSize: number,
    overlap: number,
    pageNumber: number | null
  ): ChunkRecord[] {
    const sentences = splitSentences(text);
    const chunks: ChunkRecord[] = [];
    let index = 0;
    let chunkIndex = 0;

    while (index < sentences.length) {
      const selected: string[] = [];
      let tokenCount = 0;
      let cursor = index;

      while (cursor < sentences.length) {
        const sentence = sentences[cursor] ?? "";
        const sentenceTokens = estimateTokenCount(sentence);
        if (selected.length > 0 && tokenCount + sentenceTokens > chunkSize) {
          break;
        }

        selected.push(sentence);
        tokenCount += sentenceTokens;
        cursor += 1;
      }

      if (selected.length === 0 && sentences[index]) {
        selected.push(sentences[index] as string);
        tokenCount = estimateTokenCount(sentences[index] as string);
        cursor = index + 1;
      }

      const content = selected.join(" ").trim();
      if (content.length > 0) {
        chunks.push({
          content,
          metadata: {
            documentId,
            pageNumber,
            chunkIndex,
            tokenCount
          }
        });
        chunkIndex += 1;
      }

      if (cursor >= sentences.length) {
        break;
      }

      let overlapTokens = 0;
      let nextIndex = cursor;
      for (let rewind = cursor - 1; rewind >= index; rewind -= 1) {
        overlapTokens += estimateTokenCount(sentences[rewind] as string);
        if (overlapTokens >= overlap) {
          nextIndex = rewind;
          break;
        }
      }

      index = Math.max(index + 1, nextIndex);
    }

    return chunks;
  }

  private buildFixedChunks(documentId: string, text: string, chunkSize: number): ChunkRecord[] {
    const words = text.split(/\s+/).filter(Boolean);
    const chunks: ChunkRecord[] = [];

    for (let index = 0; index < words.length; index += chunkSize) {
      const content = words.slice(index, index + chunkSize).join(" ").trim();
      if (!content) {
        continue;
      }

      chunks.push({
        content,
        metadata: {
          documentId,
          pageNumber: null,
          chunkIndex: chunks.length,
          tokenCount: estimateTokenCount(content)
        }
      });
    }

    return chunks;
  }
}

export function estimateTokenCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words * 1.35));
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}
