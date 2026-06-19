import type { AssessmentDetail } from "@infra/repositories/drizzle-assessment.repository";

export function renderRubricHtml(assessment: AssessmentDetail): string {
  const essays = assessment.questions.filter((question) => question.type === "essay");
  return `<!doctype html><html><head><meta charset="utf-8" /><style>${styles()}</style></head><body>
  <h1>Rubrik Penilaian</h1>
  <table><thead><tr><th>No</th><th>Indikator</th><th>Bobot</th><th>Kriteria</th></tr></thead><tbody>
  ${essays
    .map(
      (question) =>
        `<tr><td>${question.questionNumber}</td><td>${escapeHtml(question.content)}</td><td>${question.score}</td><td>${escapeHtml(question.explanation ?? "Jawaban lengkap, relevan, dan runtut.")}</td></tr>`
    )
    .join("")}
  </tbody></table></body></html>`;
}

const styles = () =>
  `@page { size: A4; margin: 2cm; } body { font-family: Arial, sans-serif; font-size: 11pt; } table { width:100%; border-collapse:collapse; } th, td { border:1px solid #cbd5e1; padding:8px; vertical-align:top; } th { background:#e2e8f0; }`;

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
