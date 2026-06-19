"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Filter } from "lucide-react";
import { apiFetch } from "@lib/api";
import type { PaginatedData, SkillExecution } from "@lib/types";
import { SkeletonTable } from "@components/ui/SkeletonTable";

type Filters = {
  status: string;
  skillSlug: string;
  from: string;
  to: string;
};

export function ExecutionHistoryClient() {
  const [items, setItems] = useState<SkillExecution[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>({
    status: "",
    skillSlug: "",
    from: "",
    to: ""
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(page),
        limit: "10"
      });

      if (filters.status) params.set("status", filters.status);
      if (filters.skillSlug) params.set("skillSlug", filters.skillSlug);
      if (filters.from) params.set("after", filters.from);
      if (filters.to) params.set("before", filters.to);

      try {
        const response = await apiFetch<PaginatedData<SkillExecution>>(`/executions?${params.toString()}`);
        if (!cancelled) {
          setItems(response.data?.items ?? []);
          setTotal(response.data?.total ?? 0);
        }
      } catch (caught: unknown) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Gagal memuat riwayat");
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
  }, [filters, page]);

  return (
    <main className="min-h-screen bg-field px-6 py-8 dark:bg-slate-950">
      <section className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand dark:text-teal-400">Execution History</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink dark:text-slate-100">Riwayat Eksekusi</h1>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300">{total} record</div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-4">
          <label className="flex h-11 items-center gap-2 rounded-md border border-line bg-white px-3 dark:border-slate-800 dark:bg-slate-900">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              className="h-full w-full bg-transparent text-sm text-ink outline-none dark:text-slate-100"
            >
              <option value="">Semua status</option>
              <option value="pending">pending</option>
              <option value="running">running</option>
              <option value="completed">completed</option>
              <option value="failed">failed</option>
            </select>
          </label>

          <input
            value={filters.skillSlug}
            onChange={(event) => setFilters((current) => ({ ...current, skillSlug: event.target.value }))}
            placeholder="Skill slug"
            className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />

          <input
            type="date"
            value={filters.from}
            onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
            className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />

          <input
            type="date"
            value={filters.to}
            onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
            className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p> : null}

        <div className="mt-6 rounded-md border border-line bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {loading ? <SkeletonTable /> : null}
          {!loading ? (
            <table className="min-w-full divide-y divide-line dark:divide-slate-800">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">Skill</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line dark:divide-slate-800">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm text-ink dark:text-slate-100">{item.skillSlug || item.skillId}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{item.status}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{new Date(item.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Link href={`/executions/${item.id}`} className="text-sm font-medium text-brand dark:text-teal-400">
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-sm text-slate-600 dark:text-slate-300">
                      Tidak ada eksekusi.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : null}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="inline-flex h-10 items-center rounded-md border border-line bg-white px-4 text-sm font-medium text-ink dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            className="inline-flex h-10 items-center rounded-md border border-line bg-white px-4 text-sm font-medium text-ink dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          >
            Next
          </button>
        </div>
      </section>
    </main>
  );
}
