import { z } from "zod";

export const curriculumTypeSchema = z.enum(["silabus", "rpp", "prota", "prosem", "kisi_kisi"]);

export const generateCurriculumRequestSchema = z.object({
  type: curriculumTypeSchema,
  subject: z.string().trim().min(2).max(120),
  grade_level: z.string().trim().min(1).max(120),
  semester: z.string().trim().max(120).optional(),
  academic_year: z.string().trim().max(120).optional(),
  title: z.string().trim().min(3).max(255).optional(),
  config: z.record(z.unknown())
});

export const silabusInputSchema = z.object({
  semester: z.string().trim().min(1),
  kompetensi_dasar: z.array(z.string().trim().min(1)).min(1),
  alokasi_waktu: z.string().trim().min(1)
});

export const rppInputSchema = z.object({
  kd: z.string().trim().min(1),
  materi: z.string().trim().min(1),
  alokasi_waktu: z.string().trim().min(1),
  metode_pembelajaran: z.string().trim().min(1)
});

export const protaProsemInputSchema = z.object({
  academic_year: z.string().trim().min(1),
  kd_list: z.array(z.string().trim().min(1)).min(1)
});

export const kisiKisiInputSchema = z.object({
  assessment_id: z.string().uuid().optional(),
  kd: z.array(z.string().trim().min(1)).optional(),
  indikator: z.array(z.string().trim().min(1)).optional()
});
