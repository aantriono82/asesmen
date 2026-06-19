import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { env } from "@lib/env";
import { assertSafeRelativePath } from "@lib/sanitizer";

interface DownloadTokenPayload {
  sub: string;
  path: string;
  filename: string;
  mimeType: string;
}

export class DownloadManager {
  private readonly rootPath = path.resolve(process.cwd(), env.EXPORT_STORAGE_PATH);

  public async save(userId: string, artifact: { extension: string; content: Buffer; fileName: string; mimeType: string }) {
    const directory = path.join(this.rootPath, userId);
    await mkdir(directory, { recursive: true });
    const fileName = `${randomUUID()}.${artifact.extension}`;
    const filePath = path.join(directory, fileName);
    await writeFile(filePath, artifact.content);
    return {
      filePath,
      token: this.signToken({
        sub: userId,
        path: filePath,
        filename: artifact.fileName,
        mimeType: artifact.mimeType
      })
    };
  }

  public verifyToken(token: string): DownloadTokenPayload {
    return jwt.verify(token, env.JWT_SECRET) as DownloadTokenPayload;
  }

  public async read(token: string): Promise<{ buffer: Buffer; filename: string; mimeType: string; filePath: string }> {
    const payload = this.verifyToken(token);
    assertSafeRelativePath(this.rootPath, path.relative(this.rootPath, payload.path));
    const buffer = await readFile(payload.path);
    return { buffer, filename: payload.filename, mimeType: payload.mimeType, filePath: payload.path };
  }

  public async delete(filePath: string): Promise<void> {
    const relative = path.relative(this.rootPath, filePath);
    const resolved = assertSafeRelativePath(this.rootPath, relative);
    await rm(resolved, { force: true });
  }

  public async pruneExpiredFiles(maxAgeMs = 24 * 60 * 60 * 1000): Promise<number> {
    let deleted = 0;
    const walk = async (directory: string): Promise<void> => {
      const entries = await import("node:fs/promises").then((fs) => fs.readdir(directory, { withFileTypes: true }));
      for (const entry of entries) {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          await walk(target);
          continue;
        }
        const info = await stat(target);
        if (Date.now() - info.mtimeMs > maxAgeMs) {
          await rm(target, { force: true });
          deleted += 1;
        }
      }
    };

    await mkdir(this.rootPath, { recursive: true });
    await walk(this.rootPath);
    return deleted;
  }

  private signToken(payload: DownloadTokenPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_DOWNLOAD_EXPIRES_IN as NonNullable<SignOptions["expiresIn"]>
    });
  }
}
