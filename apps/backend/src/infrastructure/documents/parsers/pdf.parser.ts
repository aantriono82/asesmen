import { AppError } from "@lib/errors";
import type { DocumentParser, ParsedDocument } from "./types";

type PdfParseModule = (data: Buffer) => Promise<{ text?: string; numpages?: number }>;

export class PdfParser implements DocumentParser {
  public constructor(private readonly loader: () => Promise<PdfParseModule> = loadPdfParse) {}

  public async parse(buffer: Buffer): Promise<ParsedDocument> {
    const pdfParse = await this.loader();
    const result = await pdfParse(buffer);

    return {
      text: result.text?.trim() ?? "",
      pageCount: typeof result.numpages === "number" ? result.numpages : 1
    };
  }
}

async function loadPdfParse(): Promise<PdfParseModule> {
  try {
    const required = eval("require")("pdf-parse") as PdfParseModule | { default: PdfParseModule };
    return typeof required === "function" ? required : required.default;
  } catch (error: unknown) {
    throw new AppError(
      `Dependency pdf-parse belum tersedia untuk memproses PDF: ${error instanceof Error ? error.message : "unknown error"}`,
      "PDF_PARSER_UNAVAILABLE",
      500
    );
  }
}
