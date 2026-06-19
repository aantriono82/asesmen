"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { apiFetch } from "@lib/api";
import type { SkillExecution } from "@lib/types";
import { SkeletonCard } from "@components/ui/SkeletonCard";

export function ExecutionStatusClient({ id }: { id: string }) {
  const [execution, setExecution] = useState<SkillExecution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const response = await apiFetch<SkillExecution>(`/executions/${id}`);
        if (!cancelled) {
          setExecution(response.data ?? null);
          setError(null);
        }
      } catch (caught: unknown) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Gagal memuat eksekusi");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    const timer = setInterval(() => {
      void load();
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-field px-6 py-8 dark:bg-slate-950">
        <section className="mx-auto max-w-5xl">
          <SkeletonCard />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-field px-6 py-8 dark:bg-slate-950">
      <section className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand dark:text-teal-400">Execution</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink dark:text-slate-100">{execution ? execution.skillSlug : "Eksekusi"}</h1>
          </div>
          <button type="button" onClick={() => window.location.reload()} className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-medium text-ink dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p> : null}

        {execution ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-md border border-line bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-semibold text-ink dark:text-slate-100">Status</h2>
              <p className="mt-2 text-2xl font-semibold text-brand dark:text-teal-400">{execution.status}</p>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Created at {new Date(execution.createdAt).toLocaleString()}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Duration: {execution.durationMs ?? 0} ms</p>
            </article>

            <article className="rounded-md border border-line bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-semibold text-ink dark:text-slate-100">Input</h2>
              <pre className="mt-3 overflow-auto text-xs leading-6 text-slate-600 dark:text-slate-300">{JSON.stringify(execution.input, null, 2)}</pre>
            </article>

            <article className="rounded-md border border-line bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
              <h2 className="text-sm font-semibold text-ink dark:text-slate-100">Output / Error</h2>
              {execution.status === "failed" ? (
                <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{execution.error ?? "Error tidak tersedia"}</p>
              ) : (
                <pre className="mt-3 overflow-auto text-xs leading-6 text-slate-600 dark:text-slate-300">{JSON.stringify(execution.output, null, 2)}</pre>
              )}
            </article>
          </div>
        ) : null}
      </section>
    </main>
  );
}
