import { AppError } from "@lib/errors";
import { DocxParser } from "./docx.parser";
import { PdfParser } from "./pdf.parser";
import type { DocumentParser } from "./types";

export class ParserFactory {
  public static create(fileType: string): DocumentParser {
    const normalized = fileType.toLowerCase();
    if (normalized === "application/pdf" || normalized === "pdf") {
      return new PdfParser();
    }

    if (
      normalized === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      normalized === "docx"
    ) {
      return new DocxParser();
    }

    throw new AppError(`Tipe file ${fileType} belum didukung`, "DOCUMENT_TYPE_UNSUPPORTED", 400);
  }
}
