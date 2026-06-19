import type { Readable } from "node:stream";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { FileStorage } from "@domain/storage/file-storage.interface";
import { env } from "@lib/env";

export class S3Storage implements FileStorage {
  private readonly client = new S3Client({
    endpoint: env.S3_ENDPOINT ?? "",
    region: env.S3_REGION ?? "auto",
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY ?? "",
      secretAccessKey: env.S3_SECRET_KEY ?? ""
    },
    forcePathStyle: true
  });

  public async upload(file: Buffer, targetPath: string, mimeType: string): Promise<{ url: string; path: string }> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: targetPath,
        Body: file,
        ContentType: mimeType
      })
    );

    return {
      path: targetPath,
      url: await this.getUrl(targetPath)
    };
  }

  public async uploadStream(stream: Readable, targetPath: string, mimeType: string): Promise<{ url: string; path: string }> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: targetPath,
        Body: stream,
        ContentType: mimeType
      })
    );

    return {
      path: targetPath,
      url: await this.getUrl(targetPath)
    };
  }

  public async download(targetPath: string): Promise<Buffer> {
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: targetPath
      })
    );

    const bytes = await result.Body?.transformToByteArray();
    return Buffer.from(bytes ?? []);
  }

  public async delete(targetPath: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: targetPath
      })
    );
  }

  public async getUrl(targetPath: string): Promise<string> {
    const endpoint = env.S3_ENDPOINT?.replace(/\/$/, "") ?? "";
    return `${endpoint}/${env.S3_BUCKET}/${targetPath}`;
  }

  public async exists(targetPath: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: targetPath
        })
      );
      return true;
    } catch {
      return false;
    }
  }
}
