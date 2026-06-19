import { DrizzleAssessmentRepository } from "@infra/repositories/drizzle-assessment.repository";
import { DocxExporter } from "./docx.exporter";
import { DownloadManager } from "./download-manager";
import { ExcelExporter } from "./excel.exporter";
import { PdfExporter } from "./pdf.exporter";
import type { ExportRequestPayload } from "./export.types";
import { AppError } from "@lib/errors";

export class ExportService {
  private readonly repository = new DrizzleAssessmentRepository();
  private readonly docxExporter = new DocxExporter();
  private readonly pdfExporter = new PdfExporter();
  private readonly excelExporter = new ExcelExporter();
  private readonly downloads = new DownloadManager();

  public async generate(userId: string, payload: ExportRequestPayload) {
    const assessment = payload.assessmentId ? await this.repository.getAssessment(payload.assessmentId, userId) : null;
    const curriculum = payload.curriculumId ? await this.repository.getCurriculum(payload.curriculumId, userId) : null;
    if (!assessment && !curriculum) {
      throw new AppError("Sumber export tidak ditemukan", "EXPORT_SOURCE_NOT_FOUND", 404);
    }

    const context = { assessment, curriculum };
    const artifacts = [];
    for (const type of payload.types) {
      const artifact = payload.format === "docx"
        ? await this.docxExporter.export(context, type, payload)
        : payload.format === "pdf"
          ? await this.pdfExporter.export(context, type, payload)
          : await this.excelExporter.export(context, type);
      const stored = await this.downloads.save(userId, artifact);
      artifacts.push({
        type,
        format: payload.format,
        fileName: artifact.fileName,
        token: stored.token
      });
    }

    return artifacts;
  }

  public async download(token: string) {
    return this.downloads.read(token);
  }

  public async cleanupExpiredExports(): Promise<number> {
    return this.downloads.pruneExpiredFiles();
  }
}
