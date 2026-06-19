"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquarePlus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "@lib/api";
import { getStoredUser, isTeacher } from "@lib/auth";
import { toast } from "@lib/toast";
import type { ChatSession, KnowledgeBase, PaginatedData } from "@lib/types";

export function ChatListClient() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [knowledgeBaseId, setKnowledgeBaseId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getStoredUser();
    if (!isTeacher(user)) {
      router.replace("/login");
      return;
    }

    void Promise.all([loadSessions(), loadKnowledgeBases()]);
  }, [router]);

  async function loadSessions(): Promise<void> {
    setLoading(true);
    try {
      const response = await apiFetch<PaginatedData<ChatSession>>("/chat/sessions");
      setSessions(response.data?.items ?? []);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat chat");
    } finally {
      setLoading(false);
    }
  }

  async function loadKnowledgeBases(): Promise<void> {
    try {
      const response = await apiFetch<KnowledgeBase[]>("/knowledge-bases");
      setKnowledgeBases(response.data ?? []);
    } catch {
      setKnowledgeBases([]);
    }
  }

  async function createSession(): Promise<void> {
    try {
      const response = await apiFetch<ChatSession>("/chat/sessions", {
        method: "POST",
        body: JSON.stringify({
          knowledgeBaseId: knowledgeBaseId || undefined
        })
      });

      const session = response.data;
      if (session) {
        router.push(`/chat/${session.id}`);
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat session");
    }
  }

  async function deleteSession(sessionId: string): Promise<void> {
    try {
      await apiFetch(`/chat/sessions/${sessionId}`, { method: "DELETE" });
      setSessions((current) => current.filter((session) => session.id !== sessionId));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus session");
    }
  }

  return (
    <main className="min-h-screen bg-field px-6 py-8 dark:bg-slate-950">
      <section className="mx-auto max-w-5xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand dark:text-teal-400">Chat Sessions</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink dark:text-slate-100">Workspace Percakapan</h1>
          </div>
          <div className="flex items-center gap-2">
            <select value={knowledgeBaseId} onChange={(event) => setKnowledgeBaseId(event.target.value)} className="h-11 rounded-md border border-line bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
              <option value="">Tanpa Knowledge Base</option>
              {knowledgeBases.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void createSession()}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white"
            >
              <MessageSquarePlus className="h-4 w-4" />
              <span>Sesi Baru</span>
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {loading ? (
            <div className="rounded-md border border-line bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Memuat session...
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-md border border-dashed border-line bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Belum ada chat session.
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="grid gap-3 rounded-md border border-line bg-white p-4 shadow-sm md:grid-cols-[1fr_auto] md:items-center dark:border-slate-800 dark:bg-slate-900"
              >
                <Link href={`/chat/${session.id}`} className="min-w-0">
                  <div className="truncate text-base font-semibold text-ink dark:text-slate-100">{session.title}</div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>{session.provider}</span>
                    <span>{session.model}</span>
                    {session.knowledgeBaseId ? <span className="font-semibold text-sky-600 dark:text-sky-300">RAG aktif</span> : null}
                    <span>{new Date(session.updatedAt).toLocaleString("id-ID")}</span>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => void deleteSession(session.id)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line text-slate-600 dark:border-slate-700 dark:text-slate-300"
                  title="Hapus sesi"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
