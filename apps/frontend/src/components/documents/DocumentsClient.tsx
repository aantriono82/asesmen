"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { apiFetch } from "@lib/api";
import { toast } from "@lib/toast";
import type { PaginatedData, UploadedDocument } from "@lib/types";

export function DocumentsClient() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<UploadedDocument[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    void loadDocuments();
    const timer = window.setInterval(() => {
      void loadDocuments();
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  async function loadDocuments(): Promise<void> {
    try {
      const response = await apiFetch<PaginatedData<UploadedDocument>>("/documents");
      setItems(response.data?.items ?? []);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat dokumen");
    }
  }

  async function handleFiles(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) {
      return;
    }

    const formData = new FormData();
    Array.from(files).slice(0, 5).forEach((file) => formData.append("files", file));
    setUploading(true);
    try {
      await apiFetch<UploadedDocument[]>("/documents/upload", {
        method: "POST",
        body: formData
      });
      toast.success("Dokumen masuk antrean");
      await loadDocuments();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Upload gagal");
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <main className="min-h-screen bg-field px-6 py-8 dark:bg-slate-950">
      <section className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand dark:text-teal-400">Documents</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink dark:text-slate-100">Dokumen RAG</h1>
          </div>
          <Link href="/knowledge-bases" className="text-sm font-medium text-brand dark:text-teal-400">
            Kelola Knowledge Base
          </Link>
        </div>

        <label className="mt-6 flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed border-line bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
          <Upload className="h-5 w-5 text-slate-500" />
          <div className="text-sm text-slate-600 dark:text-slate-300">{uploading ? "Mengunggah..." : "Upload PDF atau DOCX, maksimal 5 file dan 10MB per file"}</div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple
            className="hidden"
            onChange={(event) => void handleFiles(event.target.files)}
          />
        </label>

        <div className="mt-6 grid gap-3">
          {items.map((document) => (
            <div key={document.id} className="rounded-md border border-line bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-ink dark:text-slate-100">{document.title}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {document.fileType} · {(document.fileSize / 1024).toFixed(1)} KB · {document.chunkCount} chunk
                  </div>
                </div>
                <span className="rounded-md border border-line px-2 py-1 text-xs capitalize dark:border-slate-700 dark:text-slate-200">
                  {document.status}
                </span>
              </div>
              {document.errorMessage ? <p className="mt-2 text-xs text-red-600 dark:text-red-300">{document.errorMessage}</p> : null}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
