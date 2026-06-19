import { randomUUID } from "node:crypto";
import path from "node:path";
import { Transform } from "node:stream";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate, requireTeacher } from "@api/middleware/auth";
import { parseParams, parseQuery } from "@api/validators/zod";
import {
  GenerateDocumentUseCase,
  GetGeneratedDocumentUseCase,
  ListGeneratedDocumentsUseCase
} from "@app/documents/generate-document.use-case";
import { AuditService } from "@infra/audit/audit.service";
import { getQueue } from "@infra/queue/queue";
import { DrizzleDocumentRepository } from "@infra/repositories/drizzle-document.repository";
import { DrizzleAssessmentRepository } from "@infra/repositories/drizzle-assessment.repository";
import { getFileStorage } from "@infra/storage";
import { PgRateLimiter, rateLimitPolicies } from "@infra/rate-limit/pg-rate-limiter";
import { AppError } from "@lib/errors";
import { assertFileMagicBytes } from "@lib/sanitizer";

const repository = new DrizzleAssessmentRepository();
const documents = new DrizzleDocumentRepository();
const audit = new AuditService();
const storage = getFileStorage();
const rateLimiter = new PgRateLimiter();

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional()
});

const idParamsSchema = z.object({
  id: z.string().uuid()
});

const uploadMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

export const documentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/documents/upload", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    await rateLimiter.consume(request, reply, rateLimitPolicies.upload);
    const userId = z.string().uuid().parse(request.user?.id);
    const parts = (request as unknown as FastifyMultipartRequest).parts();
    const created = [];
    let fileCount = 0;

    for await (const part of parts as AsyncIterable<MultipartFilePart>) {
      if (part.type !== "file") {
        continue;
      }

      fileCount += 1;
      if (fileCount > 5) {
        throw new AppError("Maksimal 5 file per upload", "DOCUMENT_UPLOAD_LIMIT", 400);
      }

      if (!uploadMimeTypes.has(part.mimetype)) {
        throw new AppError("Hanya file PDF dan DOCX yang didukung", "DOCUMENT_TYPE_UNSUPPORTED", 400);
      }

      const extension = part.mimetype === "application/pdf" ? ".pdf" : ".docx";
      const targetPath = path.posix.join("documents", userId, `${randomUUID()}${extension}`);
      const counter = new ByteCounterTransform(10 * 1024 * 1024);
      const upload = await storage.uploadStream(part.file.pipe(counter), targetPath, part.mimetype);
      assertFileMagicBytes(counter.signature, part.mimetype);
      const title = stripExtension(part.filename ?? `document-${fileCount}`);
      const document = await documents.createDocument({
        userId,
        title,
        filePath: upload.path,
        fileUrl: upload.url,
        fileType: part.mimetype,
        fileSize: counter.bytes,
        status: "pending",
        chunkCount: 0,
        errorMessage: null
      });

      await getQueue().send("document-processing", {
        documentId: document.id,
        userId
      });

      created.push(document);
    }

    await audit.log({
      userId,
      action: "CREATE",
      entityType: "document",
      description: `Upload ${created.length} dokumen`,
      metadata: { documentIds: created.map((item) => item.id) },
      request
    });

    return reply.status(201).success(created, "Dokumen masuk antrean pemrosesan", "DOCUMENTS_QUEUED");
  });

  fastify.get("/documents", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const query = parseQuery(request, querySchema);
    const result = await documents.listDocuments({
      userId,
      ...(query.page ? { page: query.page } : {}),
      ...(query.limit ? { limit: query.limit } : {})
    });
    return reply.success(result, "Daftar dokumen", "DOCUMENTS_LIST");
  });

  fastify.get("/documents/:id", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id } = parseParams(request, idParamsSchema);
    const document = await documents.getDocument(id, userId);
    if (!document) {
      throw new AppError("Dokumen tidak ditemukan", "DOCUMENT_NOT_FOUND", 404);
    }
    return reply.success(document, "Detail dokumen", "DOCUMENT_DETAIL");
  });

  fastify.get("/documents/:id/chunks", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id } = parseParams(request, idParamsSchema);
    const result = await documents.getChunks(id, userId);
    return reply.success(result, "Chunk dokumen", "DOCUMENT_CHUNKS");
  });

  fastify.delete("/documents/:id", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id } = parseParams(request, idParamsSchema);
    const document = await documents.getDocument(id, userId);
    if (!document) {
      throw new AppError("Dokumen tidak ditemukan", "DOCUMENT_NOT_FOUND", 404);
    }

    await documents.softDeleteDocument(id, userId);
    await storage.delete(document.filePath);
    await audit.log({ userId, action: "DELETE", entityType: "document", entityId: id, description: `Hapus dokumen ${id}`, request });
    return reply.success({ deleted: true }, "Dokumen dihapus", "DOCUMENT_DELETED");
  });

  fastify.post("/documents/generate", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const result = await new GenerateDocumentUseCase(repository).execute({
      userId,
      payload: request.body as Record<string, unknown>
    });
    await audit.log({ userId, action: "CREATE", entityType: "generated_document", description: "Generate assessment documents", request });
    return reply.status(201).success(result, "Dokumen berhasil disusun", "DOCUMENTS_GENERATED");
  });

  fastify.get("/documents/generated", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const query = parseQuery(request, querySchema);
    const result = await new ListGeneratedDocumentsUseCase(repository).execute({
      userId,
      ...(query.page ? { page: query.page } : {}),
      ...(query.limit ? { limit: query.limit } : {})
    });
    return reply.success(result, "Daftar dokumen terstruktur", "GENERATED_DOCUMENTS_LIST");
  });

  fastify.get("/documents/generated/:id", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const { id } = parseParams(request, idParamsSchema);
    const result = await new GetGeneratedDocumentUseCase(repository).execute({ id, userId });
    return reply.success(result, "Detail dokumen", "GENERATED_DOCUMENT_DETAIL");
  });
};

type MultipartFilePart = {
  type: "file";
  filename?: string;
  mimetype: string;
  file: NodeJS.ReadableStream;
};

type FastifyMultipartRequest = {
  parts(): AsyncIterable<MultipartFilePart>;
};

class ByteCounterTransform extends Transform {
  public bytes = 0;
  public signature = Buffer.alloc(0);

  public constructor(private readonly maxBytes: number) {
    super();
  }

  public override _transform(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null, data?: Buffer) => void): void {
    this.bytes += chunk.length;
    if (this.signature.length < 8) {
      this.signature = Buffer.concat([this.signature, chunk.subarray(0, 8 - this.signature.length)]);
    }
    if (this.bytes > this.maxBytes) {
      callback(new AppError("Ukuran file maksimal 10MB", "DOCUMENT_FILE_TOO_LARGE", 400));
      return;
    }

    callback(null, chunk);
  }
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}
