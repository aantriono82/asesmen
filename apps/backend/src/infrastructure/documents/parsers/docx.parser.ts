import { AppError } from "@lib/errors";
import type { DocumentParser, ParsedDocument } from "./types";

type MammothModule = {
  extractRawText(input: { buffer: Buffer }): Promise<{ value?: string }>;
};

export class DocxParser implements DocumentParser {
  public constructor(private readonly loader: () => Promise<MammothModule> = loadMammoth) {}

  public async parse(buffer: Buffer): Promise<ParsedDocument> {
    const mammoth = await this.loader();
    const result = await mammoth.extractRawText({ buffer });

    return {
      text: result.value?.trim() ?? "",
      pageCount: 1
    };
  }
}

async function loadMammoth(): Promise<MammothModule> {
  try {
    const required = eval("require")("mammoth") as MammothModule | { default: MammothModule };
    return "extractRawText" in required ? required : required.default;
  } catch (error: unknown) {
    throw new AppError(
      `Dependency mammoth belum tersedia untuk memproses DOCX: ${error instanceof Error ? error.message : "unknown error"}`,
      "DOCX_PARSER_UNAVAILABLE",
      500
    );
  }
}
