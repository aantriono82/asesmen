"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@lib/api";
import { toast } from "@lib/toast";

interface MetricsResponse {
  skillExecutions: Array<{ status: string; count: number }>;
  queueDepth: { pending: number; active: number };
  activeRateLimitKeys: number;
}

export function AdminMetricsClient() {
  const [data, setData] = useState<MetricsResponse | null>(null);

  useEffect(() => {
    void apiFetch<MetricsResponse>("/admin/metrics/overview")
      .then((response) => setData(response.data))
      .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Gagal memuat metrik"));
  }, []);

  return (
    <main className="min-h-screen bg-field px-6 py-10 dark:bg-slate-950">
      <section className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-semibold text-ink dark:text-slate-100">Admin Metrics</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard label="Pending Queue" value={data?.queueDepth.pending ?? 0} />
          <MetricCard label="Active Queue" value={data?.queueDepth.active ?? 0} />
          <MetricCard label="Rate Limit Keys" value={data?.activeRateLimitKeys ?? 0} />
        </div>
        <div className="mt-6 rounded-md border border-line bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-ink dark:text-slate-100">Skill Execution Success Rate</h2>
          <div className="mt-4 grid gap-3">
            {(data?.skillExecutions ?? []).map((item) => (
              <div key={item.status} className="flex items-center justify-between rounded-md border border-line px-4 py-3 text-sm dark:border-slate-700">
                <span className="capitalize">{item.status}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-line bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-ink dark:text-slate-100">{value}</p>
    </div>
  );
}
