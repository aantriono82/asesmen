DO $$
BEGIN
  CREATE TYPE "chat_message_role" AS ENUM ('system', 'user', 'assistant', 'tool');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ai_provider_settings" (
  "key" varchar(80) PRIMARY KEY NOT NULL,
  "provider" varchar(40) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "chat_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "title" text DEFAULT 'Sesi Baru' NOT NULL,
  "provider" varchar(40) NOT NULL,
  "model" text NOT NULL,
  "system_prompt" text DEFAULT '' NOT NULL,
  "knowledge_base_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "chat_sessions"("id") ON DELETE cascade,
  "role" "chat_message_role" NOT NULL,
  "content" text DEFAULT '' NOT NULL,
  "tool_name" text,
  "tool_input" jsonb,
  "tool_output" jsonb,
  "tokens_in" integer,
  "tokens_out" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "token_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "session_id" uuid REFERENCES "chat_sessions"("id") ON DELETE set null,
  "provider" varchar(40) NOT NULL,
  "model" text NOT NULL,
  "tokens_in" integer DEFAULT 0 NOT NULL,
  "tokens_out" integer DEFAULT 0 NOT NULL,
  "cost_usd" numeric(10, 6) DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "chat_sessions_user_id_idx" ON "chat_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "chat_sessions_updated_at_idx" ON "chat_sessions" ("updated_at");
CREATE INDEX IF NOT EXISTS "chat_messages_session_id_idx" ON "chat_messages" ("session_id");
CREATE INDEX IF NOT EXISTS "chat_messages_created_at_idx" ON "chat_messages" ("created_at");
CREATE INDEX IF NOT EXISTS "token_usage_user_id_idx" ON "token_usage" ("user_id");
CREATE INDEX IF NOT EXISTS "token_usage_session_id_idx" ON "token_usage" ("session_id");
CREATE INDEX IF NOT EXISTS "token_usage_created_at_idx" ON "token_usage" ("created_at");

INSERT INTO "ai_provider_settings" ("key", "provider")
VALUES ('active', 'anthropic')
ON CONFLICT ("key") DO NOTHING;
