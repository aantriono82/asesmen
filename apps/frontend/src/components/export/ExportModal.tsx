"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText, LoaderCircle } from "lucide-react";
import { env } from "@lib/env";
import { getAccessToken } from "@lib/auth";
import { toast } from "@lib/toast";

const documentOptions = [
  { value: "question_paper", label: "Naskah Soal" },
  { value: "answer_key", label: "Kunci Jawaban" },
  { value: "answer_sheet", label: "Lembar Jawaban" },
  { value: "scoring_rubric", label: "Rubrik" }
] as const;

type ExportFormat = "docx" | "pdf" | "excel";
type ExportType = (typeof documentOptions)[number]["value"];

export function ExportModal({ assessmentId, onClose }: { assessmentId: string; onClose: () => void }) {
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [selectedTypes, setSelectedTypes] = useState<ExportType[]>(["question_paper"]);
  const [loading, setLoading] = useState(false);

  const endpoint = useMemo(() => `/api/export/${format === "excel" ? "excel" : format}`, [format]);

  async function handleDownload(): Promise<void> {
    setLoading(true);
    try {
      const token = getAccessToken();
      const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          assessmentId,
          format,
          types: selectedTypes
        })
      });
      const payload = (await response.json()) as {
        message: string;
        data: Array<{ token: string; fileName: string }>;
      };
      if (!response.ok) {
        throw new Error(payload.message);
      }

      for (const item of payload.data ?? []) {
        const downloadResponse = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/export/download/${item.token}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!downloadResponse.ok) {
          throw new Error(`Gagal mengunduh ${item.fileName}`);
        }
        const blob = await downloadResponse.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = item.fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      }

      toast.success("Export selesai");
      onClose();
    } catch (caught: unknown) {
      toast.error(caught instanceof Error ? caught.message : "Gagal export dokumen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 p-6">
      <div className="mx-auto max-w-lg rounded-md border border-line bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand dark:text-teal-400">Export</p>
            <h2 className="mt-1 text-xl font-semibold text-ink dark:text-slate-100">Dokumen Assessment</h2>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary">
            Tutup
          </button>
        </div>

        <div className="mt-6 grid gap-5">
          <div>
            <p className="text-sm font-semibold text-ink dark:text-slate-100">Tipe Dokumen</p>
            <div className="mt-3 grid gap-2">
              {documentOptions.map((option) => (
                <label key={option.value} className="flex items-center gap-3 rounded-md border border-line px-3 py-2 text-sm dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(option.value)}
                    onChange={(event) =>
                      setSelectedTypes((current) =>
                        event.target.checked ? [...current, option.value] : current.filter((item) => item !== option.value)
                      )
                    }
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-ink dark:text-slate-100">Format</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["docx", "pdf", "excel"] as ExportFormat[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFormat(item)}
                  className={format === item ? "btn-primary" : "btn-secondary"}
                >
                  {item === "excel" ? <FileSpreadsheet className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  {item.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" disabled={loading || selectedTypes.length === 0} onClick={() => void handleDownload()} className="btn-primary disabled:opacity-60">
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {loading ? "Membuat..." : "Download"}
          </button>
        </div>
      </div>
    </div>
  );
}
