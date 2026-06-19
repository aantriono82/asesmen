"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { apiFetch } from "@lib/api";
import type { Assessment, PaginatedData } from "@lib/types";
import { Pagination } from "@components/ui/Pagination";
import { SkeletonCard } from "@components/ui/SkeletonCard";

export function AssessmentListClient() {
  const [items, setItems] = useState<Assessment[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams({
          page: String(page),
          ...(subject ? { subject } : {}),
          ...(status ? { status } : {})
        });
        const response = await apiFetch<PaginatedData<Assessment>>(`/assessments?${query.toString()}`);
        if (cancelled) {
          return;
        }
        setItems(response.data?.items ?? []);
        setTotalPages(response.data?.totalPages ?? 1);
      } catch (caught: unknown) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Gagal memuat assessment");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [page, subject, status]);

  return (
    <main className="min-h-screen bg-field px-6 py-8 dark:bg-slate-950">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand dark:text-teal-400">Assessments</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink dark:text-slate-100">Daftar Assessment</h1>
          </div>
          <Link href="/assessments/new" className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" />
            Buat Assessment Baru
          </Link>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <label className="flex h-11 items-center gap-2 rounded-md border border-line bg-white px-3 dark:border-slate-800 dark:bg-slate-900">
            <Search className="h-4 w-4 text-slate-500" />
            <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Filter subject" className="w-full bg-transparent text-sm outline-none dark:text-slate-100" />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-md border border-line bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
            <option value="">Semua status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p> : null}

        <div className="mt-6 grid gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)
            : items.map((assessment) => (
                <Link key={assessment.id} href={`/assessments/${assessment.id}`} className="grid gap-3 rounded-md border border-line bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-ink dark:text-slate-100">{assessment.title}</h2>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        {assessment.subject} · {assessment.gradeLevel} · {assessment.assessmentType}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {assessment.knowledgeBaseId ? (
                        <span className="rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                          RAG
                        </span>
                      ) : null}
                      <span className="rounded-md border border-line px-2 py-1 text-xs font-medium capitalize dark:border-slate-700 dark:text-slate-200">{assessment.status}</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Total soal: {String((assessment.config.total_questions as number | undefined) ?? 0)}
                  </p>
                </Link>
              ))}
        </div>

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </section>
    </main>
  );
}
