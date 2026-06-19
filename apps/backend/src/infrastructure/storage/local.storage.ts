import { createWriteStream } from "node:fs";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import type { FileStorage } from "@domain/storage/file-storage.interface";
import { env } from "@lib/env";

export class LocalStorage implements FileStorage {
  private readonly rootPath = path.resolve(process.cwd(), env.STORAGE_LOCAL_PATH);

  public async upload(file: Buffer, targetPath: string, mimeType: string): Promise<{ url: string; path: string }> {
    void mimeType;
    const absolutePath = this.resolvePath(targetPath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file);

    return {
      path: targetPath,
      url: await this.getUrl(targetPath)
    };
  }

  public async uploadStream(stream: Readable, targetPath: string, mimeType: string): Promise<{ url: string; path: string }> {
    void mimeType;
    const absolutePath = this.resolvePath(targetPath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await pipeline(stream, createWriteStream(absolutePath));

    return {
      path: targetPath,
      url: await this.getUrl(targetPath)
    };
  }

  public async download(targetPath: string): Promise<Buffer> {
    return readFile(this.resolvePath(targetPath));
  }

  public async delete(targetPath: string): Promise<void> {
    await rm(this.resolvePath(targetPath), { force: true });
  }

  public async getUrl(targetPath: string): Promise<string> {
    const baseUrl = env.STORAGE_PUBLIC_BASE_URL ?? env.FRONTEND_URL;
    return `${baseUrl.replace(/\/$/, "")}/uploads/${targetPath.replace(/^\//, "")}`;
  }

  public async exists(targetPath: string): Promise<boolean> {
    try {
      await access(this.resolvePath(targetPath));
      return true;
    } catch {
      return false;
    }
  }

  private resolvePath(targetPath: string): string {
    return path.resolve(this.rootPath, targetPath);
  }
}
