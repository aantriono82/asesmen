CREATE EXTENSION IF NOT EXISTS vector;
CREATE TYPE "user_role" AS ENUM ('admin', 'teacher');
CREATE TYPE "execution_status" AS ENUM ('pending', 'running', 'completed', 'failed');
CREATE TYPE "document_status" AS ENUM ('uploaded', 'processing', 'processed', 'failed');

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(160) NOT NULL,
  "email" varchar(255) NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "role" "user_role" DEFAULT 'teacher' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "ip_address" varchar(80),
  "user_agent" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "skills" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(180) NOT NULL,
  "slug" varchar(180) NOT NULL UNIQUE,
  "description" text NOT NULL,
  "file_path" text NOT NULL,
  "version" varchar(32) NOT NULL,
  "category" varchar(80) NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "skill_executions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "skill_id" uuid NOT NULL REFERENCES "skills"("id") ON DELETE restrict,
  "input" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "output" jsonb,
  "status" "execution_status" DEFAULT 'pending' NOT NULL,
  "duration_ms" integer,
  "error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "title" varchar(255) NOT NULL,
  "file_path" text NOT NULL,
  "file_type" varchar(120) NOT NULL,
  "file_size" integer NOT NULL,
  "status" "document_status" DEFAULT 'uploaded' NOT NULL,
  "chunk_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "document_chunks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL REFERENCES "documents"("id") ON DELETE cascade,
  "content" text NOT NULL,
  "chunk_index" integer NOT NULL,
  "token_count" integer NOT NULL,
  "embedding" vector(1536),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "sessions_token_hash_idx" ON "sessions" ("token_hash");
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "skills_slug_idx" ON "skills" ("slug");
CREATE INDEX IF NOT EXISTS "skills_active_idx" ON "skills" ("is_active");
CREATE INDEX IF NOT EXISTS "skill_executions_user_id_idx" ON "skill_executions" ("user_id");
CREATE INDEX IF NOT EXISTS "skill_executions_skill_id_idx" ON "skill_executions" ("skill_id");
CREATE INDEX IF NOT EXISTS "skill_executions_status_idx" ON "skill_executions" ("status");
CREATE INDEX IF NOT EXISTS "documents_user_id_idx" ON "documents" ("user_id");
CREATE INDEX IF NOT EXISTS "documents_status_idx" ON "documents" ("status");
CREATE INDEX IF NOT EXISTS "document_chunks_document_id_idx" ON "document_chunks" ("document_id");
