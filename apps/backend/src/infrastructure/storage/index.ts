import type { FileStorage } from "@domain/storage/file-storage.interface";
import { LocalStorage } from "@infra/storage/local.storage";
import { S3Storage } from "@infra/storage/s3.storage";
import { env } from "@lib/env";

let storage: FileStorage | null = null;

export function getFileStorage(): FileStorage {
  if (storage) {
    return storage;
  }

  storage = env.STORAGE_DRIVER === "s3" ? new S3Storage() : new LocalStorage();
  return storage;
}
