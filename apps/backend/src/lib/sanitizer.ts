import path from "node:path";
import { AppError } from "./errors";

const htmlTagPattern = /<[^>]*>/g;

export function stripHtmlTags(value: string): string {
  return value.replace(htmlTagPattern, "").trim();
}

export function sanitizeObjectStrings<T>(value: T): T {
  if (typeof value === "string") {
    return stripHtmlTags(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeObjectStrings(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, sanitizeObjectStrings(entry)])
    ) as T;
  }

  return value;
}

export function assertSafeRelativePath(basePath: string, targetPath: string): string {
  const resolved = path.resolve(basePath, targetPath);
  const normalizedBase = path.resolve(basePath);

  if (!resolved.startsWith(normalizedBase)) {
    throw new AppError("Path tidak valid", "INVALID_PATH", 400);
  }

  return resolved;
}

export function assertFileMagicBytes(buffer: Buffer, mimeType: string): void {
  const signatures: Record<string, number[][]> = {
    "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [[0x50, 0x4b, 0x03, 0x04]]
  };

  const knownSignatures = signatures[mimeType];
  if (!knownSignatures) {
    return;
  }

  const matches = knownSignatures.some((signature) => signature.every((byte, index) => buffer[index] === byte));
  if (!matches) {
    throw new AppError("Signature file tidak valid", "INVALID_FILE_SIGNATURE", 400);
  }
}
