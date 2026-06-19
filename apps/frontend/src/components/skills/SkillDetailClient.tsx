"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play } from "lucide-react";
import { apiFetch } from "@lib/api";
import { toast } from "@lib/toast";
import type { Skill } from "@lib/types";
import { SkeletonCard } from "@components/ui/SkeletonCard";

interface ExecutionResult {
  executionId: string;
  status: "pending";
}

type FieldValue = string | boolean;

export function SkillDetailClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [skill, setSkill] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, FieldValue>>({});

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const response = await apiFetch<Skill>(`/skills/${slug}`);
        if (cancelled) {
          return;
        }

        const fetchedSkill = response.data ?? null;
        setSkill(fetchedSkill);
        setValues(buildInitialValues(fetchedSkill));
      } catch (caught: unknown) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Gagal memuat skill");
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
  }, [slug]);

  const fields = useMemo(() => {
    return skill ? extractFields(skill.inputSchema) : [];
  }, [skill]);

  async function handleExecute(): Promise<void> {
    if (!skill) {
      return;
    }

    const payload = buildPayload(skill, values);
    const loaderId = toast.loading("Menjalankan skill...");

    try {
      const response = await apiFetch<ExecutionResult>(`/skills/${skill.slug}/execute`, {
        method: "POST",
        body: JSON.stringify({ input: payload })
      });

      toast.dismiss(loaderId);
      toast.success("Skill masuk antrean");
      if (response.data?.executionId) {
        router.push(`/executions/${response.data.executionId}`);
      }
    } catch (caught: unknown) {
      toast.dismiss(loaderId);
      toast.error(caught instanceof Error ? caught.message : "Eksekusi gagal");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-field px-6 py-8 dark:bg-slate-950">
        <section className="mx-auto max-w-5xl">
          <SkeletonCard />
        </section>
      </main>
    );
  }

  if (error || !skill) {
    return (
      <main className="min-h-screen bg-field px-6 py-8 dark:bg-slate-950">
        <section className="mx-auto max-w-5xl">
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error ?? "Skill tidak ditemukan"}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-field px-6 py-8 dark:bg-slate-950">
      <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-md border border-line bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm font-medium text-brand dark:text-teal-400">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>
          <div className="mt-4">
            <p className="text-sm font-semibold text-brand dark:text-teal-400">{skill.category}</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink dark:text-slate-100">{skill.name}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{skill.description}</p>
          </div>

          <div className="mt-6 space-y-4">
            {fields.map((field) => (
              <label key={field.key} className="block">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-ink dark:text-slate-100">{field.key}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{field.type}</span>
                </div>
                {field.type === "boolean" ? (
                  <select
                    value={String(values[field.key] ?? "false")}
                    onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value === "true" }))}
                    className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="false">false</option>
                    <option value="true">true</option>
                  </select>
                ) : (
                  <input
                    value={String(values[field.key] ?? "")}
                    onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                    placeholder={field.placeholder}
                    className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                )}
                {field.description ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{field.description}</p> : null}
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void handleExecute()}
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-teal-800"
          >
            <Play className="h-4 w-4" />
            Jalankan Skill
          </button>
        </div>

        <aside className="space-y-4">
          <div className="rounded-md border border-line bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-ink dark:text-slate-100">Prompt</h2>
            <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs leading-6 text-slate-600 dark:text-slate-300">
              {skill.promptTemplate || skill.sections.prompt || "Tidak ada template prompt."}
            </pre>
          </div>

          <div className="rounded-md border border-line bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-ink dark:text-slate-100">Schema Input</h2>
            <pre className="mt-3 overflow-auto text-xs leading-6 text-slate-600 dark:text-slate-300">
              {JSON.stringify(skill.inputSchema, null, 2)}
            </pre>
          </div>

          <div className="rounded-md border border-line bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-ink dark:text-slate-100">Output</h2>
            <pre className="mt-3 overflow-auto text-xs leading-6 text-slate-600 dark:text-slate-300">
              {JSON.stringify(skill.outputSchema, null, 2)}
            </pre>
          </div>
        </aside>
      </section>
    </main>
  );
}

function extractFields(schema: Record<string, unknown>): Array<{ key: string; type: string; placeholder: string; description: string }> {
  const properties = isRecord(schema.properties) ? schema.properties : {};
  return Object.entries(properties).map(([key, value]) => {
    const property = isRecord(value) ? value : {};
    const type = typeof property.type === "string" ? property.type : "string";
    const description = typeof property.description === "string" ? property.description : "";
    return {
      key,
      type,
      placeholder: type === "array" || type === "object" ? "JSON" : key,
      description
    };
  });
}

function buildInitialValues(skill: Skill | null): Record<string, FieldValue> {
  if (!skill) {
    return {};
  }

  const fields = extractFields(skill.inputSchema);
  return Object.fromEntries(
    fields.map((field) => [
      field.key,
      field.type === "boolean" ? false : field.type === "array" || field.type === "object" ? "[]" : ""
    ])
  );
}

function buildPayload(skill: Skill, values: Record<string, FieldValue>): Record<string, unknown> {
  const properties = isRecord(skill.inputSchema.properties) ? skill.inputSchema.properties : {};
  const payload: Record<string, unknown> = {};

  for (const [key, schema] of Object.entries(properties)) {
    const property = isRecord(schema) ? schema : {};
    const type = typeof property.type === "string" ? property.type : "string";
    const rawValue = values[key];

    if (type === "boolean") {
      payload[key] = Boolean(rawValue);
      continue;
    }

    if (type === "integer" || type === "number") {
      payload[key] = typeof rawValue === "string" && rawValue.length > 0 ? Number(rawValue) : 0;
      continue;
    }

    if (type === "array" || type === "object") {
      try {
        payload[key] = rawValue ? JSON.parse(String(rawValue)) : type === "array" ? [] : {};
      } catch {
        payload[key] = type === "array" ? [] : {};
      }
      continue;
    }

    payload[key] = String(rawValue ?? "");
  }

  return payload;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
