"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, Filter } from "lucide-react";
import { apiFetch } from "@lib/api";
import type { Skill } from "@lib/types";
import { SkeletonCard } from "@components/ui/SkeletonCard";

interface SkillsResponse {
  categories: string[];
}

export function SkillBrowserClient() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const [skillsResponse, categoryResponse] = await Promise.all([
          apiFetch<Skill[]>(`/skills?${new URLSearchParams({
            ...(query ? { search: query } : {}),
            ...(category ? { category } : {})
          }).toString()}`),
          apiFetch<SkillsResponse>("/skills/categories")
        ]);

        if (cancelled) {
          return;
        }

        setSkills(skillsResponse.data ?? []);
        setCategories(categoryResponse.data?.categories ?? []);
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
  }, [category, query]);

  const totalSkills = useMemo(() => skills.length, [skills]);

  return (
    <main className="min-h-screen bg-field px-6 py-8 dark:bg-slate-950">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand dark:text-teal-400">Skill Browser</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink dark:text-slate-100">Daftar Skill Aktif</h1>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300">{totalSkills} skill ditemukan</div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_220px]">
          <label className="flex h-11 items-center gap-2 rounded-md border border-line bg-white px-3 dark:border-slate-800 dark:bg-slate-900">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari skill, deskripsi, atau tag"
              className="h-full w-full bg-transparent text-sm text-ink outline-none dark:text-slate-100"
            />
          </label>

          <label className="flex h-11 items-center gap-2 rounded-md border border-line bg-white px-3 dark:border-slate-800 dark:bg-slate-900">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-full w-full bg-transparent text-sm text-ink outline-none dark:text-slate-100"
            >
              <option value="">Semua kategori</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)
            : skills.map((skill) => (
                <Link
                  key={skill.slug}
                  href={`/skills/${skill.slug}`}
                  className="rounded-md border border-line bg-white p-5 shadow-sm transition hover:border-brand/60 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-ink dark:text-slate-100">{skill.name}</h2>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{skill.description}</p>
                    </div>
                    <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                      {skill.category}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {skill.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-md border border-line px-2 py-1 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Versi {skill.version}</p>
                </Link>
              ))}
        </div>
      </section>
    </main>
  );
}
