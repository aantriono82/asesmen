import type { AssessmentDetail } from "@infra/repositories/drizzle-assessment.repository";

export function renderAnswerSheetHtml(assessment: AssessmentDetail): string {
  return `<!doctype html><html><head><meta charset="utf-8" /><style>${styles()}</style></head><body>
  <h1>Lembar Jawaban</h1>
  <p>${escapeHtml(assessment.title)}</p>
  ${assessment.questions
    .map(
      (question) =>
        `<div class="row"><span>${question.questionNumber}.</span><div class="line">${question.type === "essay" ? "<div class='essay'></div>" : "A  B  C  D"}</div></div>`
    )
    .join("")}
  </body></html>`;
}

const styles = () =>
  `@page { size: A4; margin: 2cm; } body { font-family: Arial, sans-serif; font-size: 11pt; } .row { display:flex; gap:12px; margin: 10px 0; align-items:flex-start; } .line { flex:1; border-bottom:1px solid #94a3b8; min-height:22px; } .essay { min-height:56px; }`;

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
