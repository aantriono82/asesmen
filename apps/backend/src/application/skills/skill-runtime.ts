import type { SkillDefinition } from "@domain/entities/skill";
import { AppError } from "@lib/errors";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export function validateSkillInput(schema: Record<string, unknown>, value: unknown): Record<string, unknown> {
  const errors = validateSchemaNode(schema, value, "input");
  if (errors.length > 0) {
    throw new AppError(`Validasi input gagal: ${errors.join("; ")}`, "SKILL_INPUT_INVALID", 400);
  }

  return value as Record<string, unknown>;
}

export function buildSkillPrompt(skill: SkillDefinition, input: Record<string, unknown>): string {
  const promptParts = [
    `Skill: ${skill.name}`,
    `Kategori: ${skill.category}`,
    `Topik input: ${JSON.stringify(input, null, 2)}`
  ];

  const sourceContext = typeof input.sourceContext === "string" ? input.sourceContext.trim() : "";
  if (sourceContext.length > 0) {
    promptParts.push("Aturan Grounding SourceContext:");
    promptParts.push(
      [
        "- Gunakan sourceContext sebagai sumber fakta utama dan wajib.",
        "- Ambil istilah teknis, nama metode, nama bahan, angka, satuan, rentang nilai, dan parameter langsung dari sourceContext bila tersedia.",
        "- Jangan mengganti istilah spesifik dari sourceContext dengan istilah yang lebih umum bila istilah spesifik itu relevan untuk soal.",
        "- Setiap butir soal dan penjelasan harus mencerminkan fakta atau istilah yang benar-benar ada di sourceContext.",
        "- Jika sourceContext memuat nilai numerik atau rentang, pertahankan nilainya secara presisi.",
        "- Jangan memakai contoh generik dari pengetahuan umum jika sourceContext sudah menyediakan istilah atau fakta yang lebih spesifik."
      ].join("\n")
    );
  }

  if (skill.promptTemplate.trim().length > 0) {
    promptParts.push("Template:");
    promptParts.push(skill.promptTemplate.trim());
  }

  if (skill.sections.workflow.trim().length > 0) {
    promptParts.push("Workflow:");
    promptParts.push(skill.sections.workflow.trim());
  }

  if (skill.sections.examples.trim().length > 0) {
    promptParts.push("Examples:");
    promptParts.push(skill.sections.examples.trim());
  }

  return promptParts.join("\n\n");
}

export function simulateSkillOutput(skill: SkillDefinition, input: Record<string, unknown>, prompt: string): Record<string, unknown> {
  const generatedAt = new Date().toISOString();

  return buildSchemaPlaceholder(skill.outputSchema, input, "output", prompt, generatedAt);
}

function validateSchemaNode(schema: Record<string, unknown>, value: unknown, path: string): string[] {
  const type = typeof schema.type === "string" ? schema.type : undefined;
  const enumValues = Array.isArray(schema.enum) ? schema.enum : null;
  const errors: string[] = [];

  if (enumValues && !enumValues.includes(value as never)) {
    errors.push(`${path} harus salah satu dari ${enumValues.join(", ")}`);
    return errors;
  }

  if (type === "object") {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      errors.push(`${path} harus berupa object`);
      return errors;
    }

    const objectValue = value as Record<string, unknown>;
    const properties = isPlainObject(schema.properties) ? schema.properties : {};
    const required = Array.isArray(schema.required) ? schema.required.filter((item): item is string => typeof item === "string") : [];

    for (const requiredKey of required) {
      if (!(requiredKey in objectValue)) {
        errors.push(`${path}.${requiredKey} wajib diisi`);
      }
    }

    for (const [key, propertySchema] of Object.entries(properties)) {
      if (!(key in objectValue)) {
        continue;
      }

      if (isPlainObject(propertySchema)) {
        errors.push(...validateSchemaNode(propertySchema, objectValue[key], `${path}.${key}`));
      }
    }

    return errors;
  }

  if (type === "array") {
    if (!Array.isArray(value)) {
      errors.push(`${path} harus berupa array`);
      return errors;
    }

    if (typeof schema.minItems === "number" && value.length < schema.minItems) {
      errors.push(`${path} minimal ${schema.minItems} item`);
    }

    if (typeof schema.maxItems === "number" && value.length > schema.maxItems) {
      errors.push(`${path} maksimal ${schema.maxItems} item`);
    }

    const itemSchema = isPlainObject(schema.items) ? schema.items : null;
    if (itemSchema) {
      value.forEach((item, index) => {
        errors.push(...validateSchemaNode(itemSchema, item, `${path}[${index}]`));
      });
    }

    return errors;
  }

  if (type === "string") {
    if (typeof value !== "string") {
      errors.push(`${path} harus berupa string`);
      return errors;
    }

    if (typeof schema.minLength === "number" && value.length < schema.minLength) {
      errors.push(`${path} minimal ${schema.minLength} karakter`);
    }

    if (typeof schema.maxLength === "number" && value.length > schema.maxLength) {
      errors.push(`${path} maksimal ${schema.maxLength} karakter`);
    }

    return errors;
  }

  if (type === "number" || type === "integer") {
    if (typeof value !== "number" || Number.isNaN(value) || (type === "integer" && !Number.isInteger(value))) {
      errors.push(`${path} harus berupa ${type === "integer" ? "bilangan bulat" : "angka"}`);
      return errors;
    }

    if (typeof schema.minimum === "number" && value < schema.minimum) {
      errors.push(`${path} minimal ${schema.minimum}`);
    }

    if (typeof schema.maximum === "number" && value > schema.maximum) {
      errors.push(`${path} maksimal ${schema.maximum}`);
    }

    return errors;
  }

  if (type === "boolean") {
    if (typeof value !== "boolean") {
      errors.push(`${path} harus berupa boolean`);
    }

    return errors;
  }

  if (schema.properties || schema.required) {
    return validateSchemaNode({ ...schema, type: "object" }, value, path);
  }

  return errors;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function toJsonValue(value: unknown): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }

  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, toJsonValue(item)]));
  }

  return String(value);
}

function buildSchemaPlaceholder(
  schema: Record<string, unknown>,
  input: Record<string, unknown>,
  path: string,
  prompt: string,
  generatedAt: string
): Record<string, unknown> {
  const value = buildPlaceholderValue(schema, input, path, prompt, generatedAt);
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {
    value
  };
}

function buildPlaceholderValue(
  schema: Record<string, unknown>,
  input: Record<string, unknown>,
  path: string,
  prompt: string,
  generatedAt: string
): unknown {
  const type = typeof schema.type === "string" ? schema.type : inferSchemaType(schema);
  const fieldName = path.split(".").at(-1) ?? path;
  const enumValues = Array.isArray(schema.enum) ? schema.enum.filter((item): item is string | number | boolean => isPrimitive(item)) : [];

  if (enumValues.length > 0) {
    return enumValues[0];
  }

  if (type === "object") {
    const properties = isPlainObject(schema.properties) ? schema.properties : {};
    const required = Array.isArray(schema.required) ? schema.required.filter((item): item is string => typeof item === "string") : Object.keys(properties);
    const objectValue: Record<string, unknown> = {};

    for (const key of required) {
      const propertySchema = isPlainObject(properties[key]) ? properties[key] : {};
      objectValue[key] = buildPlaceholderValue(propertySchema, input, `${path}.${key}`, prompt, generatedAt);
    }

    return objectValue;
  }

  if (type === "array") {
    const itemSchema = isPlainObject(schema.items) ? schema.items : {};
    const requestedLength = readRequestedArrayLength(input, fieldName);
    const length =
      fieldName === "questions" && requestedLength > 0
        ? requestedLength
        : typeof schema.minItems === "number" && schema.minItems > 0
          ? Math.min(schema.minItems, 2)
          : 1;
    return Array.from({ length }, (_, index) => buildPlaceholderValue(itemSchema, input, `${path}[${index}]`, prompt, generatedAt));
  }

  if (type === "integer") {
    if (fieldName === "max_score") {
      return 100;
    }

    if (typeof schema.minimum === "number") {
      return Math.max(1, Math.trunc(schema.minimum));
    }

    return 1;
  }

  if (type === "number") {
    if (typeof schema.minimum === "number") {
      return schema.minimum;
    }

    return 1;
  }

  if (type === "boolean") {
    return true;
  }

  if (type === "string") {
    return buildPlaceholderString(fieldName, input, prompt, generatedAt);
  }

  return buildPlaceholderString(fieldName, input, prompt, generatedAt);
}

function buildPlaceholderString(
  fieldName: string,
  input: Record<string, unknown>,
  prompt: string,
  generatedAt: string
): string {
  const topic = typeof input.topic === "string" ? input.topic : "materi";
  const subject = typeof input.subject === "string" ? input.subject : "umum";
  const gradeLevel =
    typeof input.grade_level === "string"
      ? input.grade_level
      : typeof input.gradeLevel === "string"
        ? input.gradeLevel
        : "umum";

  switch (fieldName) {
    case "question":
      return `Pertanyaan contoh tentang ${topic} untuk ${gradeLevel}.`;
    case "statement":
      return `Pernyataan contoh tentang ${topic}.`;
    case "explanation":
      return `Penjelasan contoh untuk topik ${topic}.`;
    case "sample_answer":
      return `Jawaban contoh yang membahas ${topic} pada mata pelajaran ${subject}.`;
    case "correct_answer":
      return "A";
    case "competency":
      return `Kompetensi ${topic}`;
    case "indicator":
      return `Indikator terukur untuk ${topic}`;
    case "material":
      return `Materi ${topic}`;
    case "question_form":
      return "esai";
    case "difficulty":
      return typeof input.difficulty === "string" ? input.difficulty : "medium";
    case "name":
      return "Kriteria Penilaian";
    case "description":
      return `Deskripsi contoh untuk ${topic}.`;
    case "message":
      return "Phase 2 placeholder execution.";
    case "generatedAt":
      return generatedAt;
    case "prompt":
      return prompt;
    default:
      return `${fieldName} contoh ${topic}`;
  }
}

function readRequestedArrayLength(input: Record<string, unknown>, fieldName: string): number {
  const candidates = fieldName === "questions" ? ["count", "questionCount", "question_count", "pairCount"] : [fieldName];
  for (const key of candidates) {
    const value = input[key];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return Math.trunc(value);
    }
  }

  return 0;
}

function inferSchemaType(schema: Record<string, unknown>): string | undefined {
  if (schema.properties || schema.required) {
    return "object";
  }

  if (schema.items) {
    return "array";
  }

  return undefined;
}

function isPrimitive(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}
