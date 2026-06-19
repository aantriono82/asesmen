import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate, requireTeacher } from "@api/middleware/auth";
import { parseBody, parseParams } from "@api/validators/zod";
import { AuditService } from "@infra/audit/audit.service";
import { ExportService } from "@infra/export/export.service";
import { PgRateLimiter, rateLimitPolicies } from "@infra/rate-limit/pg-rate-limiter";

const exportService = new ExportService();
const auditService = new AuditService();

const exportBodySchema = z.object({
  assessmentId: z.string().uuid().optional(),
  curriculumId: z.string().uuid().optional(),
  types: z
    .array(
      z.enum([
        "question_paper",
        "answer_key",
        "answer_sheet",
        "scoring_rubric",
        "rpp",
        "silabus",
        "kisi_kisi",
        "question_bank",
        "assessment_summary"
      ])
    )
    .min(1),
  format: z.enum(["docx", "pdf", "excel"]),
  schoolName: z.string().optional(),
  schoolHeader: z.string().optional()
});

const tokenParamsSchema = z.object({
  token: z.string().min(16)
});

export const exportRoutes: FastifyPluginAsync = async (fastify) => {
  const rateLimiter = new PgRateLimiter();

  fastify.post("/export/docx", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    await rateLimiter.consume(request, reply, rateLimitPolicies.export);
    const userId = z.string().uuid().parse(request.user?.id);
    const body = parseBody(request, exportBodySchema.extend({ format: z.literal("docx") }));
    const result = await exportService.generate(userId, normalizeExportBody(body));
    await auditService.log({ userId, action: "CREATE", entityType: "export", description: "Generate DOCX export", metadata: body, request });
    return reply.success(result, "Export DOCX siap diunduh", "EXPORT_DOCX_READY");
  });

  fastify.post("/export/pdf", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    await rateLimiter.consume(request, reply, rateLimitPolicies.export);
    const userId = z.string().uuid().parse(request.user?.id);
    const body = parseBody(request, exportBodySchema.extend({ format: z.literal("pdf") }));
    const result = await exportService.generate(userId, normalizeExportBody(body));
    await auditService.log({ userId, action: "CREATE", entityType: "export", description: "Generate PDF export", metadata: body, request });
    return reply.success(result, "Export PDF siap diunduh", "EXPORT_PDF_READY");
  });

  fastify.post("/export/excel", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    await rateLimiter.consume(request, reply, rateLimitPolicies.export);
    const userId = z.string().uuid().parse(request.user?.id);
    const body = parseBody(request, exportBodySchema.extend({ format: z.literal("excel") }));
    const result = await exportService.generate(userId, normalizeExportBody(body));
    await auditService.log({ userId, action: "CREATE", entityType: "export", description: "Generate Excel export", metadata: body, request });
    return reply.success(result, "Export Excel siap diunduh", "EXPORT_EXCEL_READY");
  });

  fastify.get("/export/download/:token", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const { token } = parseParams(request, tokenParamsSchema);
    const file = await exportService.download(token);
    reply.header("Content-Type", file.mimeType);
    reply.header("Content-Disposition", `attachment; filename="${file.filename}"`);
    return reply.send(file.buffer);
  });
};

function normalizeExportBody(body: z.infer<typeof exportBodySchema>) {
  return {
    format: body.format,
    types: body.types,
    ...(body.assessmentId ? { assessmentId: body.assessmentId } : {}),
    ...(body.curriculumId ? { curriculumId: body.curriculumId } : {}),
    ...(body.schoolName ? { schoolName: body.schoolName } : {}),
    ...(body.schoolHeader ? { schoolHeader: body.schoolHeader } : {})
  };
}
