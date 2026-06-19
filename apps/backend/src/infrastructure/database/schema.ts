import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";

export const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value) {
    return String(value)
      .slice(1, -1)
      .split(",")
      .filter(Boolean)
      .map(Number);
  }
});

export const userRoleEnum = pgEnum("user_role", ["admin", "teacher"]);
export const executionStatusEnum = pgEnum("execution_status", ["pending", "running", "completed", "failed"]);
export const documentStatusEnum = pgEnum("document_status", ["pending", "processing", "completed", "failed"]);
export const auditActionEnum = pgEnum("audit_action", ["LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE", "EXECUTE"]);
export const workflowStatusEnum = pgEnum("workflow_status", ["draft", "active", "archived"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "skill_completed",
  "skill_failed",
  "document_processed",
  "system"
]);
export const chatMessageRoleEnum = pgEnum("chat_message_role", ["system", "user", "assistant", "tool"]);
export const assessmentStatusEnum = pgEnum("assessment_status", ["draft", "published", "archived", "failed"]);
export const questionTypeEnum = pgEnum("question_type", [
  "multiple_choice",
  "multiple_choice_complex",
  "essay",
  "true_false",
  "matching",
  "fill_blank"
]);
export const questionDifficultyEnum = pgEnum("question_difficulty", ["mudah", "sedang", "sulit"]);
export const curriculumTypeEnum = pgEnum("curriculum_type", ["silabus", "rpp", "prota", "prosem", "kisi_kisi"]);
export const generatedDocumentTypeEnum = pgEnum("generated_document_type", [
  "question_paper",
  "answer_key",
  "answer_sheet",
  "scoring_rubric"
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("teacher"),
    isActive: boolean("is_active").notNull().default(true),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email)
  })
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: varchar("session_id", { length: 128 }).notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: varchar("ip_address", { length: 80 }),
    userAgent: text("user_agent"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    sessionIdIdx: index("sessions_session_id_idx").on(table.sessionId),
    tokenHashIdx: index("sessions_token_hash_idx").on(table.tokenHash),
    userIdIdx: index("sessions_user_id_idx").on(table.userId)
  })
);

export const rateLimits = pgTable(
  "rate_limits",
  {
    key: varchar("key", { length: 255 }).primaryKey(),
    count: integer("count").notNull().default(0),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    createdAtIdx: index("rate_limits_created_at_idx").on(table.createdAt),
    windowStartIdx: index("rate_limits_window_start_idx").on(table.windowStart)
  })
);

export const skills = pgTable(
  "skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 180 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull().unique(),
    description: text("description").notNull(),
    filePath: text("file_path").notNull(),
    version: varchar("version", { length: 32 }).notNull(),
    category: varchar("category", { length: 80 }).notNull(),
    tags: jsonb("tags").notNull().default(sql`'[]'::jsonb`),
    inputSchema: jsonb("input_schema").notNull().default(sql`'{}'::jsonb`),
    outputSchema: jsonb("output_schema").notNull().default(sql`'{}'::jsonb`),
    promptTemplate: text("prompt_template").notNull().default(""),
    preferredModel: text("preferred_model"),
    isActive: boolean("is_active").notNull().default(true),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    slugIdx: index("skills_slug_idx").on(table.slug),
    activeIdx: index("skills_active_idx").on(table.isActive)
  })
);

export const skillExecutions = pgTable(
  "skill_executions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "restrict" }),
    input: jsonb("input").notNull().default(sql`'{}'::jsonb`),
    output: jsonb("output"),
    status: executionStatusEnum("status").notNull().default("pending"),
    durationMs: integer("duration_ms"),
    error: text("error"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userIdIdx: index("skill_executions_user_id_idx").on(table.userId),
    skillIdIdx: index("skill_executions_skill_id_idx").on(table.skillId),
    statusIdx: index("skill_executions_status_idx").on(table.status)
  })
);

export const workflows = pgTable(
  "workflows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 180 }).notNull(),
    description: text("description").notNull().default(""),
    steps: jsonb("steps").notNull().default(sql`'[]'::jsonb`),
    status: workflowStatusEnum("status").notNull().default("draft"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userIdIdx: index("workflows_user_id_idx").on(table.userId),
    statusIdx: index("workflows_status_idx").on(table.status)
  })
);

export const workflowRuns = pgTable(
  "workflow_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    input: jsonb("input").notNull().default(sql`'{}'::jsonb`),
    output: jsonb("output"),
    status: executionStatusEnum("status").notNull().default("pending"),
    currentStep: integer("current_step").notNull().default(0),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    workflowIdIdx: index("workflow_runs_workflow_id_idx").on(table.workflowId),
    userIdIdx: index("workflow_runs_user_id_idx").on(table.userId),
    statusIdx: index("workflow_runs_status_idx").on(table.status)
  })
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    filePath: text("file_path").notNull(),
    fileUrl: text("file_url"),
    fileType: varchar("file_type", { length: 120 }).notNull(),
    fileSize: integer("file_size").notNull(),
    status: documentStatusEnum("status").notNull().default("pending"),
    chunkCount: integer("chunk_count").notNull().default(0),
    errorMessage: text("error_message"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userIdIdx: index("documents_user_id_idx").on(table.userId),
    statusIdx: index("documents_status_idx").on(table.status)
  })
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: auditActionEnum("action").notNull(),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    description: text("description").notNull(),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
    actionIdx: index("audit_logs_action_idx").on(table.action),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt)
  })
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull().default("system"),
    title: text("title").notNull(),
    message: text("message"),
    isRead: boolean("is_read").notNull().default(false),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userIdIdx: index("notifications_user_id_idx").on(table.userId),
    isReadIdx: index("notifications_is_read_idx").on(table.isRead),
    createdAtIdx: index("notifications_created_at_idx").on(table.createdAt)
  })
);

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    pageNumber: integer("page_number"),
    chunkIndex: integer("chunk_index").notNull(),
    tokenCount: integer("token_count").notNull(),
    embedding: vector("embedding"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    documentIdIdx: index("document_chunks_document_id_idx").on(table.documentId),
    embeddingIdx: index("document_chunks_embedding_ivfflat_idx").using(
      "ivfflat",
      sql`${table.embedding} vector_cosine_ops`
    )
  })
);

export const knowledgeBases = pgTable(
  "knowledge_bases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userIdIdx: index("knowledge_bases_user_id_idx").on(table.userId),
    createdAtIdx: index("knowledge_bases_created_at_idx").on(table.createdAt)
  })
);

export const knowledgeBaseDocuments = pgTable(
  "knowledge_base_documents",
  {
    knowledgeBaseId: uuid("knowledge_base_id")
      .notNull()
      .references(() => knowledgeBases.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
  },
  (table) => ({
    pk: primaryKey({ columns: [table.knowledgeBaseId, table.documentId], name: "knowledge_base_documents_pk" }),
    documentIdIdx: index("knowledge_base_documents_document_id_idx").on(table.documentId)
  })
);

export const aiProviderSettings = pgTable("ai_provider_settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  provider: varchar("provider", { length: 40 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Sesi Baru"),
    provider: varchar("provider", { length: 40 }).notNull(),
    model: text("model").notNull(),
    systemPrompt: text("system_prompt").notNull().default(""),
    knowledgeBaseId: uuid("knowledge_base_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userIdIdx: index("chat_sessions_user_id_idx").on(table.userId),
    knowledgeBaseIdIdx: index("chat_sessions_knowledge_base_id_idx").on(table.knowledgeBaseId),
    updatedAtIdx: index("chat_sessions_updated_at_idx").on(table.updatedAt)
  })
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    role: chatMessageRoleEnum("role").notNull(),
    content: text("content").notNull().default(""),
    toolCallId: text("tool_call_id"),
    toolName: text("tool_name"),
    toolCalls: jsonb("tool_calls"),
    toolInput: jsonb("tool_input"),
    toolOutput: jsonb("tool_output"),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    sessionIdIdx: index("chat_messages_session_id_idx").on(table.sessionId),
    createdAtIdx: index("chat_messages_created_at_idx").on(table.createdAt)
  })
);

export const tokenUsage = pgTable(
  "token_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => chatSessions.id, { onDelete: "set null" }),
    provider: varchar("provider", { length: 40 }).notNull(),
    model: text("model").notNull(),
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userIdIdx: index("token_usage_user_id_idx").on(table.userId),
    sessionIdIdx: index("token_usage_session_id_idx").on(table.sessionId),
    createdAtIdx: index("token_usage_created_at_idx").on(table.createdAt)
  })
);

export const assessments = pgTable(
  "assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    subject: text("subject"),
    gradeLevel: text("grade_level"),
    assessmentType: text("assessment_type"),
    knowledgeBaseId: uuid("knowledge_base_id").references(() => knowledgeBases.id, { onDelete: "set null" }),
    durationMinutes: integer("duration_minutes"),
    instructions: text("instructions"),
    config: jsonb("config").notNull().default(sql`'{}'::jsonb`),
    status: assessmentStatusEnum("status").notNull().default("draft"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userIdIdx: index("assessments_user_id_idx").on(table.userId),
    knowledgeBaseIdIdx: index("assessments_knowledge_base_id_idx").on(table.knowledgeBaseId),
    subjectIdx: index("assessments_subject_idx").on(table.subject),
    statusIdx: index("assessments_status_idx").on(table.status),
    createdAtIdx: index("assessments_created_at_idx").on(table.createdAt)
  })
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    questionNumber: integer("question_number").notNull(),
    type: questionTypeEnum("type").notNull(),
    content: text("content").notNull(),
    options: jsonb("options"),
    correctAnswer: text("correct_answer"),
    explanation: text("explanation"),
    difficulty: questionDifficultyEnum("difficulty"),
    cognitiveLevel: text("cognitive_level"),
    score: integer("score").notNull().default(1),
    tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
    source: text("source").notNull().default("ai_generated"),
    generatedBySkill: text("generated_by_skill"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    assessmentIdIdx: index("questions_assessment_id_idx").on(table.assessmentId),
    typeIdx: index("questions_type_idx").on(table.type),
    difficultyIdx: index("questions_difficulty_idx").on(table.difficulty),
    questionNumberIdx: index("questions_question_number_idx").on(table.assessmentId, table.questionNumber)
  })
);

export const questionBank = pgTable(
  "question_bank",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    subject: text("subject"),
    gradeLevel: text("grade_level"),
    tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
    usageCount: integer("usage_count").notNull().default(0),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userIdIdx: index("question_bank_user_id_idx").on(table.userId),
    questionIdIdx: index("question_bank_question_id_idx").on(table.questionId),
    subjectIdx: index("question_bank_subject_idx").on(table.subject),
    gradeLevelIdx: index("question_bank_grade_level_idx").on(table.gradeLevel)
  })
);

export const curricula = pgTable(
  "curricula",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: curriculumTypeEnum("type").notNull(),
    subject: text("subject"),
    gradeLevel: text("grade_level"),
    semester: text("semester"),
    academicYear: text("academic_year"),
    content: jsonb("content").notNull().default(sql`'{}'::jsonb`),
    status: text("status").notNull().default("draft"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userIdIdx: index("curricula_user_id_idx").on(table.userId),
    typeIdx: index("curricula_type_idx").on(table.type),
    subjectIdx: index("curricula_subject_idx").on(table.subject),
    createdAtIdx: index("curricula_created_at_idx").on(table.createdAt)
  })
);

export const generatedDocuments = pgTable(
  "generated_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assessmentId: uuid("assessment_id").references(() => assessments.id, { onDelete: "cascade" }),
    type: generatedDocumentTypeEnum("type").notNull(),
    title: text("title"),
    content: jsonb("content").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userIdIdx: index("generated_documents_user_id_idx").on(table.userId),
    assessmentIdIdx: index("generated_documents_assessment_id_idx").on(table.assessmentId),
    typeIdx: index("generated_documents_type_idx").on(table.type)
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  skillExecutions: many(skillExecutions),
  documents: many(documents),
  knowledgeBases: many(knowledgeBases),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
  chatSessions: many(chatSessions),
  tokenUsage: many(tokenUsage),
  assessments: many(assessments),
  questionBank: many(questionBank),
  curricula: many(curricula),
  generatedDocuments: many(generatedDocuments)
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] })
}));

export const skillsRelations = relations(skills, ({ many }) => ({
  executions: many(skillExecutions)
}));

export const skillExecutionsRelations = relations(skillExecutions, ({ one }) => ({
  user: one(users, { fields: [skillExecutions.userId], references: [users.id] }),
  skill: one(skills, { fields: [skillExecutions.skillId], references: [skills.id] })
}));

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  user: one(users, { fields: [workflows.userId], references: [users.id] }),
  runs: many(workflowRuns)
}));

export const workflowRunsRelations = relations(workflowRuns, ({ one }) => ({
  user: one(users, { fields: [workflowRuns.userId], references: [users.id] }),
  workflow: one(workflows, { fields: [workflowRuns.workflowId], references: [workflows.id] })
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  user: one(users, { fields: [documents.userId], references: [users.id] }),
  chunks: many(documentChunks),
  knowledgeBaseLinks: many(knowledgeBaseDocuments)
}));

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  document: one(documents, { fields: [documentChunks.documentId], references: [documents.id] })
}));

export const knowledgeBasesRelations = relations(knowledgeBases, ({ one, many }) => ({
  user: one(users, { fields: [knowledgeBases.userId], references: [users.id] }),
  documents: many(knowledgeBaseDocuments),
  assessments: many(assessments)
}));

export const knowledgeBaseDocumentsRelations = relations(knowledgeBaseDocuments, ({ one }) => ({
  knowledgeBase: one(knowledgeBases, { fields: [knowledgeBaseDocuments.knowledgeBaseId], references: [knowledgeBases.id] }),
  document: one(documents, { fields: [knowledgeBaseDocuments.documentId], references: [documents.id] })
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] })
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] })
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, { fields: [chatSessions.userId], references: [users.id] }),
  knowledgeBase: one(knowledgeBases, { fields: [chatSessions.knowledgeBaseId], references: [knowledgeBases.id] }),
  messages: many(chatMessages),
  usage: many(tokenUsage)
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, { fields: [chatMessages.sessionId], references: [chatSessions.id] })
}));

export const tokenUsageRelations = relations(tokenUsage, ({ one }) => ({
  user: one(users, { fields: [tokenUsage.userId], references: [users.id] }),
  session: one(chatSessions, { fields: [tokenUsage.sessionId], references: [chatSessions.id] })
}));

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  user: one(users, { fields: [assessments.userId], references: [users.id] }),
  knowledgeBase: one(knowledgeBases, { fields: [assessments.knowledgeBaseId], references: [knowledgeBases.id] }),
  questions: many(questions),
  generatedDocuments: many(generatedDocuments)
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  assessment: one(assessments, { fields: [questions.assessmentId], references: [assessments.id] }),
  bankEntries: many(questionBank)
}));

export const questionBankRelations = relations(questionBank, ({ one }) => ({
  user: one(users, { fields: [questionBank.userId], references: [users.id] }),
  question: one(questions, { fields: [questionBank.questionId], references: [questions.id] })
}));

export const curriculaRelations = relations(curricula, ({ one }) => ({
  user: one(users, { fields: [curricula.userId], references: [users.id] })
}));

export const generatedDocumentsRelations = relations(generatedDocuments, ({ one }) => ({
  user: one(users, { fields: [generatedDocuments.userId], references: [users.id] }),
  assessment: one(assessments, { fields: [generatedDocuments.assessmentId], references: [assessments.id] })
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Skill = typeof skills.$inferSelect;
export type NewSkill = typeof skills.$inferInsert;
export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;
export type WorkflowRun = typeof workflowRuns.$inferSelect;
export type NewWorkflowRun = typeof workflowRuns.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;
export type KnowledgeBase = typeof knowledgeBases.$inferSelect;
export type NewKnowledgeBase = typeof knowledgeBases.$inferInsert;
export type KnowledgeBaseDocument = typeof knowledgeBaseDocuments.$inferSelect;
export type NewKnowledgeBaseDocument = typeof knowledgeBaseDocuments.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type TokenUsage = typeof tokenUsage.$inferSelect;
export type NewTokenUsage = typeof tokenUsage.$inferInsert;
export type Assessment = typeof assessments.$inferSelect;
export type NewAssessment = typeof assessments.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type QuestionBankItem = typeof questionBank.$inferSelect;
export type NewQuestionBankItem = typeof questionBank.$inferInsert;
export type Curriculum = typeof curricula.$inferSelect;
export type NewCurriculum = typeof curricula.$inferInsert;
export type GeneratedDocument = typeof generatedDocuments.$inferSelect;
export type NewGeneratedDocument = typeof generatedDocuments.$inferInsert;
