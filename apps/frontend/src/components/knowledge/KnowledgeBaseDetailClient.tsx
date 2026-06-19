"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@lib/api";
import { toast } from "@lib/toast";
import type { KnowledgeBaseDetail, UploadedDocument } from "@lib/types";

export function KnowledgeBaseDetailClient({ id }: { id: string }) {
  const [detail, setDetail] = useState<KnowledgeBaseDetail | null>(null);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState("");

  useEffect(() => {
    void Promise.all([loadDetail(), loadDocuments()]);
  }, [id]);

  async function loadDetail(): Promise<void> {
    try {
      const response = await apiFetch<KnowledgeBaseDetail>(`/knowledge-bases/${id}`);
      setDetail(response.data ?? null);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat detail knowledge base");
    }
  }

  async function loadDocuments(): Promise<void> {
    try {
      const response = await apiFetch<{ items: UploadedDocument[] }>("/documents");
      setDocuments((response.data as { items?: UploadedDocument[] } | null)?.items ?? []);
    } catch {
      setDocuments([]);
    }
  }

  async function attachDocument(documentId: string): Promise<void> {
    try {
      await apiFetch(`/knowledge-bases/${id}/documents`, {
        method: "POST",
        body: JSON.stringify({ document_ids: [documentId] })
      });
      await loadDetail();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal menambahkan dokumen");
    }
  }

  async function runSearch(): Promise<void> {
    try {
      const response = await apiFetch<{ context: string }>(`/knowledge-bases/${id}/search`, {
        method: "POST",
        body: JSON.stringify({ query, top_k: 5 })
      });
      setSearchResult(response.data?.context ?? "");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal mencari dokumen");
    }
  }

  return (
    <main className="min-h-screen bg-field px-6 py-8 dark:bg-slate-950">
      <section className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-semibold text-ink dark:text-slate-100">{detail?.name ?? "Knowledge Base"}</h1>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-md border border-line bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm font-semibold text-ink dark:text-slate-100">Dokumen dalam KB</div>
            <div className="mt-4 grid gap-3">
              {detail?.documents.map((item) => (
                <div key={item.id} className="rounded-md border border-line p-3 text-sm dark:border-slate-700">
                  {item.title}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-line bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm font-semibold text-ink dark:text-slate-100">Tambahkan dokumen</div>
            <div className="mt-4 grid gap-3">
              {documents.filter((item) => item.status === "completed").map((item) => (
                <button key={item.id} type="button" onClick={() => void attachDocument(item.id)} className="rounded-md border border-line p-3 text-left text-sm dark:border-slate-700">
                  {item.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-md border border-line bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex gap-2">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari dalam knowledge base" className="input-base" />
            <button type="button" onClick={() => void runSearch()} className="inline-flex h-11 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white">
              Search
            </button>
          </div>
          {searchResult ? <pre className="mt-4 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{searchResult}</pre> : null}
        </div>
      </section>
    </main>
  );
}
