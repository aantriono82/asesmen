import type { Readable } from "node:stream";

export interface FileStorage {
  upload(file: Buffer, path: string, mimeType: string): Promise<{ url: string; path: string }>;
  uploadStream(stream: Readable, path: string, mimeType: string): Promise<{ url: string; path: string }>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  getUrl(path: string): Promise<string>;
  exists(path: string): Promise<boolean>;
}
