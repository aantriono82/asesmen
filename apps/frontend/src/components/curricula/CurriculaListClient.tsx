"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { apiFetch } from "@lib/api";
import { toast } from "@lib/toast";
import type { Curriculum, PaginatedData } from "@lib/types";
import { Pagination } from "@components/ui/Pagination";
import { SkeletonCard } from "@components/ui/SkeletonCard";

const curriculumTypes = ["silabus", "rpp", "prota", "prosem", "kisi_kisi"] as const;
type CurriculumType = (typeof curriculumTypes)[number];

type GenerateFormState = {
  type: CurriculumType;
  title: string;
  subject: string;
  grade_level: string;
  semester: string;
  academic_year: string;
  kompetensi_dasar: string;
  kd: string;
  materi: string;
  alokasi_waktu: string;
  metode_pembelajaran: string;
  kd_list: string;
  indikator: string;
  assessment_id: string;
};

function createDefaultGenerateForm(type: CurriculumType = "rpp"): GenerateFormState {
  return {
    type,
    title: "",
    subject: "IPA",
    grade_level: "Kelas 8 SMP",
    semester: "1",
    academic_year: "2026/2027",
    kompetensi_dasar: "3.5",
    kd: "3.5",
    materi: "Fotosintesis",
    alokasi_waktu: "2 x 40 menit",
    metode_pembelajaran: "Diskusi",
    kd_list: "3.5, 4.5",
    indikator: "Menjelaskan proses fotosintesis",
    assessment_id: ""
  };
}

export function CurriculaListClient() {
  const [items, setItems] = useState<Curriculum[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState<GenerateFormState>(createDefaultGenerateForm());

  async function load(): Promise<void> {
    setLoading(true);
    try {
      const query = new URLSearchParams({ page: String(page), ...(type ? { type } : {}) });
      const response = await apiFetch<PaginatedData<Curriculum>>(`/curricula?${query.toString()}`);
      setItems(response.data?.items ?? []);
      setTotalPages(response.data?.totalPages ?? 1);
    } catch (caught: unknown) {
      toast.error(caught instanceof Error ? caught.message : "Gagal memuat kurikulum");
    } finally {
      setLoading(false);
    }
  }

  function openGenerateModal(prefillType?: CurriculumType) {
    setGenerateForm(createDefaultGenerateForm(prefillType ?? "rpp"));
    setIsGenerateOpen(true);
  }

  function updateGenerateForm(patch: Partial<GenerateFormState>) {
    setGenerateForm((current) => ({ ...current, ...patch }));
  }

  function parseCsv(value: string): string[] {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
  }

  useEffect(() => {
    void load();
  }, [page, type]);

  async function generate() {
    try {
      const payload: Record<string, unknown> = {
        type: generateForm.type,
        subject: generateForm.subject,
        grade_level: generateForm.grade_level,
        ...(generateForm.title.trim() ? { title: generateForm.title.trim() } : {})
      };

      if (generateForm.type === "silabus") {
        payload.semester = generateForm.semester.trim();
        payload.config = {
          semester: generateForm.semester.trim(),
          kompetensi_dasar: parseCsv(generateForm.kompetensi_dasar),
          alokasi_waktu: generateForm.alokasi_waktu.trim()
        };
      } else if (generateForm.type === "rpp") {
        payload.config = {
          kd: generateForm.kd.trim(),
          materi: generateForm.materi.trim(),
          alokasi_waktu: generateForm.alokasi_waktu.trim(),
          metode_pembelajaran: generateForm.metode_pembelajaran.trim()
        };
      } else if (generateForm.type === "prota" || generateForm.type === "prosem") {
        payload.academic_year = generateForm.academic_year.trim();
        payload.config = {
          academic_year: generateForm.academic_year.trim(),
          kd_list: parseCsv(generateForm.kd_list)
        };
      } else {
        const assessmentId = generateForm.assessment_id.trim();
        const kisiKisiConfig: Record<string, unknown> = {
          kd: parseCsv(generateForm.kd),
          indikator: parseCsv(generateForm.indikator)
        };

        if (assessmentId) {
          if (!isUuid(assessmentId)) {
            toast.warning("Assessment ID harus UUID valid. Nilai itu diabaikan, kisi-kisi akan dibuat dari KD dan indikator.");
          } else {
            kisiKisiConfig.assessment_id = assessmentId;
          }
        }

        payload.config = kisiKisiConfig;
      }

      await apiFetch("/curricula/generate", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      toast.success("Kurikulum berhasil dibuat");
      setIsGenerateOpen(false);
      await load();
    } catch (caught: unknown) {
      toast.error(caught instanceof Error ? caught.message : "Gagal generate kurikulum");
    }
  }

  return (
    <main className="min-h-screen bg-field px-6 py-8 dark:bg-slate-950">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand dark:text-teal-400">Curricula</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink dark:text-slate-100">Generator Kurikulum</h1>
          </div>
          <button type="button" onClick={() => openGenerateModal()} className="btn-primary inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Generate Kurikulum Baru
          </button>
        </div>

        <div className="mt-6">
          <select value={type} onChange={(event) => setType(event.target.value)} className="input-base max-w-xs">
            <option value="">Semua tipe</option>
            <option value="silabus">Silabus</option>
            <option value="rpp">RPP</option>
            <option value="prota">Prota</option>
            <option value="prosem">Prosem</option>
            <option value="kisi_kisi">Kisi-kisi</option>
          </select>
        </div>

        <div className="mt-6 grid gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)
            : items.map((curriculum) => (
                <Link key={curriculum.id} href={`/curricula/${curriculum.id}`} className="rounded-md border border-line bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-ink dark:text-slate-100">{curriculum.title}</h2>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        {curriculum.type} · {curriculum.subject} · {curriculum.gradeLevel}
                      </p>
                    </div>
                    <span className="rounded-md border border-line px-2 py-1 text-xs dark:border-slate-700 dark:text-slate-100">{curriculum.status}</span>
                  </div>
                </Link>
              ))}
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </section>

      {isGenerateOpen ? (
        <div className="fixed inset-0 z-40 bg-slate-950/60 p-4 sm:p-6">
          <div className="mx-auto mt-6 max-w-3xl rounded-md border border-line bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-brand dark:text-teal-400">Generate Kurikulum Baru</p>
                <h2 className="mt-1 text-xl font-semibold text-ink dark:text-slate-100">Buat kurikulum dari endpoint `/api/curricula/generate`</h2>
              </div>
              <button type="button" onClick={() => setIsGenerateOpen(false)} className="rounded-md border border-line p-2 text-slate-500 dark:border-slate-700 dark:text-slate-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Tipe">
                <select value={generateForm.type} onChange={(event) => updateGenerateForm({ type: event.target.value as CurriculumType })} className="input-base">
                  {curriculumTypes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Judul">
                <input value={generateForm.title} onChange={(event) => updateGenerateForm({ title: event.target.value })} className="input-base" placeholder="Opsional" />
              </Field>
              <Field label="Subject">
                <input value={generateForm.subject} onChange={(event) => updateGenerateForm({ subject: event.target.value })} className="input-base" />
              </Field>
              <Field label="Grade Level">
                <input value={generateForm.grade_level} onChange={(event) => updateGenerateForm({ grade_level: event.target.value })} className="input-base" />
              </Field>
            </div>

            {generateForm.type === "silabus" ? (
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <Field label="Semester">
                  <input value={generateForm.semester} onChange={(event) => updateGenerateForm({ semester: event.target.value })} className="input-base" />
                </Field>
                <Field label="Kompetensi Dasar">
                  <input value={generateForm.kompetensi_dasar} onChange={(event) => updateGenerateForm({ kompetensi_dasar: event.target.value })} className="input-base" placeholder="Dipisah koma" />
                </Field>
                <Field label="Alokasi Waktu">
                  <input value={generateForm.alokasi_waktu} onChange={(event) => updateGenerateForm({ alokasi_waktu: event.target.value })} className="input-base" />
                </Field>
              </div>
            ) : null}

            {generateForm.type === "rpp" ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="KD">
                  <input value={generateForm.kd} onChange={(event) => updateGenerateForm({ kd: event.target.value })} className="input-base" />
                </Field>
                <Field label="Materi">
                  <input value={generateForm.materi} onChange={(event) => updateGenerateForm({ materi: event.target.value })} className="input-base" />
                </Field>
                <Field label="Alokasi Waktu">
                  <input value={generateForm.alokasi_waktu} onChange={(event) => updateGenerateForm({ alokasi_waktu: event.target.value })} className="input-base" />
                </Field>
                <Field label="Metode Pembelajaran">
                  <input value={generateForm.metode_pembelajaran} onChange={(event) => updateGenerateForm({ metode_pembelajaran: event.target.value })} className="input-base" />
                </Field>
              </div>
            ) : null}

            {generateForm.type === "prota" || generateForm.type === "prosem" ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Academic Year">
                  <input value={generateForm.academic_year} onChange={(event) => updateGenerateForm({ academic_year: event.target.value })} className="input-base" />
                </Field>
                <Field label="KD List">
                  <input value={generateForm.kd_list} onChange={(event) => updateGenerateForm({ kd_list: event.target.value })} className="input-base" placeholder="Dipisah koma" />
                </Field>
              </div>
            ) : null}

              {generateForm.type === "kisi_kisi" ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Assessment UUID">
                  <input
                    value={generateForm.assessment_id}
                    onChange={(event) => updateGenerateForm({ assessment_id: event.target.value })}
                    className="input-base"
                    placeholder="UUID opsional"
                  />
                </Field>
                <Field label="KD">
                  <input value={generateForm.kd} onChange={(event) => updateGenerateForm({ kd: event.target.value })} className="input-base" placeholder="Dipisah koma" />
                </Field>
                <Field label="Indikator">
                  <textarea value={generateForm.indikator} onChange={(event) => updateGenerateForm({ indikator: event.target.value })} className="input-base min-h-28 md:col-span-2" placeholder="Dipisah koma" />
                </Field>
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setIsGenerateOpen(false)} className="inline-flex h-10 items-center rounded-md border border-line px-4 text-sm dark:border-slate-700 dark:text-slate-100">
                Batal
              </button>
              <button type="button" onClick={() => void generate()} className="inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white">
                Generate
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
      <span>{label}</span>
      {children}
    </label>
  );
}
