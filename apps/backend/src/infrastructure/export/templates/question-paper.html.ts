import type { AssessmentDetail } from "@infra/repositories/drizzle-assessment.repository";

export function renderQuestionPaperHtml(assessment: AssessmentDetail, schoolName?: string, schoolHeader?: string): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>${sharedStyles()}</style>
</head>
<body>
  <header>
    <h1>${escapeHtml(schoolName ?? "ATIGA Assessment AI")}</h1>
    <p>${escapeHtml(schoolHeader ?? `${assessment.subject ?? "Mata Pelajaran"} - ${assessment.gradeLevel ?? "-"}`)}</p>
    <h2>${escapeHtml(assessment.title)}</h2>
    <p>Durasi: ${assessment.durationMinutes ?? "-"} menit</p>
  </header>
  <section>
    <h3>Petunjuk</h3>
    <p>${escapeHtml(assessment.instructions ?? "Kerjakan seluruh soal dengan cermat.")}</p>
  </section>
  <section>
    ${assessment.questions
      .map(
        (question) => `<article class="question">
        <p><strong>${question.questionNumber}.</strong> ${escapeHtml(question.content)}</p>
        ${
          question.options && typeof question.options === "object"
            ? `<ol type="A">${Object.values(question.options)
                .map((option) => `<li>${escapeHtml(String(option))}</li>`)
                .join("")}</ol>`
            : ""
        }
      </article>`
      )
      .join("")}
  </section>
</body>
</html>`;
}

function sharedStyles(): string {
  return `
  @page { size: A4; margin: 2cm; }
  body { font-family: Arial, sans-serif; color: #111827; font-size: 12pt; line-height: 1.5; }
  h1, h2, h3 { margin: 0 0 8px; }
  header { text-align: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 16px; margin-bottom: 20px; }
  .question { break-inside: avoid; margin-bottom: 16px; }
  ol { margin-top: 8px; }
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
