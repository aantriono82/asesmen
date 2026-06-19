"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { apiFetch } from "@lib/api";
import { toast } from "@lib/toast";
import type { KnowledgeBase, Skill } from "@lib/types";
import { assessmentWizardSchema, type AssessmentWizardValues } from "@lib/validations/assessment.schema";

const steps = ["Info Dasar", "Konfigurasi Soal", "Sumber Konten", "Review & Generate"];

export function AssessmentWizardClient() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const form = useForm<AssessmentWizardValues>({
    resolver: zodResolver(assessmentWizardSchema),
    defaultValues: {
      title: "",
      subject: "",
      grade_level: "",
      assessment_type: "latihan",
      duration_minutes: 60,
      instructions: "",
      content_source: "topic",
      topic: "",
      knowledge_base_id: undefined,
      use_question_bank: false,
      cognitive_levels: ["C1", "C2"],
      difficulty_mix: { mudah: 40, sedang: 40, sulit: 20 },
      question_types: []
    }
  });

  useEffect(() => {
    let cancelled = false;
    async function loadInitialData() {
      try {
        const [skillsResponse, kbResponse] = await Promise.all([
          apiFetch<Skill[]>("/skills"),
          apiFetch<KnowledgeBase[]>("/knowledge-bases")
        ]);
        if (!cancelled) {
          const assessmentSkills = (skillsResponse.data ?? []).filter((skill) => skill.category === "assessment");
          setSkills(assessmentSkills);
          setKnowledgeBases(kbResponse.data ?? []);
          form.setValue(
            "question_types",
            assessmentSkills.slice(0, 2).map((skill) => ({ skill_slug: skill.slug, count: 0, score: 1 }))
          );
        }
      } catch (caught: unknown) {
        if (!cancelled) {
          toast.error(caught instanceof Error ? caught.message : "Gagal memuat skill");
        }
      } finally {
        if (!cancelled) {
          setLoadingSkills(false);
        }
      }
    }
    void loadInitialData();
    return () => {
      cancelled = true;
    };
  }, [form]);

  const values = form.watch();
  const totalQuestions = useMemo(
    () => values.question_types.reduce((sum, item) => sum + item.count, 0),
    [values.question_types]
  );

  async function submit(valuesToSubmit: AssessmentWizardValues) {
    const toastId = toast.loading("Membuat assessment...");
    try {
      const questionTypes = valuesToSubmit.question_types.filter((item) => item.count > 0);
      const response = await apiFetch<{ assessmentId: string; status: string }>("/assessments/generate", {
        method: "POST",
        body: JSON.stringify({
          title: valuesToSubmit.title,
          subject: valuesToSubmit.subject,
          grade_level: valuesToSubmit.grade_level,
          assessment_type: valuesToSubmit.assessment_type,
          duration_minutes: valuesToSubmit.duration_minutes,
          instructions: valuesToSubmit.instructions,
          topic: valuesToSubmit.topic,
          knowledge_base_id: valuesToSubmit.content_source === "knowledge_base" ? valuesToSubmit.knowledge_base_id : undefined,
          use_question_bank: valuesToSubmit.use_question_bank,
          config: {
            total_questions: questionTypes.reduce((sum, item) => sum + item.count, 0),
            question_types: questionTypes,
            difficulty_mix: valuesToSubmit.difficulty_mix,
            cognitive_levels: valuesToSubmit.cognitive_levels
          }
        })
      });
      toast.dismiss(toastId);
      toast.success("Assessment masuk antrean");
      router.push(`/assessments/${response.data?.assessmentId}`);
    } catch (caught: unknown) {
      toast.dismiss(toastId);
      toast.error(caught instanceof Error ? caught.message : "Gagal membuat assessment");
    }
  }

  return (
    <main className="min-h-screen bg-field px-6 py-8 dark:bg-slate-950">
      <section className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold text-brand dark:text-teal-400">Assessment Wizard</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink dark:text-slate-100">Buat Assessment Baru</h1>

        <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(index)}
              className={`h-11 rounded-md border text-sm font-medium ${
                index === step
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={form.handleSubmit(submit)} className="mt-6 grid gap-6 rounded-md border border-line bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          {step === 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Judul">
                <input {...form.register("title")} className="input-base" />
              </Field>
              <Field label="Mata Pelajaran">
                <input {...form.register("subject")} className="input-base" />
              </Field>
              <Field label="Kelas">
                <input {...form.register("grade_level")} className="input-base" />
              </Field>
              <Field label="Tipe Ujian">
                <select {...form.register("assessment_type")} className="input-base">
                  <option value="latihan">Latihan</option>
                  <option value="ulangan_harian">Ulangan Harian</option>
                  <option value="uts">UTS</option>
                  <option value="uas">UAS</option>
                  <option value="try_out">Try Out</option>
                </select>
              </Field>
              <Field label="Durasi (menit)">
                <input
                  type="number"
                  value={values.duration_minutes}
                  onChange={(event) => form.setValue("duration_minutes", Number(event.target.value))}
                  className="input-base"
                />
              </Field>
              <Field label="Petunjuk">
                <textarea {...form.register("instructions")} className="input-base min-h-28" />
              </Field>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Mudah (%)">
                  <input type="number" value={values.difficulty_mix.mudah} onChange={(event) => form.setValue("difficulty_mix.mudah", Number(event.target.value))} className="input-base" />
                </Field>
                <Field label="Sedang (%)">
                  <input type="number" value={values.difficulty_mix.sedang} onChange={(event) => form.setValue("difficulty_mix.sedang", Number(event.target.value))} className="input-base" />
                </Field>
                <Field label="Sulit (%)">
                  <input type="number" value={values.difficulty_mix.sulit} onChange={(event) => form.setValue("difficulty_mix.sulit", Number(event.target.value))} className="input-base" />
                </Field>
              </div>

              <div className="grid gap-4">
                <p className="text-sm font-medium text-ink dark:text-slate-100">Pilih skill dan jumlah soal</p>
                {loadingSkills ? <p className="text-sm text-slate-500">Memuat skill...</p> : null}
                {values.question_types.map((item, index) => (
                  <div key={item.skill_slug} className="grid gap-3 rounded-md border border-line p-4 dark:border-slate-700 md:grid-cols-[1fr_120px_120px]">
                    <div>
                      <p className="font-medium text-ink dark:text-slate-100">{skills.find((skill) => skill.slug === item.skill_slug)?.name ?? item.skill_slug}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{item.skill_slug}</p>
                    </div>
                    <Field label="Jumlah">
                      <input type="number" value={item.count} onChange={(event) => form.setValue(`question_types.${index}.count`, Number(event.target.value))} className="input-base" />
                    </Field>
                    <Field label="Skor">
                      <input type="number" value={item.score} onChange={(event) => form.setValue(`question_types.${index}.score`, Number(event.target.value))} className="input-base" />
                    </Field>
                  </div>
                ))}
              </div>

              <Field label="Level Kognitif">
                <div className="flex flex-wrap gap-2">
                  {["C1", "C2", "C3", "C4", "C5", "C6"].map((level) => {
                    const active = values.cognitive_levels.includes(level as never);
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() =>
                          form.setValue(
                            "cognitive_levels",
                            active ? values.cognitive_levels.filter((item) => item !== level) : [...values.cognitive_levels, level as never]
                          )
                        }
                        className={`h-10 rounded-md border px-3 text-sm ${active ? "border-brand bg-brand text-white" : "border-line dark:border-slate-700 dark:text-slate-200"}`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className={`rounded-md border p-4 text-sm ${values.content_source === "topic" ? "border-brand bg-brand/5" : "border-line dark:border-slate-700"}`}>
                  <input
                    type="radio"
                    value="topic"
                    checked={values.content_source === "topic"}
                    onChange={() => form.setValue("content_source", "topic")}
                    className="mr-2"
                  />
                  Topik Bebas
                </label>
                <label className={`rounded-md border p-4 text-sm ${values.content_source === "knowledge_base" ? "border-brand bg-brand/5" : "border-line dark:border-slate-700"}`}>
                  <input
                    type="radio"
                    value="knowledge_base"
                    checked={values.content_source === "knowledge_base"}
                    onChange={() => form.setValue("content_source", "knowledge_base")}
                    className="mr-2"
                  />
                  Dari Knowledge Base
                </label>
              </div>
              {values.content_source === "topic" ? (
                <Field label="Topik Bebas">
                  <textarea {...form.register("topic")} className="input-base min-h-32" />
                </Field>
              ) : (
                <Field label="Knowledge Base">
                  <select
                    value={values.knowledge_base_id ?? ""}
                    onChange={(event) => form.setValue("knowledge_base_id", event.target.value || undefined)}
                    className="input-base"
                  >
                    <option value="">Pilih Knowledge Base</option>
                    {knowledgeBases.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.documentCount} dokumen)
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <label className="flex items-center gap-3 text-sm text-ink dark:text-slate-100">
                <input type="checkbox" checked={values.use_question_bank} onChange={(event) => form.setValue("use_question_bank", event.target.checked)} />
                Campur dengan soal dari bank soal
              </label>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-4 rounded-md border border-line bg-slate-50 p-5 text-sm dark:border-slate-800 dark:bg-slate-950">
              <SummaryRow label="Judul" value={values.title} />
              <SummaryRow label="Subject" value={values.subject} />
              <SummaryRow label="Kelas" value={values.grade_level} />
              <SummaryRow label="Tipe" value={values.assessment_type} />
              <SummaryRow label="Total Soal" value={String(totalQuestions)} />
              <SummaryRow label="Sumber" value={values.content_source === "topic" ? "Topik Bebas" : "Knowledge Base"} />
              <SummaryRow label="Topik" value={values.content_source === "topic" ? values.topic ?? "-" : "-"} />
              <SummaryRow
                label="Knowledge Base"
                value={values.content_source === "knowledge_base" ? (knowledgeBases.find((item) => item.id === values.knowledge_base_id)?.name ?? "-") : "-"}
              />
              <SummaryRow label="Skill Aktif" value={values.question_types.filter((item) => item.count > 0).map((item) => `${item.skill_slug} (${item.count})`).join(", ")} />
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => setStep((current) => Math.max(current - 1, 0))} className="inline-flex h-10 items-center rounded-md border border-line px-4 text-sm dark:border-slate-700 dark:text-slate-100">
              Back
            </button>
            {step < steps.length - 1 ? (
              <button type="button" onClick={() => setStep((current) => Math.min(current + 1, steps.length - 1))} className="inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white">
                Next
              </button>
            ) : (
              <button type="submit" className="inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white">
                Generate
              </button>
            )}
          </div>
        </form>
      </section>
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 md:grid-cols-[140px_1fr]">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-ink dark:text-slate-100">{value || "-"}</span>
    </div>
  );
}
