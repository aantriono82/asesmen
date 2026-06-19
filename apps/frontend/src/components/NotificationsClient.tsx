"use client";

import { apiFetch } from "@lib/api";
import type { NotificationItem, PaginatedData } from "@lib/types";
import { toast } from "@lib/toast";
import { usePagination } from "@hooks/usePagination";
import { Pagination } from "@components/ui/Pagination";
import { SkeletonTable } from "@components/ui/SkeletonTable";

export function NotificationsClient() {
  const { data, error, isLoading, page, totalPages, goToPage, refresh } = usePagination<NotificationItem>(
    async ({ page: currentPage, limit }) => {
      const response = await apiFetch<PaginatedData<NotificationItem>>(`/notifications?page=${currentPage}&limit=${limit}`);
      if (!response.data) {
        throw new Error("Data notifikasi tidak tersedia");
      }
      return response.data;
    },
    { page: 1, limit: 5 }
  );

  async function markAllAsRead(): Promise<void> {
    try {
      const response = await apiFetch("/notifications/read-all", { method: "PUT" });
      toast.success(response.message);
      await refresh();
    } catch (caught: unknown) {
      toast.error(caught instanceof Error ? caught.message : "Gagal memperbarui notifikasi");
    }
  }

  async function markAsRead(id: string): Promise<void> {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PUT" });
      await refresh();
    } catch (caught: unknown) {
      toast.error(caught instanceof Error ? caught.message : "Gagal menandai notifikasi");
    }
  }

  async function deleteNotification(id: string): Promise<void> {
    try {
      await apiFetch(`/notifications/${id}`, { method: "DELETE" });
      toast.success("Notifikasi dihapus");
      await refresh();
    } catch (caught: unknown) {
      toast.error(caught instanceof Error ? caught.message : "Gagal menghapus notifikasi");
    }
  }

  return (
    <main className="min-h-screen bg-field px-6 py-10 dark:bg-slate-950">
      <section className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand dark:text-teal-400">Notifikasi</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink dark:text-slate-100">Aktivitas In-App</h1>
          </div>
          <button
            type="button"
            onClick={() => void markAllAsRead()}
            className="inline-flex h-10 items-center rounded-md border border-line bg-white px-4 text-sm font-medium text-ink dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            Tandai semua dibaca
          </button>
        </div>

        <div className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {isLoading ? <SkeletonTable /> : null}
          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          {!isLoading && !error && (data?.items.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">Belum ada notifikasi.</p>
          ) : null}
          {!isLoading && !error && (data?.items.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {data?.items.map((item) => (
                <div key={item.id} className="rounded-md border border-line p-4 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-ink dark:text-slate-100">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.message ?? "Tanpa detail tambahan"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!item.isRead ? (
                        <button
                          type="button"
                          onClick={() => void markAsRead(item.id)}
                          className="inline-flex h-9 items-center rounded-md border border-line px-3 text-sm dark:border-slate-700 dark:text-slate-100"
                        >
                          Baca
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void deleteNotification(item.id)}
                        className="inline-flex h-9 items-center rounded-md border border-red-300 px-3 text-sm text-red-600 dark:border-red-800 dark:text-red-300"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
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
