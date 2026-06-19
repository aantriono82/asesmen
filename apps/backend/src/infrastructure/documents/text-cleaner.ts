export function cleanDocumentText(input: string): string {
  return input
    .replace(/[^\P{C}\n\t\r]+/gu, " ")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}
