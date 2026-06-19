import {
  AlignmentType,
  Document,
  Footer,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType
} from "docx";
import type { ExportArtifact, ExportContext, ExportDocumentType } from "./export.types";

export class DocxExporter {
  public async export(context: ExportContext, type: ExportDocumentType, meta?: { schoolName?: string; schoolHeader?: string }): Promise<ExportArtifact> {
    const sections = type === "question_paper"
      ? buildQuestionPaperSections(context, meta)
      : type === "answer_key"
        ? buildAnswerKeySections(context)
        : type === "scoring_rubric"
          ? buildRubricSections(context)
          : buildCurriculumSections(context);

    const document = new Document({
      sections: [
        {
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun("Halaman "), new TextRun({ children: [PageNumber.CURRENT] })]
                })
              ]
            })
          },
          children: sections
        }
      ]
    });

    return {
      fileName: `${type}.docx`,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      extension: "docx",
      content: await Packer.toBuffer(document)
    };
  }
}

function buildQuestionPaperSections(context: ExportContext, meta?: { schoolName?: string; schoolHeader?: string }) {
  const assessment = context.assessment;
  if (!assessment) {
    return [new Paragraph("Assessment tidak tersedia")];
  }

  const paragraphs = [
    new Paragraph({ text: meta?.schoolName ?? "ATIGA Assessment AI", heading: "Heading1", alignment: AlignmentType.CENTER }),
    new Paragraph({ text: meta?.schoolHeader ?? `${assessment.subject ?? "-"} - ${assessment.gradeLevel ?? "-"}`, alignment: AlignmentType.CENTER }),
    new Paragraph({ text: assessment.title, heading: "Heading2", alignment: AlignmentType.CENTER }),
    new Paragraph({ text: `Petunjuk: ${assessment.instructions ?? "Kerjakan seluruh soal dengan cermat."}` }),
    ...assessment.questions.flatMap((question) => [
      new Paragraph({ text: `${question.questionNumber}. ${question.content}` }),
      ...(question.options && typeof question.options === "object"
        ? Object.entries(question.options).map(([key, value]) => new Paragraph({ text: `${key}. ${String(value)}` }))
        : [])
    ])
  ];

  return paragraphs;
}

function buildAnswerKeySections(context: ExportContext) {
  const assessment = context.assessment;
  if (!assessment) {
    return [new Paragraph("Kunci jawaban tidak tersedia")];
  }

  return [
    new Paragraph({ text: "Kunci Jawaban", heading: "Heading1" }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: ["No", "Kunci", "Bobot", "Penjelasan"].map(
            (value) => new TableCell({ children: [new Paragraph({ children: [new TextRun(value)] })] })
          )
        }),
        ...assessment.questions.map(
          (question) =>
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(String(question.questionNumber))] }),
                new TableCell({ children: [new Paragraph(question.correctAnswer ?? "-")] }),
                new TableCell({ children: [new Paragraph(String(question.score))] }),
                new TableCell({ children: [new Paragraph(question.explanation ?? "-")] })
              ]
            })
        )
      ]
    })
  ];
}

function buildRubricSections(context: ExportContext) {
  const assessment = context.assessment;
  if (!assessment) {
    return [new Paragraph("Rubrik tidak tersedia")];
  }

  return [
    new Paragraph({ text: "Rubrik Penilaian", heading: "Heading1" }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: ["No", "Indikator", "Bobot", "Kriteria"].map(
            (value) => new TableCell({ children: [new Paragraph({ children: [new TextRun(value)] })] })
          )
        }),
        ...assessment.questions
          .filter((question) => question.type === "essay")
          .map(
            (question) =>
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(String(question.questionNumber))] }),
                  new TableCell({ children: [new Paragraph(question.content)] }),
                  new TableCell({ children: [new Paragraph(String(question.score))] }),
                  new TableCell({ children: [new Paragraph(question.explanation ?? "Jawaban dinilai berdasar kelengkapan dan ketepatan.")] })
                ]
              })
          )
      ]
    })
  ];
}

function buildCurriculumSections(context: ExportContext) {
  const curriculum = context.curriculum;
  if (!curriculum) {
    return [new Paragraph("Dokumen kurikulum tidak tersedia")];
  }

  const content = curriculum.content as Record<string, unknown>;
  return [
    new Paragraph({ text: curriculum.title, heading: "Heading1" }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: Object.entries(content).map(
        ([key, value]) =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(key)] }),
              new TableCell({
                children: [new Paragraph(Array.isArray(value) ? value.map((item) => String(item)).join(", ") : String(value ?? "-"))]
              })
            ]
          })
      )
    })
  ];
}
