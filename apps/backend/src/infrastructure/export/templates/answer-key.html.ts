import type { AssessmentDetail } from "@infra/repositories/drizzle-assessment.repository";

export function renderAnswerKeyHtml(assessment: AssessmentDetail): string {
  return `<!doctype html><html><head><meta charset="utf-8" /><style>${styles()}</style></head><body>
  <h1>Kunci Jawaban</h1>
  <table><thead><tr><th>No</th><th>Kunci</th><th>Bobot</th><th>Penjelasan</th></tr></thead><tbody>
  ${assessment.questions
    .map(
      (question) =>
        `<tr><td>${question.questionNumber}</td><td>${escapeHtml(question.correctAnswer ?? "-")}</td><td>${question.score}</td><td>${escapeHtml(question.explanation ?? "-")}</td></tr>`
    )
    .join("")}
  </tbody></table></body></html>`;
}

const styles = () =>
  `@page { size: A4; margin: 2cm; } body { font-family: Arial, sans-serif; font-size: 11pt; color: #111827; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; } th { background: #e2e8f0; }`;

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
