import { pool } from "@infra/database/connection";
import { EmbeddingService } from "@infra/ai/embedding.service";
import { Reranker } from "./reranker";

export interface RetrievalResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  pageNumber: number | null;
  tokenCount: number;
  similarity: number;
  score: number;
  createdAt: Date;
}

export class RetrievalService {
  public constructor(
    private readonly embeddings = new EmbeddingService(),
    private readonly reranker = new Reranker()
  ) {}

  public async search(
    query: string,
    options: {
      knowledge_base_id?: string;
      document_ids?: string[];
      top_k?: number;
      threshold?: number;
    } = {}
  ): Promise<RetrievalResult[]> {
    const vector = await this.embeddings.embedQuery(query);
    const topK = options.top_k ?? 10;
    const threshold = options.threshold ?? 0.7;
    const params: unknown[] = [`[${vector.join(",")}]`, topK, threshold];

    const filters: string[] = [
      `d.deleted_at IS NULL`,
      `d.status = 'completed'`
    ];

    if (options.knowledge_base_id) {
      params.push(options.knowledge_base_id);
      filters.push(`kbd.knowledge_base_id = $${params.length}`);
      filters.push(`kbd.deleted_at IS NULL`);
    }

    if (options.document_ids && options.document_ids.length > 0) {
      params.push(options.document_ids);
      filters.push(`d.id = ANY($${params.length}::uuid[])`);
    }

    const joinKnowledgeBase = options.knowledge_base_id
      ? `INNER JOIN knowledge_base_documents kbd ON kbd.document_id = d.id`
      : "";

    const queryText = `
      SELECT
        dc.id AS chunk_id,
        dc.document_id,
        d.title AS document_title,
        dc.content,
        dc.page_number,
        dc.token_count,
        d.created_at,
        1 - (dc.embedding <=> $1::vector) AS similarity
      FROM document_chunks dc
      INNER JOIN documents d ON d.id = dc.document_id
      ${joinKnowledgeBase}
      WHERE dc.embedding IS NOT NULL
        AND ${filters.join("\n        AND ")}
        AND 1 - (dc.embedding <=> $1::vector) >= $3
      ORDER BY dc.embedding <=> $1::vector
      LIMIT $2
    `;

    const result = await pool.query<{
      chunk_id: string;
      document_id: string;
      document_title: string;
      content: string;
      page_number: number | null;
      token_count: number;
      similarity: number;
      created_at: Date;
    }>(queryText, params);

    const ranked = this.reranker.rerank(
      query,
      result.rows.map((row) => ({
        id: row.chunk_id,
        content: row.content,
        similarity: Number(row.similarity),
        createdAt: row.created_at,
        row
      }))
    );

    return ranked.map((item) => ({
      chunkId: item.id,
      documentId: item.row.document_id,
      documentTitle: item.row.document_title,
      content: item.row.content,
      pageNumber: item.row.page_number,
      tokenCount: item.row.token_count,
      similarity: Number(item.row.similarity),
      score: item.finalScore,
      createdAt: item.row.created_at
    }));
  }
}
