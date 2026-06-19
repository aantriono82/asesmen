import type { Curriculum } from "@infra/database/schema";

export function renderRppHtml(curriculum: Curriculum): string {
  const content = (curriculum.content ?? {}) as Record<string, unknown>;
  const rows = [
    ["Satuan Pendidikan", String(content.school_name ?? "-")],
    ["Mata Pelajaran", String(curriculum.subject ?? "-")],
    ["Kelas/Semester", `${curriculum.gradeLevel ?? "-"} / ${curriculum.semester ?? "-"}`],
    ["Tahun Ajaran", String(curriculum.academicYear ?? "-")],
    ["Tujuan Pembelajaran", String(content.learning_objectives ?? "-")],
    ["Langkah Kegiatan", Array.isArray(content.learning_steps) ? content.learning_steps.join(", ") : String(content.learning_steps ?? "-")],
    ["Asesmen", String(content.assessment ?? "-")]
  ];
  return `<!doctype html><html><head><meta charset="utf-8" /><style>${styles()}</style></head><body>
  <h1>${curriculum.type.toUpperCase()}</h1>
  <table>${rows.map(([label, value]) => `<tr><th>${escapeHtml(label ?? "-")}</th><td>${escapeHtml(value ?? "-")}</td></tr>`).join("")}</table>
  </body></html>`;
}

const styles = () =>
  `@page { size: A4; margin: 2cm; } body { font-family: Arial, sans-serif; font-size: 11pt; } table { width:100%; border-collapse:collapse; } th, td { border:1px solid #cbd5e1; padding:8px; text-align:left; vertical-align:top; } th { width:28%; background:#e2e8f0; }`;

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
