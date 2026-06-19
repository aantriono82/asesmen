import ExcelJS from "exceljs";
import type { ExportArtifact, ExportContext, ExportDocumentType } from "./export.types";

export class ExcelExporter {
  public async export(context: ExportContext, type: ExportDocumentType): Promise<ExportArtifact> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Export");

    if (type === "question_bank" || type === "question_paper") {
      const assessment = context.assessment;
      worksheet.columns = [
        { header: "No", key: "no" },
        { header: "Tipe", key: "type" },
        { header: "Pertanyaan", key: "question" },
        { header: "Opsi A", key: "a" },
        { header: "Opsi B", key: "b" },
        { header: "Opsi C", key: "c" },
        { header: "Opsi D", key: "d" },
        { header: "Kunci", key: "answer" },
        { header: "Penjelasan", key: "explanation" },
        { header: "Kesulitan", key: "difficulty" },
        { header: "Level Kognitif", key: "cognitive" }
      ];
      for (const question of assessment?.questions ?? []) {
        const options = question.options as Record<string, unknown> | null;
        worksheet.addRow({
          no: question.questionNumber,
          type: question.type,
          question: question.content,
          a: options?.A ?? options?.a ?? "",
          b: options?.B ?? options?.b ?? "",
          c: options?.C ?? options?.c ?? "",
          d: options?.D ?? options?.d ?? "",
          answer: question.correctAnswer ?? "",
          explanation: question.explanation ?? "",
          difficulty: question.difficulty ?? "",
          cognitive: question.cognitiveLevel ?? ""
        });
      }
    } else if (type === "kisi_kisi") {
      const curriculum = context.curriculum;
      worksheet.columns = [
        { header: "KD", key: "kd" },
        { header: "Indikator", key: "indikator" },
        { header: "Materi", key: "materi" },
        { header: "Level Kognitif", key: "level" },
        { header: "Tipe Soal", key: "type" },
        { header: "No Soal", key: "number" },
        { header: "Bobot", key: "weight" }
      ];
      const rows = Array.isArray((curriculum?.content as Record<string, unknown> | undefined)?.items)
        ? (((curriculum?.content as Record<string, unknown>).items as unknown[]) ?? [])
        : [];
      for (const row of rows) {
        const item = row as Record<string, unknown>;
        worksheet.addRow({
          kd: String(item.kd ?? "-"),
          indikator: String(item.indikator ?? "-"),
          materi: String(item.materi ?? "-"),
          level: String(item.level_kognitif ?? "-"),
          type: String(item.tipe_soal ?? "-"),
          number: String(item.no_soal ?? "-"),
          weight: String(item.bobot ?? "-")
        });
      }
    } else {
      const assessment = context.assessment;
      worksheet.columns = [
        { header: "Kategori", key: "category" },
        { header: "Nilai", key: "value" }
      ];
      worksheet.addRows([
        { category: "Total Soal", value: assessment?.questions.length ?? 0 },
        { category: "Pilihan Ganda", value: assessment?.questions.filter((q) => q.type === "multiple_choice").length ?? 0 },
        { category: "Uraian", value: assessment?.questions.filter((q) => q.type === "essay").length ?? 0 }
      ]);
    }

    styleWorksheet(worksheet);
    return {
      fileName: `${type}.xlsx`,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      extension: "xlsx",
      content: Buffer.from(await workbook.xlsx.writeBuffer())
    };
  }
}

function styleWorksheet(worksheet: ExcelJS.Worksheet): void {
  const header = worksheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1D4ED8" } };

  for (const column of worksheet.columns) {
    let maxLength = 16;
    column.eachCell?.({ includeEmpty: true }, (cell: ExcelJS.Cell) => {
      maxLength = Math.max(maxLength, String(cell.value ?? "").length + 2);
    });
    column.width = Math.min(maxLength, 48);
  }
}
