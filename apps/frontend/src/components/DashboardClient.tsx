"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { apiFetch } from "@lib/api";
import { getStoredUser, isTeacher } from "@lib/auth";
import { toast } from "@lib/toast";
import type { Skill, SkillExecution, User } from "@lib/types";
import type { SkillExecutionValues } from "@lib/validations/skill.schema";
import { skillExecutionSchema } from "@lib/validations/skill.schema";
import { Pagination } from "@components/ui/Pagination";
import { SkeletonCard } from "@components/ui/SkeletonCard";

const PAGE_SIZE = 4;

export function DashboardClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const { register, handleSubmit, reset } = useForm<SkillExecutionValues>({
    resolver: zodResolver(skillExecutionSchema),
    defaultValues: { prompt: "Jalankan skill ini" }
  });

  useEffect(() => {
    const stored = getStoredUser();
    if (!isTeacher(stored)) {
      router.replace("/login");
      return;
    }

    setUser(stored);
    apiFetch<Skill[]>("/skills")
      .then((response) => setSkills(response.data ?? []))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Gagal memuat skill"))
      .finally(() => setLoading(false));
  }, []);

  const paginatedSkills = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(skills.length / PAGE_SIZE));
    const start = (page - 1) * PAGE_SIZE;
    return {
      items: skills.slice(start, start + PAGE_SIZE),
      totalPages
    };
  }, [page, skills]);

  async function executeSkill(slug: string, values: SkillExecutionValues): Promise<void> {
    const loaderId = toast.loading("Menjalankan skill...");

    try {
      const response = await apiFetch<SkillExecution>(`/skills/${slug}/execute`, {
        method: "POST",
        body: JSON.stringify(values)
      });

      toast.dismiss(loaderId);
      toast.success(response.message);
      reset({ prompt: "Jalankan skill ini" });
    } catch (caught: unknown) {
      toast.dismiss(loaderId);
      toast.error(caught instanceof Error ? caught.message : "Gagal mengeksekusi skill");
    }
  }

  return (
    <main className="min-h-screen bg-field dark:bg-slate-950">
      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <p className="text-sm text-slate-600 dark:text-slate-300">Login sebagai</p>
          <p className="font-semibold text-ink dark:text-slate-100">{user ? `${user.name} (${user.role})` : "Memuat..."}</p>
        </div>

        {error ? (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)
            : paginatedSkills.items.map((skill) => (
                <article
                  key={skill.slug}
                  className="rounded-lg border border-line bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-ink dark:text-slate-100">{skill.name}</h2>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{skill.description}</p>
                    </div>
                    <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-accent dark:bg-amber-950/40 dark:text-amber-300">
                      {skill.category}
                    </span>
                  </div>
                  <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Version {skill.version}</p>
                  <form onSubmit={handleSubmit((values) => executeSkill(skill.slug, values))} className="mt-4 space-y-3">
                    <textarea
                      {...register("prompt")}
                      className="min-h-24 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                    <button
                      type="submit"
                      className="inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-teal-800"
                    >
                      Eksekusi Skill
                    </button>
                  </form>
                </article>
              ))}
        </div>

        <Pagination currentPage={page} totalPages={paginatedSkills.totalPages} onPageChange={setPage} />
      </section>
    </main>
  );
}
