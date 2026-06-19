import puppeteer, { type Browser } from "puppeteer";
import { env } from "@lib/env";
import { renderAnswerKeyHtml } from "./templates/answer-key.html";
import { renderAnswerSheetHtml } from "./templates/answer-sheet.html";
import { renderQuestionPaperHtml } from "./templates/question-paper.html";
import { renderRppHtml } from "./templates/rpp.html";
import { renderRubricHtml } from "./templates/rubric.html";
import type { ExportArtifact, ExportContext, ExportDocumentType } from "./export.types";

let browserPromise: Promise<Browser> | null = null;

export class PdfExporter {
  public async export(context: ExportContext, type: ExportDocumentType, meta?: { schoolName?: string; schoolHeader?: string }): Promise<ExportArtifact> {
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(renderHtml(type, context, meta), { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "2cm", right: "2cm", bottom: "2cm", left: "2cm" }
    });
    await page.close();

    return {
      fileName: `${type}.pdf`,
      mimeType: "application/pdf",
      extension: "pdf",
      content: Buffer.from(pdf)
    };
  }
}

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      ...(env.PUPPETEER_EXECUTABLE_PATH ? { executablePath: env.PUPPETEER_EXECUTABLE_PATH } : {}),
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
  }

  return browserPromise;
}

function renderHtml(type: ExportDocumentType, context: ExportContext, meta?: { schoolName?: string; schoolHeader?: string }): string {
  if (type === "answer_key" && context.assessment) {
    return renderAnswerKeyHtml(context.assessment);
  }
  if (type === "answer_sheet" && context.assessment) {
    return renderAnswerSheetHtml(context.assessment);
  }
  if (type === "scoring_rubric" && context.assessment) {
    return renderRubricHtml(context.assessment);
  }
  if ((type === "rpp" || type === "silabus") && context.curriculum) {
    return renderRppHtml(context.curriculum);
  }
  if (context.assessment) {
    return renderQuestionPaperHtml(context.assessment, meta?.schoolName, meta?.schoolHeader);
  }
  if (context.curriculum) {
    return renderRppHtml(context.curriculum);
  }

  return "<html><body><p>Dokumen tidak tersedia.</p></body></html>";
}
