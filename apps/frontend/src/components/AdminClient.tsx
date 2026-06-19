"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@lib/api";
import { getStoredUser, isAdmin } from "@lib/auth";
import type { PaginatedData } from "@lib/types";
import { toast } from "@lib/toast";
import { usePagination } from "@hooks/usePagination";
import { Pagination } from "@components/ui/Pagination";
import { SkeletonTable } from "@components/ui/SkeletonTable";

interface AuditLog {
  id: string;
  action: string;
  entityType: string | null;
  description: string;
  createdAt: string;
}

export function AdminClient() {
  const router = useRouter();
  const { data, error, isLoading, page, totalPages, goToPage, refresh } = usePagination<AuditLog>(
    async ({ page: currentPage, limit }) => {
      const response = await apiFetch<PaginatedData<AuditLog>>(`/admin/audit-logs?page=${currentPage}&limit=${limit}`);
      if (!response.data) {
        throw new Error("Data audit tidak tersedia");
      }
      return response.data;
    },
    { page: 1, limit: 5 }
  );

  useEffect(() => {
    const stored = getStoredUser();
    if (!isAdmin(stored)) {
      router.replace("/dashboard");
    }
  }, []);

  async function syncSkills(): Promise<void> {
    const loaderId = toast.loading("Sinkronisasi skill...");

    try {
      const response = await apiFetch("/admin/skills/sync", { method: "POST" });
      toast.dismiss(loaderId);
      toast.success(response.message);
      await refresh();
    } catch (caught: unknown) {
      toast.dismiss(loaderId);
      toast.error(caught instanceof Error ? caught.message : "Sinkronisasi gagal");
    }
  }

  return (
    <main className="min-h-screen bg-field px-6 py-10 dark:bg-slate-950">
      <section className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand dark:text-teal-400">Admin</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink dark:text-slate-100">Panel Admin</h1>
          </div>
          <button
            type="button"
            onClick={() => void syncSkills()}
            className="inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white"
          >
            Sync Skill
          </button>
        </div>

        <div className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-4 text-sm font-semibold text-ink dark:text-slate-100">Audit Logs</p>
          {isLoading ? <SkeletonTable /> : null}
          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          {!isLoading && !error && (data?.items.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">Belum ada audit log.</p>
          ) : null}
          {!isLoading && !error && (data?.items.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {data?.items.map((item) => (
                <div key={item.id} className="rounded-md border border-line p-3 dark:border-slate-800">
                  <p className="text-sm font-semibold text-ink dark:text-slate-100">
                    {item.action} {item.entityType ? `- ${item.entityType}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
                </div>
              ))}
            </div>
          ) : null}
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={goToPage} />
        </div>
      </section>
    </main>
  );
}
