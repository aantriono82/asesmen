import { EmbeddingService } from "@infra/ai/embedding.service";
import { getFileStorage } from "@infra/storage";
import { NotificationService } from "@infra/notifications/notification.service";
import { cleanDocumentText } from "./text-cleaner";
import { ChunkingEngine } from "./chunker";
import { ParserFactory } from "./parsers/parser.factory";
import { DrizzleDocumentRepository } from "@infra/repositories/drizzle-document.repository";

export class DocumentProcessorService {
  public constructor(
    private readonly repository = new DrizzleDocumentRepository(),
    private readonly storage = getFileStorage(),
    private readonly embeddings = new EmbeddingService(),
    private readonly notifications = new NotificationService(),
    private readonly chunker = new ChunkingEngine()
  ) {}

  public async process(input: { documentId: string; userId: string }): Promise<void> {
    const document = await this.repository.getDocument(input.documentId, input.userId);
    if (!document) {
      return;
    }

    await this.repository.updateDocument(document.id, input.userId, {
      status: "processing",
      errorMessage: null
    });

    try {
      const parser = ParserFactory.create(document.fileType);
      const buffer = await this.storage.download(document.filePath);
      const parsed = await parser.parse(buffer);
      const cleanedText = cleanDocumentText(parsed.text);
      const chunks = this.chunker.chunk({
        documentId: document.id,
        text: cleanedText,
        ...(parsed.pages ? { pages: parsed.pages } : {}),
        strategy: parsed.pages?.length ? "by_page" : "sliding_window"
      });
      const vectors = await this.embeddings.embedTexts(chunks.map((chunk) => chunk.content));

      await this.repository.replaceDocumentChunks(
        document.id,
        chunks.map((chunk, index) => ({
          content: chunk.content,
          pageNumber: chunk.metadata.pageNumber,
          chunkIndex: chunk.metadata.chunkIndex,
          tokenCount: chunk.metadata.tokenCount,
          embedding: vectors[index] ?? null
        }))
      );

      await this.repository.updateDocument(document.id, input.userId, {
        status: "completed",
        chunkCount: chunks.length,
        errorMessage: null
      });
      await this.notifications.create({
        userId: input.userId,
        type: "document_processed",
        title: `Dokumen ${document.title} selesai diproses`,
        message: `${chunks.length} chunk siap dipakai untuk RAG.`,
        metadata: { documentId: document.id, chunkCount: chunks.length }
      });
    } catch (error: unknown) {
      await this.repository.updateDocument(document.id, input.userId, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error"
      });
      await this.notifications.create({
        userId: input.userId,
        type: "system",
        title: `Dokumen ${document.title} gagal diproses`,
        message: error instanceof Error ? error.message : "Unknown error",
        metadata: { documentId: document.id }
      });
      throw error;
    }
  }
}
