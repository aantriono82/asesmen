import { describe, expect, it } from "vitest";
import { PdfParser } from "../src/infrastructure/documents/parsers/pdf.parser";

describe("pdf parser", () => {
  it("parses text and page count from injected parser", async () => {
    const parser = new PdfParser(async () => async () => ({
      text: "Halaman satu.\nHalaman dua.",
      numpages: 2
    }));

    const result = await parser.parse(Buffer.from("pdf"));
    expect(result.text).toContain("Halaman satu");
    expect(result.pageCount).toBe(2);
  });
});
