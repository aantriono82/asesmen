"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@lib/api";
import { toast } from "@lib/toast";
import type { KnowledgeBase } from "@lib/types";

export function KnowledgeBasesClient() {
  const [items, setItems] = useState<KnowledgeBase[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    void loadKnowledgeBases();
  }, []);

  async function loadKnowledgeBases(): Promise<void> {
    try {
      const response = await apiFetch<KnowledgeBase[]>("/knowledge-bases");
      setItems(response.data ?? []);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat knowledge base");
    }
  }

  async function createKnowledgeBase(): Promise<void> {
    if (!name.trim()) {
      return;
    }
    try {
      await apiFetch("/knowledge-bases", {
        method: "POST",
        body: JSON.stringify({ name })
      });
      setName("");
      await loadKnowledgeBases();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat knowledge base");
    }
  }

  return (
    <main className="min-h-screen bg-field px-6 py-8 dark:bg-slate-950">
      <section className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand dark:text-teal-400">Knowledge Bases</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink dark:text-slate-100">Workspace Knowledge Base</h1>
          </div>
          <Link href="/documents" className="text-sm font-medium text-brand dark:text-teal-400">
            Buka Dokumen
          </Link>
        </div>

        <div className="mt-6 flex gap-2">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama knowledge base" className="input-base" />
          <button type="button" onClick={() => void createKnowledgeBase()} className="inline-flex h-11 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white">
            Buat
          </button>
        </div>

        <div className="mt-6 grid gap-3">
          {items.map((item) => (
            <Link key={item.id} href={`/knowledge-bases/${item.id}`} className="rounded-md border border-line bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="font-medium text-ink dark:text-slate-100">{item.name}</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.documentCount} dokumen</div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
