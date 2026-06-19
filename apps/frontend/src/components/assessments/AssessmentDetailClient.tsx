"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { apiFetch } from "@lib/api";
import { toast } from "@lib/toast";
import type { AssessmentDetail, AssessmentQuestion, GeneratedDocument, PaginatedData, QuestionBankEntry } from "@lib/types";
import { SkeletonCard } from "@components/ui/SkeletonCard";
import { ExportModal } from "@components/export/ExportModal";

export function AssessmentDetailClient({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(false);
  const [showBank, setShowBank] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [bankItems, setBankItems] = useState<QuestionBankEntry[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);

  async function load(): Promise<void> {
    setLoading(true);
    try {
      const [detailResponse, documentResponse] = await Promise.all([
        apiFetch<AssessmentDetail>(`/assessments/${assessmentId}`),
        apiFetch<PaginatedData<GeneratedDocument>>("/documents/generated")
      ]);
      setAssessment(detailResponse.data);
      setDocuments((documentResponse.data?.items ?? []).filter((item) => item.assessmentId === assessmentId));
    } catch (caught: unknown) {
      toast.error(caught instanceof Error ? caught.message : "Gagal memuat assessment");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [assessmentId]);

  const sortedQuestions = useMemo(
    () => [...(assessment?.questions ?? [])].sort((a, b) => a.questionNumber - b.questionNumber),
    [assessment?.questions]
  );

  async function saveQuestion(question: AssessmentQuestion) {
    try {
      await apiFetch(`/assessments/${assessmentId}/questions/${question.id}`, {
        method: "PUT",
        body: JSON.stringify({
          type: question.type,
          content: question.content,
          options: question.options,
          correct_answer: question.correctAnswer ?? undefined,
          explanation: question.explanation ?? undefined,
          difficulty: question.difficulty ?? undefined,
          cognitive_level: question.cognitiveLevel ?? undefined,
          score: question.score,
          tags: question.tags
        })
      });
      toast.success("Soal diperbarui");
      await load();
    } catch (caught: unknown) {
      toast.error(caught instanceof Error ? caught.message : "Gagal menyimpan soal");
    }
  }

  async function addManualQuestion() {
    try {
      await apiFetch(`/assessments/${assessmentId}/questions`, {
        method: "POST",
        body: JSON.stringify({
          type: "essay",
          content: "Soal manual baru",
          score: 1,
          source: "manual"
        })
      });
      toast.success("Soal manual ditambahkan");
      await load();
    } catch (caught: unknown) {
      toast.error(caught instanceof Error ? caught.message : "Gagal menambah soal");
    }
  }

  async function deleteQuestion(questionId: string) {
    try {
      await apiFetch(`/assessments/${assessmentId}/questions/${questionId}`, { method: "DELETE" });
      toast.success("Soal dihapus");
      await load();
    } catch (caught: unknown) {
      toast.error(caught instanceof Error ? caught.message : "Gagal menghapus soal");
    }
  }

  async function generateDocuments() {
    try {
      await apiFetch("/documents/generate", {
        method: "POST",
        body: JSON.stringify({
          assessment_id: assessmentId,
          types: ["question_paper", "answer_key", "answer_sheet", "scoring_rubric"]
        })
      });
      toast.success("Dokumen berhasil disusun");
      await load();
    } catch (caught: unknown) {
      toast.error(caught instanceof Error ? caught.message : "Gagal menyusun dokumen");
    }
  }

  async function openBankPicker() {
    try {
      const response = await apiFetch<PaginatedData<QuestionBankEntry>>("/question-bank");
      setBankItems(response.data?.items ?? []);
      setShowBank(true);
    } catch (caught: unknown) {
      toast.error(caught instanceof Error ? caught.message : "Gagal memuat bank soal");
    }
  }

  async function addFromBank(id: string) {
    try {
      await apiFetch(`/assessments/${assessmentId}/questions/from-bank`, {
        method: "POST",
        body: JSON.stringify({ ids: [id] })
      });
      toast.success("Soal bank ditambahkan");
      setShowBank(false);
      await load();
    } catch (caught: unknown) {
      toast.error(caught instanceof Error ? caught.message : "Gagal menambah dari bank");
    }
  }

  async function persistOrder(questionsToOrder: AssessmentQuestion[]) {
    try {
      await apiFetch(`/assessments/${assessmentId}/questions/reorder`, {
        method: "POST",
        body: JSON.stringify(questionsToOrder.map((question, index) => ({ id: question.id, question_number: index + 1 })))
      });
      toast.success("Urutan soal diperbarui");
      await load();
    } catch (caught: unknown) {
      toast.error(caught instanceof Error ? caught.message : "Gagal menyimpan urutan");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-field px-6 py-8 dark:bg-slate-950">
        <section className="mx-auto max-w-6xl">
          <SkeletonCard />
        </section>
      </main>
    );
  }

  if (!assessment) {
    return <main className="px-6 py-8 text-sm">Assessment tidak ditemukan.</main>;
  }

  return (
    <main className="min-h-screen bg-field px-6 py-8 dark:bg-slate-950">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand dark:text-teal-400">Assessment Detail</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink dark:text-slate-100">{assessment.title}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {assessment.subject} · {assessment.gradeLevel} · {assessment.assessmentType}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPreview((value) => !value)} className="btn-secondary">
              {preview ? "Edit Mode" : "Preview Mode"}
            </button>
            <button type="button" onClick={() => setShowExport(true)} className="btn-secondary">
              Export
            </button>
            <button type="button" onClick={generateDocuments} className="btn-primary">
              Generate Dokumen
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-line px-2 py-1 text-xs font-medium capitalize dark:border-slate-700 dark:text-slate-100">{assessment.status}</span>
          <button type="button" onClick={addManualQuestion} className="btn-secondary">
            <Plus className="h-4 w-4" />
            Tambah Soal Manual
          </button>
          <button type="button" onClick={openBankPicker} className="btn-secondary">
            Tambah dari Bank
          </button>
          <button type="button" onClick={() => router.refresh()} className="btn-secondary">
            Refresh
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          {sortedQuestions.map((question, index) => (
            <article
              key={question.id}
              draggable
              onDragStart={() => setDragId(question.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (!dragId || dragId === question.id || !assessment) {
                  return;
                }
                const items = [...sortedQuestions];
                const from = items.findIndex((item) => item.id === dragId);
                const to = items.findIndex((item) => item.id === question.id);
                const [moved] = items.splice(from, 1);
                if (!moved) {
                  return;
                }
                items.splice(to, 0, moved);
                void persistOrder(items);
                setDragId(null);
              }}
              className="grid gap-3 rounded-md border border-line bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-semibold text-ink dark:text-slate-100">Soal {index + 1}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{question.type}</p>
                  </div>
                </div>
                <button type="button" onClick={() => void deleteQuestion(question.id)} className="rounded-md border border-line p-2 text-slate-500 dark:border-slate-700 dark:text-slate-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {preview ? (
                <div className="grid gap-3">
                  <p className="text-base text-ink dark:text-slate-100">{question.content}</p>
                  {question.options ? <pre className="overflow-x-auto rounded-md bg-slate-50 p-3 text-xs dark:bg-slate-950">{JSON.stringify(question.options, null, 2)}</pre> : null}
                </div>
              ) : (
                <QuestionEditor question={question} onChange={(next) => setAssessment((current) => current ? { ...current, questions: current.questions.map((item) => item.id === next.id ? next : item) } : current)} onSave={saveQuestion} />
              )}
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-3">
          <h2 className="text-lg font-semibold text-ink dark:text-slate-100">Dokumen Tersusun</h2>
          {documents.map((document) => (
            <div key={document.id} className="rounded-md border border-line bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="font-medium text-ink dark:text-slate-100">{document.title}</p>
              <pre className="mt-2 overflow-x-auto rounded-md bg-slate-50 p-3 text-xs dark:bg-slate-950">{JSON.stringify(document.content, null, 2)}</pre>
            </div>
          ))}
        </div>

        {showBank ? (
          <div className="fixed inset-0 z-40 bg-slate-950/60 p-6">
            <div className="mx-auto max-w-3xl rounded-md border border-line bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-ink dark:text-slate-100">Pilih Soal dari Bank</h2>
                <button type="button" onClick={() => setShowBank(false)} className="btn-secondary">
                  Tutup
                </button>
              </div>
              <div className="mt-4 grid gap-3">
                {bankItems.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-line p-4 dark:border-slate-700">
                    <div>
                      <p className="text-sm font-medium text-ink dark:text-slate-100">{item.question?.content}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Dipakai {item.usageCount} kali</p>
                    </div>
                    <button type="button" onClick={() => void addFromBank(item.id)} className="btn-primary">
                      Tambahkan
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        {showExport ? <ExportModal assessmentId={assessmentId} onClose={() => setShowExport(false)} /> : null}
      </section>
    </main>
  );
}

function QuestionEditor({
  question,
  onChange,
  onSave
}: {
  question: AssessmentQuestion;
  onChange: (question: AssessmentQuestion) => void;
  onSave: (question: AssessmentQuestion) => Promise<void>;
}) {
  return (
    <div className="grid gap-3">
      <textarea value={question.content} onChange={(event) => onChange({ ...question, content: event.target.value })} className="input-base min-h-28" />
      <textarea value={question.explanation ?? ""} onChange={(event) => onChange({ ...question, explanation: event.target.value })} className="input-base min-h-20" placeholder="Penjelasan" />
      <div className="flex justify-end">
        <button type="button" onClick={() => void onSave(question)} className="btn-primary">
          <Save className="h-4 w-4" />
          Simpan
        </button>
      </div>
    </div>
  );
}
