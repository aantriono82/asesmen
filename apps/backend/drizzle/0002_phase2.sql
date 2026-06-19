ALTER TABLE "skills"
  ADD COLUMN IF NOT EXISTS "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "input_schema" jsonb DEFAULT '{}'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "output_schema" jsonb DEFAULT '{}'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "prompt_template" text DEFAULT '' NOT NULL;

DO $$
BEGIN
  CREATE TYPE "workflow_status" AS ENUM ('draft', 'active', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "workflows" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "name" varchar(180) NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "status" "workflow_status" DEFAULT 'draft' NOT NULL,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "workflow_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workflow_id" uuid NOT NULL REFERENCES "workflows"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "input" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "output" jsonb,
  "status" "execution_status" DEFAULT 'pending' NOT NULL,
  "current_step" integer DEFAULT 0 NOT NULL,
  "error" text,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "workflows_user_id_idx" ON "workflows" ("user_id");
CREATE INDEX IF NOT EXISTS "workflows_status_idx" ON "workflows" ("status");
CREATE INDEX IF NOT EXISTS "workflow_runs_workflow_id_idx" ON "workflow_runs" ("workflow_id");
CREATE INDEX IF NOT EXISTS "workflow_runs_user_id_idx" ON "workflow_runs" ("user_id");
CREATE INDEX IF NOT EXISTS "workflow_runs_status_idx" ON "workflow_runs" ("status");
