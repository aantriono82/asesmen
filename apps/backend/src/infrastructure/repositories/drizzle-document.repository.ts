import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@infra/database/client";
import {
  documentChunks,
  documents,
  knowledgeBaseDocuments,
  knowledgeBases,
  type Document,
  type DocumentChunk,
  type KnowledgeBase
} from "@infra/database/schema";
import { withSoftDelete } from "@infra/database/soft-delete";
import { resolvePagination, toPaginatedResult, type PaginatedResult } from "@lib/pagination";

export interface KnowledgeBaseDetail extends KnowledgeBase {
  documentCount: number;
}

export class DrizzleDocumentRepository {
  public async createDocument(input: Omit<typeof documents.$inferInsert, "id" | "createdAt" | "updatedAt">): Promise<Document> {
    const [record] = await db.insert(documents).values(input).returning();
    if (!record) {
      throw new Error("Gagal membuat dokumen");
    }
    return record;
  }

  public async updateDocument(id: string, userId: string, patch: Partial<typeof documents.$inferInsert>): Promise<Document | null> {
    const [record] = await db
      .update(documents)
      .set({ ...patch, updatedAt: new Date() })
      .where(withSoftDelete(documents, and(eq(documents.id, id), eq(documents.userId, userId))))
      .returning();

    return record ?? null;
  }

  public async getDocument(id: string, userId: string): Promise<(Document & { chunks: DocumentChunk[] }) | null> {
    const document = await db.query.documents.findFirst({
      where: withSoftDelete(documents, and(eq(documents.id, id), eq(documents.userId, userId)))
    });
    if (!document) {
      return null;
    }

    const chunks = await db.query.documentChunks.findMany({
      where: eq(documentChunks.documentId, id),
      orderBy: [asc(documentChunks.chunkIndex)]
    });

    return { ...document, chunks };
  }

  public async listDocuments(input: { userId: string; page?: number; limit?: number }): Promise<PaginatedResult<Document>> {
    const pagination = resolvePagination(input.page, input.limit);
    const where = withSoftDelete(documents, eq(documents.userId, input.userId));
    const [items, totalRows] = await Promise.all([
      db.query.documents.findMany({
        where,
        orderBy: [desc(documents.createdAt)],
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit
      }),
      db.select({ count: sql<number>`count(*)` }).from(documents).where(where)
    ]);

    return toPaginatedResult(items, Number(totalRows[0]?.count ?? 0), pagination);
  }

  public async softDeleteDocument(id: string, userId: string): Promise<Document | null> {
    const [record] = await db
      .update(documents)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(withSoftDelete(documents, and(eq(documents.id, id), eq(documents.userId, userId))))
      .returning();

    if (record) {
      await db
        .update(knowledgeBaseDocuments)
        .set({ deletedAt: new Date() })
        .where(and(eq(knowledgeBaseDocuments.documentId, id), isNull(knowledgeBaseDocuments.deletedAt)));
    }

    return record ?? null;
  }

  public async replaceDocumentChunks(
    documentId: string,
    items: Array<Omit<typeof documentChunks.$inferInsert, "id" | "createdAt" | "documentId">>
  ): Promise<void> {
    await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));
    if (items.length === 0) {
      return;
    }
    await db.insert(documentChunks).values(items.map((item) => ({ ...item, documentId })));
  }

  public async createKnowledgeBase(input: Omit<typeof knowledgeBases.$inferInsert, "id" | "createdAt" | "updatedAt">): Promise<KnowledgeBase> {
    const [record] = await db.insert(knowledgeBases).values(input).returning();
    if (!record) {
      throw new Error("Gagal membuat knowledge base");
    }
    return record;
  }

  public async listKnowledgeBases(userId: string): Promise<KnowledgeBaseDetail[]> {
    const rows = await db
      .select({
        base: knowledgeBases,
        documentCount: sql<number>`count(${knowledgeBaseDocuments.documentId})`
      })
      .from(knowledgeBases)
      .leftJoin(
        knowledgeBaseDocuments,
        and(eq(knowledgeBaseDocuments.knowledgeBaseId, knowledgeBases.id), isNull(knowledgeBaseDocuments.deletedAt))
      )
      .where(withSoftDelete(knowledgeBases, eq(knowledgeBases.userId, userId)))
      .groupBy(knowledgeBases.id)
      .orderBy(desc(knowledgeBases.createdAt));

    return rows.map((row) => ({ ...row.base, documentCount: Number(row.documentCount ?? 0) }));
  }

  public async getKnowledgeBase(id: string, userId: string): Promise<(KnowledgeBaseDetail & { documents: Document[] }) | null> {
    const knowledgeBase = await db.query.knowledgeBases.findFirst({
      where: withSoftDelete(knowledgeBases, and(eq(knowledgeBases.id, id), eq(knowledgeBases.userId, userId)))
    });
    if (!knowledgeBase) {
      return null;
    }

    const rows = await db
      .select({ document: documents })
      .from(knowledgeBaseDocuments)
      .innerJoin(documents, eq(documents.id, knowledgeBaseDocuments.documentId))
      .where(
        and(
          eq(knowledgeBaseDocuments.knowledgeBaseId, id),
          isNull(knowledgeBaseDocuments.deletedAt),
          withSoftDelete(documents)
        )
      )
      .orderBy(desc(knowledgeBaseDocuments.addedAt));

    return {
      ...knowledgeBase,
      documentCount: rows.length,
      documents: rows.map((row) => row.document)
    };
  }

  public async softDeleteKnowledgeBase(id: string, userId: string): Promise<boolean> {
    const [record] = await db
      .update(knowledgeBases)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(withSoftDelete(knowledgeBases, and(eq(knowledgeBases.id, id), eq(knowledgeBases.userId, userId))))
      .returning({ id: knowledgeBases.id });

    return Boolean(record);
  }

  public async attachDocumentsToKnowledgeBase(knowledgeBaseId: string, documentIds: string[]): Promise<void> {
    if (documentIds.length === 0) {
      return;
    }

    for (const documentId of documentIds) {
      await db
        .insert(knowledgeBaseDocuments)
        .values({ knowledgeBaseId, documentId, deletedAt: null })
        .onConflictDoUpdate({
          target: [knowledgeBaseDocuments.knowledgeBaseId, knowledgeBaseDocuments.documentId],
          set: { deletedAt: null, addedAt: new Date() }
        });
    }
  }

  public async detachDocumentFromKnowledgeBase(knowledgeBaseId: string, documentId: string): Promise<void> {
    await db
      .update(knowledgeBaseDocuments)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(knowledgeBaseDocuments.knowledgeBaseId, knowledgeBaseId),
          eq(knowledgeBaseDocuments.documentId, documentId),
          isNull(knowledgeBaseDocuments.deletedAt)
        )
      );
  }

  public async knowledgeBaseHasCompletedDocuments(knowledgeBaseId: string, userId: string): Promise<boolean> {
    const rows = await db
      .select({ id: documents.id })
      .from(knowledgeBaseDocuments)
      .innerJoin(knowledgeBases, eq(knowledgeBases.id, knowledgeBaseDocuments.knowledgeBaseId))
      .innerJoin(documents, eq(documents.id, knowledgeBaseDocuments.documentId))
      .where(
        and(
          withSoftDelete(knowledgeBases, and(eq(knowledgeBases.id, knowledgeBaseId), eq(knowledgeBases.userId, userId))),
          isNull(knowledgeBaseDocuments.deletedAt),
          withSoftDelete(documents, eq(documents.status, "completed"))
        )
      )
      .limit(1);

    return rows.length > 0;
  }

  public async listCompletedDocumentIdsForKnowledgeBase(knowledgeBaseId: string): Promise<string[]> {
    const rows = await db
      .select({ id: documents.id })
      .from(knowledgeBaseDocuments)
      .innerJoin(documents, eq(documents.id, knowledgeBaseDocuments.documentId))
      .where(
        and(
          eq(knowledgeBaseDocuments.knowledgeBaseId, knowledgeBaseId),
          isNull(knowledgeBaseDocuments.deletedAt),
          withSoftDelete(documents, eq(documents.status, "completed"))
        )
      );
    return rows.map((row) => row.id);
  }

  public async getChunks(documentId: string, userId: string): Promise<DocumentChunk[]> {
    const owned = await db.query.documents.findFirst({
      where: withSoftDelete(documents, and(eq(documents.id, documentId), eq(documents.userId, userId)))
    });
    if (!owned) {
      return [];
    }

    return db.query.documentChunks.findMany({
      where: eq(documentChunks.documentId, documentId),
      orderBy: [asc(documentChunks.chunkIndex)]
    });
  }

  public async listDocumentsByIds(documentIds: string[], userId: string): Promise<Document[]> {
    if (documentIds.length === 0) {
      return [];
    }

    return db.query.documents.findMany({
      where: withSoftDelete(documents, and(eq(documents.userId, userId), inArray(documents.id, documentIds)))
    });
  }
}
