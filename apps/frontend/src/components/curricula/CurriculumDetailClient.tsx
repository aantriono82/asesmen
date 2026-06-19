"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Code2, Save } from "lucide-react";
import { apiFetch } from "@lib/api";
import { toast } from "@lib/toast";
import type { Curriculum } from "@lib/types";
import { SkeletonCard } from "@components/ui/SkeletonCard";

type ViewMode = "structured" | "json";

export function CurriculumDetailClient({ id }: { id: string }) {
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("structured");
  const [jsonDraft, setJsonDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = await apiFetch<Curriculum>(`/curricula/${id}`);
        if (!cancelled) {
          setCurriculum(response.data);
          setJsonDraft(JSON.stringify(response.data?.content ?? {}, null, 2));
        }
      } catch (caught: unknown) {
        if (!cancelled) {
          toast.error(caught instanceof Error ? caught.message : "Gagal memuat kurikulum");
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
  }, [id]);

  const content = useMemo(() => normalizeContent(curriculum?.content), [curriculum?.content]);

  async function save() {
    if (!curriculum) {
      return;
    }

    let nextContent: Record<string, unknown> = content;
    if (viewMode === "json") {
      try {
        const parsed = JSON.parse(jsonDraft) as unknown;
        if (!isRecord(parsed)) {
          throw new Error("JSON harus berupa object");
        }
        nextContent = parsed;
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "JSON tidak valid");
        return;
      }
    }

    try {
      await apiFetch(`/curricula/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: curriculum.title,
          content: nextContent,
          status: curriculum.status
        })
      });
      setCurriculum((current) => (current ? { ...current, content: nextContent } : current));
      setJsonDraft(JSON.stringify(nextContent, null, 2));
      toast.success("Kurikulum diperbarui");
    } catch (caught: unknown) {
      toast.error(caught instanceof Error ? caught.message : "Gagal menyimpan kurikulum");
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

  if (!curriculum) {
    return <main className="px-6 py-8 text-sm">Kurikulum tidak ditemukan.</main>;
  }

  return (
    <main className="min-h-screen bg-field px-6 py-8 dark:bg-slate-950">
      <section className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-brand dark:text-teal-400">Curriculum Detail</p>
            <input
              value={curriculum.title}
              onChange={(event) => setCurriculum({ ...curriculum, title: event.target.value })}
              className="w-full bg-transparent text-3xl font-semibold text-ink outline-none dark:text-slate-100"
            />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {curriculum.type} · {curriculum.subject} · {curriculum.gradeLevel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setViewMode((current) => (current === "json" ? "structured" : "json"))}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-medium text-ink dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <Code2 className="h-4 w-4" />
              {viewMode === "json" ? "Lihat Terstruktur" : "Lihat sebagai JSON"}
            </button>
            <button type="button" onClick={() => void save()} className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white">
              <Save className="h-4 w-4" />
              Simpan
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-md border border-line bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {viewMode === "json" ? (
            <textarea
              value={jsonDraft}
              onChange={(event) => setJsonDraft(event.target.value)}
              className="min-h-[480px] w-full rounded-md border border-line bg-slate-50 p-4 font-mono text-sm text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              spellCheck={false}
            />
          ) : (
            <StructuredContent curriculum={curriculum} content={content} />
          )}
        </div>
      </section>
    </main>
  );
}

function StructuredContent({ curriculum, content }: { curriculum: Curriculum; content: Record<string, unknown> }) {
  if (curriculum.type === "rpp") {
    return (
      <div className="grid gap-6">
        <Section title="Tujuan Pembelajaran">
          <BulletList items={toStringArray(content.tujuan_pembelajaran)} />
        </Section>

        <Section title="Langkah Pembelajaran">
          <SubSection title="Pendahuluan">
            <BulletList items={toObjectArray(content.langkah_pembelajaran, "pendahuluan")} />
          </SubSection>
          <SubSection title="Kegiatan Inti">
            <BulletList items={toObjectArray(content.langkah_pembelajaran, "inti")} />
          </SubSection>
          <SubSection title="Penutup">
            <BulletList items={toObjectArray(content.langkah_pembelajaran, "penutup")} />
          </SubSection>
        </Section>

        <GridLists
          asesmen={toStringArray(content.asesmen)}
          media={toStringArray(content.media)}
          sumberBelajar={toStringArray(content.sumber_belajar)}
        />
      </div>
    );
  }

  if (curriculum.type === "silabus") {
    const items = toArray(content.items);
    return (
      <div className="grid gap-6">
        <Section title="Ringkasan">
          <p className="text-sm leading-7 text-slate-700 dark:text-slate-300">{toString(content.overview)}</p>
        </Section>
        <Section title="Item Silabus">
          <div className="grid gap-4">
            {items.map((item, index) => (
              <article key={index} className="rounded-md border border-line bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-sm font-semibold text-ink dark:text-slate-100">KD {toString(item.kompetensi_dasar)}</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{toString(item.materi_pokok)}</p>
                <MiniList title="Indikator" items={toObjectArray(item, "indikator")} />
                <MiniList title="Kegiatan Pembelajaran" items={toObjectArray(item, "kegiatan_pembelajaran")} />
                <MiniList title="Penilaian" items={toObjectArray(item, "penilaian")} />
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Alokasi waktu: {toString(item.alokasi_waktu)}</p>
              </article>
            ))}
          </div>
        </Section>
      </div>
    );
  }

  if (curriculum.type === "prota") {
    const items = toArray(content.annual_plan);
    return (
      <div className="grid gap-6">
        <Section title="Program Tahunan">
          <div className="grid gap-4">
            {items.map((item, index) => (
              <article key={index} className="rounded-md border border-line bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-sm font-semibold text-ink dark:text-slate-100">
                  {toString(item.bulan)} · {toString(item.kd)}
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{toString(item.target)}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Alokasi waktu: {toString(item.alokasi_waktu)}</p>
              </article>
            ))}
          </div>
        </Section>
      </div>
    );
  }

  if (curriculum.type === "prosem") {
    const items = toArray(content.semester_plan);
    return (
      <div className="grid gap-6">
        <Section title="Program Semester">
          <div className="grid gap-4">
            {items.map((item, index) => (
              <article key={index} className="rounded-md border border-line bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-sm font-semibold text-ink dark:text-slate-100">
                  Semester {toString(item.semester)} · {toString(item.kd)} · Pekan {toString(item.pekan)}
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{toString(item.target)}</p>
              </article>
            ))}
          </div>
        </Section>
      </div>
    );
  }

  if (curriculum.type === "kisi_kisi") {
    const items = toArray(content.items);
    return (
      <div className="grid gap-6">
        <Section title="Ringkasan">
          <p className="text-sm leading-7 text-slate-700 dark:text-slate-300">{toString(content.overview)}</p>
        </Section>
        <Section title="Item Kisi-kisi">
          <div className="grid gap-4">
            {items.map((item, index) => (
              <article key={index} className="rounded-md border border-line bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-sm font-semibold text-ink dark:text-slate-100">
                  {toString(item.kd)} · {toString(item.bentuk_soal)}
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{toString(item.indikator)}</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Materi: {toString(item.materi)}</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Level kognitif: {toString(item.level_kognitif)}</p>
                <BulletList items={toNumberArray(item.nomor_soal).map((value) => `Soal nomor ${String(value)}`)} />
              </article>
            ))}
          </div>
        </Section>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-slate-600 dark:text-slate-300">Konten belum dikenali. Gunakan mode JSON untuk melihat data mentah.</p>
      <pre className="overflow-x-auto rounded-md bg-slate-50 p-4 text-sm dark:bg-slate-950">{JSON.stringify(content, null, 2)}</pre>
    </div>
  );
}

function GridLists({
  asesmen,
  media,
  sumberBelajar
}: {
  asesmen: string[];
  media: string[];
  sumberBelajar: string[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Section title="Asesmen">
        <BulletList items={asesmen} />
      </Section>
      <Section title="Media">
        <BulletList items={media} />
      </Section>
      <Section title="Sumber Belajar">
        <BulletList items={sumberBelajar} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="text-base font-semibold text-ink dark:text-slate-100">{title}</h2>
      {children}
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
      {children}
    </div>
  );
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-2">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</p>
      <BulletList items={items} />
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada data.</p>;
  }

  return (
    <ul className="grid gap-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-start gap-2 text-sm leading-7 text-slate-700 dark:text-slate-300">
          <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-brand dark:bg-teal-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function normalizeContent(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toNumberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((item): item is number => typeof item === "number") : [];
}

function toArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function toObjectArray(value: unknown, key: string): string[] {
  if (isRecord(value)) {
    const item = value[key];
    return toStringArray(item);
  }

  return toStringArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
