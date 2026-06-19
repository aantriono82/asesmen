export interface ParsedDocument {
  text: string;
  pageCount: number;
  pages?: string[];
}

export interface DocumentParser {
  parse(buffer: Buffer): Promise<ParsedDocument>;
}
