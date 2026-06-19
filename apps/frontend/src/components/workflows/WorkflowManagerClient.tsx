"use client";

import { useEffect, useState } from "react";
import { Plus, Play } from "lucide-react";
import { apiFetch } from "@lib/api";
import { toast } from "@lib/toast";
import type { Skill, Workflow, WorkflowRun } from "@lib/types";
import { SkeletonCard } from "@components/ui/SkeletonCard";

export function WorkflowManagerClient() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stepsJson, setStepsJson] = useState(
    JSON.stringify(
      [
        {
          skill_slug: "generate-soal-pilihan-ganda",
          input_mapping: {
            topic: "input.topic",
            subject: "input.subject",
            grade_level: "input.grade_level",
            difficulty: "input.difficulty",
            count: "input.count",
            language: "input.language"
          },
          output_key: "questions"
        }
      ],
      null,
      2
    )
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRuns, setLastRuns] = useState<Record<string, WorkflowRun | null>>({});

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const [workflowResponse, skillResponse] = await Promise.all([
          apiFetch<Workflow[]>("/workflows"),
          apiFetch<Skill[]>("/skills")
        ]);

        if (cancelled) {
          return;
        }

        const workflowData = workflowResponse.data ?? [];
        setWorkflows(workflowData);
        setSkills(skillResponse.data ?? []);

        const runs = await Promise.all(
          workflowData.map(async (workflow) => {
            const response = await apiFetch<WorkflowRun[]>(`/workflows/${workflow.id}/runs`);
            return [workflow.id, response.data?.[0] ?? null] as const;
          })
        );

        if (!cancelled) {
          setLastRuns(Object.fromEntries(runs));
        }
      } catch (caught: unknown) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Gagal memuat workflow");
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
  }, []);

  async function createWorkflow(): Promise<void> {
    const loaderId = toast.loading("Membuat workflow...");

    try {
      const steps = JSON.parse(stepsJson) as Array<Record<string, unknown>>;
      const response = await apiFetch<Workflow>("/workflows", {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          steps
        })
      });

      toast.dismiss(loaderId);
      toast.success("Workflow dibuat");
      setName("");
      setDescription("");
      setStepsJson("[]");
      const createdWorkflow = response.data;
      if (createdWorkflow) {
        setWorkflows((current) => [...current, createdWorkflow]);
      }
    } catch (caught: unknown) {
      toast.dismiss(loaderId);
      toast.error(caught instanceof Error ? caught.message : "Workflow gagal dibuat");
    }
  }

  async function runWorkflow(id: string): Promise<void> {
    const loaderId = toast.loading("Menjalankan workflow...");
    try {
      await apiFetch(`/workflows/${id}/run`, {
        method: "POST",
        body: JSON.stringify({ input: {} })
      });
      toast.dismiss(loaderId);
      toast.success("Workflow masuk antrean");
    } catch (caught: unknown) {
      toast.dismiss(loaderId);
      toast.error(caught instanceof Error ? caught.message : "Workflow gagal dijalankan");
    }
  }

  return (
    <main className="min-h-screen bg-field px-6 py-8 dark:bg-slate-950">
      <section className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand dark:text-teal-400">Workflow Manager</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink dark:text-slate-100">Kelola Workflow</h1>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300">{skills.length} skill tersedia</div>
        </div>

        {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p> : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-md border border-line bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-ink dark:text-slate-100">Buat Workflow</h2>
            <div className="mt-4 space-y-3">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nama workflow"
                className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Deskripsi workflow"
                className="min-h-24 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <textarea
                value={stepsJson}
                onChange={(event) => setStepsJson(event.target.value)}
                className="min-h-64 w-full rounded-md border border-line bg-white px-3 py-2 font-mono text-xs text-ink outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => void createWorkflow()}
                className="inline-flex h-11 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-teal-800"
              >
                <Plus className="h-4 w-4" />
                Buat Workflow
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? <SkeletonCard /> : null}
            {!loading
              ? workflows.map((workflow) => (
                  <article key={workflow.id} className="rounded-md border border-line bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-ink dark:text-slate-100">{workflow.name}</h2>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{workflow.description}</p>
                      </div>
                      <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                        {workflow.status}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {workflow.steps.map((step) => (
                        <span key={`${workflow.id}-${step.outputKey}`} className="rounded-md border border-line px-2 py-1 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
                          {step.skillSlug} - {step.outputKey}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <div className="text-sm text-slate-600 dark:text-slate-300">
                        Last run: {lastRuns[workflow.id]?.status ?? "belum ada"}
                      </div>
                      <button
                        type="button"
                        onClick={() => void runWorkflow(workflow.id)}
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-medium text-ink dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      >
                        <Play className="h-4 w-4" />
                        Run
                      </button>
                    </div>
                  </article>
                ))
              : null}
          </div>
        </div>
      </section>
    </main>
  );
}
