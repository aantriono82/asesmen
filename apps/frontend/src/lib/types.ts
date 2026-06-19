export type UserRole = "admin" | "teacher";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export interface Skill {
  name: string;
  slug: string;
  version: string;
  category: string;
  description: string;
  author: string;
  tags: string[];
  preferredModel: string | null;
  isActive: boolean;
  filePath: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  promptTemplate: string;
  sections: {
    description: string;
    inputs: string;
    outputs: string;
    workflow: string;
    examples: string;
    prompt: string;
  };
}

export interface SkillDiscoverySkill extends Skill {
  relevance: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  code: string;
}

export interface AuthResult {
  user: User;
  tokens: TokenPair;
}

export interface PaginatedData<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: "skill_completed" | "skill_failed" | "document_processed" | "system";
  title: string;
  message: string | null;
  isRead: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SkillExecution {
  id: string;
  userId: string;
  skillId: string;
  skillSlug: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  status: "pending" | "running" | "completed" | "failed";
  durationMs: number | null;
  error: string | null;
  createdAt: string;
}

export type AssessmentStatus = "draft" | "published" | "archived" | "failed";
export type QuestionType = "multiple_choice" | "multiple_choice_complex" | "essay" | "true_false" | "matching" | "fill_blank";

export interface AssessmentQuestion {
  id: string;
  assessmentId: string;
  questionNumber: number;
  type: QuestionType;
  content: string;
  options: Record<string, unknown> | null;
  correctAnswer: string | null;
  explanation: string | null;
  difficulty: "mudah" | "sedang" | "sulit" | null;
  cognitiveLevel: string | null;
  score: number;
  tags: string[];
  source: "ai_generated" | "manual" | "bank";
  generatedBySkill: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Assessment {
  id: string;
  userId: string;
  title: string;
  subject: string | null;
  gradeLevel: string | null;
  assessmentType: string | null;
  knowledgeBaseId: string | null;
  durationMinutes: number | null;
  instructions: string | null;
  config: Record<string, unknown>;
  status: AssessmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentDetail extends Assessment {
  questions: AssessmentQuestion[];
}

export interface QuestionBankEntry {
  id: string;
  userId: string;
  questionId: string;
  subject: string | null;
  gradeLevel: string | null;
  tags: string[];
  usageCount: number;
  createdAt: string;
  question: AssessmentQuestion | null;
}

export interface Curriculum {
  id: string;
  userId: string;
  title: string;
  type: "silabus" | "rpp" | "prota" | "prosem" | "kisi_kisi";
  subject: string | null;
  gradeLevel: string | null;
  semester: string | null;
  academicYear: string | null;
  content: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedDocument {
  id: string;
  userId: string;
  assessmentId: string | null;
  type: "question_paper" | "answer_key" | "answer_sheet" | "scoring_rubric";
  title: string | null;
  content: Record<string, unknown>;
  createdAt: string;
}

export interface WorkflowStep {
  skillSlug: string;
  inputMapping: Record<string, string>;
  outputKey: string;
}

export interface Workflow {
  id: string;
  userId: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  status: "draft" | "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  userId: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  status: "pending" | "running" | "completed" | "failed";
  currentStep: number;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface AIProviderStatus {
  name: "openai" | "anthropic" | "google" | "deepseek";
  model: string;
  available: boolean;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  provider: "openai" | "anthropic" | "google" | "deepseek";
  model: string;
  systemPrompt: string;
  knowledgeBaseId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCallId: string | null;
  toolName: string | null;
  toolInput: Record<string, unknown> | null;
  toolOutput: Record<string, unknown> | null;
  tokensIn: number | null;
  tokensOut: number | null;
  createdAt: string;
}

export interface ChatSessionDetail {
  session: ChatSession;
  messages: ChatMessage[];
}

export interface TokenUsageSummary {
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

export interface TokenUsageRecord {
  id: string;
  userId: string;
  sessionId: string | null;
  provider: "openai" | "anthropic" | "google" | "deepseek";
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  createdAt: string;
}

export type ChatStreamEvent =
  | { type: "text"; delta: string }
  | { type: "retrieval"; chunks_found: number }
  | { type: "tool_use"; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; output: Record<string, unknown> }
  | { type: "done"; tokens: { in: number; out: number } }
  | { type: "error"; message: string };

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  pageNumber: number | null;
  chunkIndex: number;
  tokenCount: number;
  createdAt: string;
}

export interface UploadedDocument {
  id: string;
  userId: string;
  title: string;
  filePath: string;
  fileUrl: string | null;
  fileType: string;
  fileSize: number;
  status: "pending" | "processing" | "completed" | "failed";
  chunkCount: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeBase {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeBaseDetail extends Omit<KnowledgeBase, "documentCount"> {
  documentCount: number;
  documents: UploadedDocument[];
}
