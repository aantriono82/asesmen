"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { apiFetch } from "@lib/api";
import { toast } from "@lib/toast";
import type { PaginatedData, QuestionBankEntry } from "@lib/types";
import { Pagination } from "@components/ui/Pagination";
import { SkeletonCard } from "@components/ui/SkeletonCard";

export function QuestionBankClient() {
  const [items, setItems] = useState<QuestionBankEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [type, setType] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          ...(subject ? { subject } : {}),
          ...(grade ? { grade_level: grade } : {}),
          ...(type ? { type } : {}),
          ...(difficulty ? { difficulty } : {})
        });
        const path = query
          ? "/question-bank/search"
          : `/question-bank?${params.toString()}`;
        if (cancelled) {
          return;
        }
        if (query) {
          const response = await apiFetch<QuestionBankEntry[]>(path, { method: "POST", body: JSON.stringify({ query, subject, type }) });
          setItems(response.data ?? []);
          setTotalPages(1);
        } else {
          const response = await apiFetch<PaginatedData<QuestionBankEntry>>(path);
          setItems(response.data?.items ?? []);
          setTotalPages(response.data?.totalPages ?? 1);
        }
      } catch (caught: unknown) {
        if (!cancelled) {
          toast.error(caught instanceof Error ? caught.message : "Gagal memuat bank soal");
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
  }, [page, query, subject, grade, type, difficulty]);

  return (
    <main className="min-h-screen bg-field px-6 py-8 dark:bg-slate-950">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold text-brand dark:text-teal-400">Question Bank</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink dark:text-slate-100">Bank Soal</h1>
        <div className="mt-6 grid gap-3 md:grid-cols-5">
          <label className="flex h-11 items-center gap-2 rounded-md border border-line bg-white px-3 dark:border-slate-800 dark:bg-slate-900">
            <Search className="h-4 w-4 text-slate-500" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari keyword" className="w-full bg-transparent text-sm outline-none dark:text-slate-100" />
          </label>
          <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" className="input-base" />
          <input value={grade} onChange={(event) => setGrade(event.target.value)} placeholder="Grade" className="input-base" />
          <input value={type} onChange={(event) => setType(event.target.value)} placeholder="Type" className="input-base" />
          <input value={difficulty} onChange={(event) => setDifficulty(event.target.value)} placeholder="Difficulty" className="input-base" />
        </div>

        <div className="mt-6 grid gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)
            : items.map((item) => (
                <article key={item.id} className="rounded-md border border-line bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-ink dark:text-slate-100">{item.question?.content}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {item.subject} · {item.gradeLevel} · dipakai {item.usageCount} kali
                      </p>
                    </div>
                    <button type="button" className="btn-secondary">
                      Tambah ke Assessment
                    </button>
                  </div>
                </article>
              ))}
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </section>
    </main>
  );
}
