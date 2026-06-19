"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@lib/api";
import { toast } from "@lib/toast";

interface AdminSummaryResponse {
  totals: { users: number; assessments: number; documents: number; tokensToday: number };
  systemHealth: { database: string; queue: string };
  recentErrors: Array<{ id: string; error: string | null; createdAt: string }>;
}

export function AdminOverviewClient() {
  const [data, setData] = useState<AdminSummaryResponse | null>(null);

  useEffect(() => {
    void apiFetch<AdminSummaryResponse>("/admin/summary")
      .then((response) => setData(response.data))
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Gagal memuat ringkasan admin");
      });
  }, []);

  return (
    <main className="min-h-screen bg-field px-6 py-10 dark:bg-slate-950">
      <section className="mx-auto max-w-6xl">
        <div>
          <p className="text-sm font-semibold text-brand dark:text-teal-400">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink dark:text-slate-100">Overview</h1>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            ["Total Users", data?.totals.users ?? 0],
            ["Assessments", data?.totals.assessments ?? 0],
            ["Documents", data?.totals.documents ?? 0],
            ["Token Hari Ini", data?.totals.tokensToday ?? 0]
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-line bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
              <p className="mt-3 text-2xl font-semibold text-ink dark:text-slate-100">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-md border border-line bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-ink dark:text-slate-100">System Health</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <p>Database: <strong>{data?.systemHealth.database ?? "-"}</strong></p>
              <p>pg-boss Queue: <strong>{data?.systemHealth.queue ?? "-"}</strong></p>
            </div>
          </div>
          <div className="rounded-md border border-line bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-ink dark:text-slate-100">Recent Errors</h2>
            <div className="mt-4 grid gap-3">
              {(data?.recentErrors ?? []).map((item) => (
                <div key={item.id} className="rounded-md border border-line p-3 text-sm dark:border-slate-700">
                  <p className="font-medium text-ink dark:text-slate-100">{item.error ?? "Unknown error"}</p>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
