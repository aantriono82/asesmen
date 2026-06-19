import type { AssessmentDetail } from "@infra/repositories/drizzle-assessment.repository";
import type { Curriculum, Question } from "@infra/database/schema";

export type ExportFormat = "docx" | "pdf" | "excel";
export type ExportDocumentType =
  | "question_paper"
  | "answer_key"
  | "answer_sheet"
  | "scoring_rubric"
  | "rpp"
  | "silabus"
  | "kisi_kisi"
  | "question_bank"
  | "assessment_summary";

export interface ExportRequestPayload {
  assessmentId?: string;
  curriculumId?: string;
  types: ExportDocumentType[];
  format: ExportFormat;
  schoolName?: string;
  schoolHeader?: string;
}

export interface ExportContext {
  assessment?: AssessmentDetail | null;
  curriculum?: Curriculum | null;
  questionBank?: Question[];
}

export interface ExportArtifact {
  fileName: string;
  mimeType: string;
  extension: "docx" | "pdf" | "xlsx";
  content: Buffer;
}
